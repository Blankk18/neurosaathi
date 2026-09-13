// ============================================================================
// USE FACE RECOGNITION — live scanning hook shared by login & enrollment.
//
// Owns the camera stream, the throttled recognition loop, the state machine,
// alignment guidance, prototype liveness, consecutive-match gating and all
// stream cleanup. The UI renders only what this hook exposes.
//
// IMPORTANT: authentication is never faked. A login only occurs after a real
// descriptor comparison that yields REQUIRED_CONSECUTIVE_MATCHES consecutive
// matching recycle cycles — never from a timer or a hardcoded callback.
//
// Loop architecture: requestAnimationFrame + timestamp throttle (~200 ms) so
// we never run inference on every browser frame nor allow overlapping calls
// (isProcessingRef guards it). Falls back gracefully if the tab is throttled.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import {
  RECOGNITION_INTERVAL_MS,
  REQUIRED_CONSECUTIVE_MATCHES,
  MAX_RECOGNITION_ATTEMPTS,
  LIVENESS_ENABLED,
  LIVENESS_SAMPLES,
  CAMERA_CONSTRAINTS,
  DETECTOR_INPUT_SIZE,
  DETECTOR_SCORE_THRESHOLD,
  DETECTOR_SCORE_THRESHOLD_RELAXED,
  DETECTOR_RELAX_AFTER_FRAMES,
} from './faceRecognition.config';
import {
  initFaceModels,
  openCameraStream,
  stopStream,
  releaseVideo,
  analyzeFrame,
  alignmentFor,
  faceBoxFor,
  isWellAligned,
  matchesProfile,
  movementDetected,
} from './faceRecognition.service';
import type { FaceAlignment, FaceBox, FaceLoginState, FaceProfile, FaceSample, FaceStatusInfo } from './types';

export interface FaceHookOptions {
  /** Enrolled profile to match against — null during enrollment. */
  profile: FaceProfile | null;
  /** When true, collect samples instead of matching against a profile. */
  enroll?: boolean;
  onSample?: (sample: FaceSample) => void;
  /** Called when 3 consecutive matches are verified. Receives the matched descriptor. */
  onMatch?: (descriptor?: number[]) => void;
}

export interface FaceHookResult {
  state: FaceLoginState;
  status: FaceStatusInfo;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  live: boolean;
  alignment: FaceAlignment | null;
  faceBox: FaceBox | null;
  /** Consecutive matches so far (0..REQUIRED_CONSECUTIVE_MATCHES). */
  matchProgress: number;
  attemptCount: number;
  /** 0..1 confidence of the latest matching cycle. */
  confidence: number;
  /** Last raw distance (for DEV debug). */
  lastDistance: number | null;
  /** Last detection score (for DEV debug). */
  lastScore: number | null;
  /** Number of faces in last frame (for DEV debug). */
  lastFaceCount: number;
  cancel: () => void;
  start: () => void;
  modelsReady: boolean;
}

function toSample(desc: Float32Array, imageBlob?: Blob): FaceSample {
  return { descriptor: Array.from(desc), capturedAt: Date.now(), imageBlob };
}

/**
 * Capture the current video frame as a JPEG Blob.
 * Called at the exact moment an enrollment sample descriptor is accepted,
 * so the image corresponds 1-to-1 with each face descriptor.
 * Returns undefined on any failure — callers treat missing blobs as non-fatal
 * but the enrollment UI will warn if blobs cannot be obtained.
 */
async function captureFrameAsBlob(
  video: HTMLVideoElement,
  quality = 0.85,
): Promise<Blob | undefined> {
  try {
    // Video must be in a state where frame data is available.
    // readyState < 2 means no frame yet (HAVE_NOTHING or HAVE_METADATA only).
    if (video.readyState < 2) {
      // eslint-disable-next-line no-console
      console.warn(`[captureFrameAsBlob] readyState=${video.readyState} < 2 — no frame data available yet`);
      return undefined;
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      // eslint-disable-next-line no-console
      console.warn('[captureFrameAsBlob] videoWidth or videoHeight is 0 — cannot capture frame');
      return undefined;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // eslint-disable-next-line no-console
      console.warn('[captureFrameAsBlob] Could not get 2d canvas context');
      return undefined;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | undefined>((resolve) => {
      canvas.toBlob((b) => resolve(b ?? undefined), 'image/jpeg', quality);
    });
    if (!blob || blob.size === 0) {
      // eslint-disable-next-line no-console
      console.warn('[captureFrameAsBlob] canvas.toBlob returned null or zero-byte blob');
      return undefined;
    }
    // eslint-disable-next-line no-console
    console.info(`[captureFrameAsBlob] Captured blob — size=${blob.size}, type=${blob.type}`);
    return blob;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[captureFrameAsBlob] Exception during frame capture:', err);
    return undefined;
  }
}

export function useFaceRecognition(opts: FaceHookOptions): FaceHookResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<faceapi.TinyFaceDetectorOptions | null>(null);
  const relaxedDetectorRef = useRef<faceapi.TinyFaceDetectorOptions | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const isProcessingRef = useRef(false);
  const runningRef = useRef(false);
  const noFaceFramesRef = useRef(0);

  const [modelsReady, setModelsReady] = useState(false);
  const [live, setLive] = useState(false);
  const [alignment, setAlignment] = useState<FaceAlignment | null>(null);
  const [faceBox, setFaceBox] = useState<FaceBox | null>(null);
  const [matchProgress, setMatchProgress] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [lastDistance, setLastDistance] = useState<number | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastFaceCount, setLastFaceCount] = useState(0);
  const [state, setState] = useState<FaceLoginState>('idle');
  const [status, setStatus] = useState<FaceStatusInfo>({ state: 'idle', key: 'face.cancel' });

  const optsRef = useRef(opts);
  optsRef.current = opts;
  const profileRef = useRef(opts.profile);
  useEffect(() => {
    profileRef.current = opts.profile;
  }, [opts.profile]);

  const consecutiveRef = useRef(0);
  const attemptsRef = useRef(0);
  const livenessRef = useRef<{ prev: FaceAlignment | null; count: number }>({ prev: null, count: 0 });

  const setSnap = useCallback(
    (s: FaceLoginState, key: string, params?: Record<string, string | number>, extra?: Partial<FaceStatusInfo>) => {
      setState(s);
      setStatus({ state: s, key, params, ...extra });
    },
    [],
  );

  // --------------------------------------------------------------------------
  // Cleanup — MUST always run (auth success, cancel, error, unmount).
  // --------------------------------------------------------------------------
  const cleanup = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    runningRef.current = false;
    isProcessingRef.current = false;
    consecutiveRef.current = 0;
    attemptsRef.current = 0;
    noFaceFramesRef.current = 0;
    livenessRef.current = { prev: null, count: 0 };
    setMatchProgress(0);
    setFaceBox(null);
    stopStream(streamRef.current);
    releaseVideo(videoRef.current);
    streamRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  // --------------------------------------------------------------------------
  // Single recognition tick (throttled via rAF, guarded by isProcessingRef).
  // --------------------------------------------------------------------------
  const tick = useCallback(async () => {
    if (isProcessingRef.current) return;
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !runningRef.current || !detector) return;
    // Video must have real dimensions — otherwise face-api silently returns [].
    if (video.videoWidth === 0 || video.readyState < 2) return;

    isProcessingRef.current = true;
    try {
      // Dynamically relax threshold after repeated no-face frames.
      const useRelaxed = noFaceFramesRef.current >= DETECTOR_RELAX_AFTER_FRAMES;
      const activeDetector = useRelaxed && relaxedDetectorRef.current ? relaxedDetectorRef.current : detector;

      const faces = (await analyzeFrame(video, activeDetector)) ?? [];
      if (!runningRef.current) return;

      const count = faces.length;
      setLastFaceCount(count);

      if (count === 0) {
        noFaceFramesRef.current += 1;
        setSnap('detecting', 'face.looking');
        setAlignment(null);
        setFaceBox(null);
        setLive(false);
        setLastScore(null);
        consecutiveRef.current = 0;
        livenessRef.current = { prev: null, count: 0 };
        return;
      }

      // Any detection resets the no-face counter.
      noFaceFramesRef.current = 0;

      if (count > 1) {
        setSnap('faceDetected', 'face.multiple');
        // Still show the first box so the user understands "extra person".
        const firstScore = faces[0]?.detection.score ?? null;
        setLastScore(firstScore);
        setAlignment(null);
        setFaceBox(null);
        consecutiveRef.current = 0;
        livenessRef.current = { prev: null, count: 0 };
        return;
      }

      setLive(true);
      const face = faces[0];
      setLastScore(face.detection.score);
      const box = faceBoxFor(face);
      setFaceBox(box);
      const align = alignmentFor(face, video.videoWidth);
      setAlignment(align);

      // Guidance for extreme misalignment only — not every small offset.
      // "Too far / too close" is based on size; centering is lenient.
      const tooFar = align.size < 0.08;
      const tooClose = align.size > 0.6;
      if (tooFar) {
        setSnap('guiding', 'face.tooFar');
        consecutiveRef.current = 0;
        return;
      }
      if (tooClose) {
        setSnap('guiding', 'face.tooClose');
        consecutiveRef.current = 0;
        return;
      }
      // Only block on severe off-centre — isWellAligned is already lenient (0.45 x, 0.5 y).
      // This hint block only triggers for extreme misalignment beyond isWellAligned.
      if (!isWellAligned(align)) {
        const hint =
          align.x < -0.5 ? 'moveRight' : align.x > 0.5 ? 'moveLeft' : align.y < -0.5 ? 'moveDown' : null;
        if (hint) {
          setSnap('guiding', 'face.move.into', undefined, { hint });
          // Don't reset consecutive on mere guidance — only reset if face truly lost
          // (handled above when count === 0 or count > 1)
          return;
        }
      }

      // ------------- enrollment path: collect a valid sample -------------
      if (optsRef.current.enroll) {
        // Enrollment still benefits from a little movement variety.
        const lv = livenessRef.current;
        // Accept the first sample without movement, then require movement.
        const needMovement = attemptsRef.current > 0;
        if (needMovement && !movementDetected(align, lv.prev)) {
          setSnap('faceDetected', 'face.hold');
          lv.prev = align;
          return;
        }

        // Additional enrollment validation: reject low quality, face outside frame, low detection score
        // Quality threshold: alignmentFor returns 0..1, reject below 0.5
        if (align.quality < 0.5) {
          setSnap('faceDetected', 'face.lowQuality');
          lv.prev = align;
          return;
        }

        // Face box must be fully inside the video frame (not partially outside)
        // video.videoWidth / video.videoHeight are the frame dimensions
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (box.x < 0 || box.y < 0 || box.x + box.width > vw || box.y + box.height > vh) {
          setSnap('faceDetected', 'face.offFrame');
          lv.prev = align;
          return;
        }

        // Detection score must meet the primary threshold (not relaxed)
        const detectionScore = face.detection.score ?? 0;
        if (detectionScore < DETECTOR_SCORE_THRESHOLD) {
          setSnap('faceDetected', 'face.lowScore');
          lv.prev = align;
          return;
        }

        lv.prev = align;
        attemptsRef.current += 1;
        setAttemptCount(attemptsRef.current);
        setSnap('faceDetected', 'face.capture');

        // Capture the video frame as a Blob at this exact moment —
        // the same frame that produced this descriptor. Non-fatal if capture
        // fails (imageBlob will be undefined; FaceEnrollment checks completeness).
        const imageBlob = await captureFrameAsBlob(video);
        optsRef.current.onSample?.(toSample(face.descriptor as Float32Array, imageBlob));
        return;
      }

      // ------------- matching path -------------
      const prof = profileRef.current;
      if (!prof?.enrolled) {
        setSnap('failure', 'face.noProfile');
        return;
      }

      // Prototype liveness: gentle movement — non-blocking once satisfied.
      // Once we've seen enough movement, we never block matching again.
      if (LIVENESS_ENABLED) {
        const lv = livenessRef.current;
        const livenessSatisfied = lv.count >= LIVENESS_SAMPLES;
        if (!livenessSatisfied) {
          if (movementDetected(align, lv.prev)) lv.count += 1;
          lv.prev = align;
          // Only block on the first few frames before we've seen movement.
          // After 2 attempts without liveness, fall through to matching anyway
          // so a perfectly still user isn't permanently stuck.
          if (lv.count < LIVENESS_SAMPLES && attemptsRef.current < 2) {
            setSnap('liveness', 'face.liveness.turn', undefined, { hint: 'moveGently' });
            return;
          }
        }
        // Liveness satisfied or we've waited long enough — proceed to matching.
      }

      setSnap('matching', 'face.verify');
      const result = matchesProfile(face.descriptor as Float32Array, prof);
      setConfidence(result.confidence);
      setLastDistance(result.distance);
      attemptsRef.current += 1;
      setAttemptCount(attemptsRef.current);

      if (result.ok) {
        const next = consecutiveRef.current + 1;
        consecutiveRef.current = next;
        setMatchProgress(next);
        if (next >= REQUIRED_CONSECUTIVE_MATCHES) {
          runningRef.current = false;
          setSnap('success', 'face.recognized');
          // Pass the descriptor to onMatch so the component can use it for cross-device matching
          const descriptor = Array.from(face.descriptor as Float32Array);
          window.setTimeout(() => optsRef.current.onMatch?.(descriptor), 300);
          cleanup();
          return;
        }
        setSnap('detecting', 'face.keep');
      } else {
        consecutiveRef.current = 0;
        setMatchProgress(0);
        if (attemptsRef.current >= MAX_RECOGNITION_ATTEMPTS) {
          setSnap('failure', 'face.tooMany');
          runningRef.current = false;
          cleanup();
          return;
        }
        setSnap('failure', 'face.notRecognized', undefined, { hint: 'lookDirect' });
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [cleanup, setSnap]);

  // rAF loop — timestamp-throttled
  // Guard: check runningRef BEFORE reading lastTickRef to avoid a stale
  // performance measurement that triggers face-api's internal startTime
  // error when cancel() fires while a tick is mid-flight.
  const loop = useCallback(
    (now: number) => {
      if (!runningRef.current) return;
      rafRef.current = requestAnimationFrame(loop);
      // Safety: if lastTickRef is somehow NaN/Infinity, reset it
      if (!isFinite(lastTickRef.current)) {
        lastTickRef.current = now;
      }
      if (now - lastTickRef.current < RECOGNITION_INTERVAL_MS) return;
      lastTickRef.current = now;
      void tick();
    },
    [tick],
  );

  const handleCameraError = useCallback(
    (err: unknown) => {
      const name = (err as DOMException | null)?.name ?? 'Unknown';
      let key = 'face.camera.unavailable';
      if (name === 'NotAllowedError') key = 'face.camera.denied';
      else if (name === 'NotFoundError') key = 'face.camera.none';
      else if (name === 'NotReadableError') key = 'face.camera.busy';
      else if (name === 'OverconstrainedError') key = 'face.camera.constraint';
      else if (name === 'SecurityError') key = 'face.camera.security';
      setSnap('error', key);
      cleanup();
    },
    [cleanup, setSnap],
  );

  // --------------------------------------------------------------------------
  // Start: load models → request camera → begin rAF scanning.
  // --------------------------------------------------------------------------
  const start = useCallback(() => {
    if (runningRef.current) return;
    attemptsRef.current = 0;
    noFaceFramesRef.current = 0;
    consecutiveRef.current = 0;
    setMatchProgress(0);
    setAttemptCount(0);
    setConfidence(0);
    setLastDistance(null);
    setLastScore(null);

    setSnap('loadingModels', 'face.prepare');

    const go = async () => {
      try {
        await initFaceModels();
        setModelsReady(true);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[face] model init failed:', err);
        setSnap('error', 'face.unavailable');
        return;
      }
      setSnap('requestingCamera', 'face.allow');
      let stream: MediaStream | null = null;
      try {
        stream = await openCameraStream(CAMERA_CONSTRAINTS);
      } catch (err) {
        handleCameraError(err);
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          /* autoplay may be blocked; loop still tries frames */
        }
        detectorRef.current = new faceapi.TinyFaceDetectorOptions({
          inputSize: DETECTOR_INPUT_SIZE,
          scoreThreshold: DETECTOR_SCORE_THRESHOLD,
        });
        relaxedDetectorRef.current = new faceapi.TinyFaceDetectorOptions({
          inputSize: DETECTOR_INPUT_SIZE,
          scoreThreshold: DETECTOR_SCORE_THRESHOLD_RELAXED,
        });
      }
      setSnap('cameraReady', 'face.looking');
      runningRef.current = true;
      lastTickRef.current = performance.now();
      rafRef.current = requestAnimationFrame(loop);
    };
    void go();
  }, [handleCameraError, loop, setSnap]);

  const cancel = useCallback(() => {
    cleanup();
    setSnap('idle', 'face.cancel');
    setAlignment(null);
    setFaceBox(null);
    setLive(false);
  }, [cleanup, setSnap]);

  return {
    state,
    status,
    videoRef,
    live,
    alignment,
    faceBox,
    matchProgress,
    attemptCount,
    confidence,
    lastDistance,
    lastScore,
    lastFaceCount,
    cancel,
    start,
    modelsReady,
  };
}

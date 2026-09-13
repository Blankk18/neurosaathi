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
  ENROLLMENT_SAMPLES,
  ENROLLMENT_STABILITY_MS,
  ENROLLMENT_COOLDOWN_MS,
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
  /** Current number of enrolled samples already collected by parent. */
  sampleCount?: number;
  /** When true, perform global face identification without a known profile. */
  globalMatch?: boolean;
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
  /** Enrollment countdown timer (3, 2, 1, or null). */
  countdown: number | null;
  /** Whether face is currently stable and ready for capture. */
  isStable: boolean;
  /** Whether a frame capture is currently executing. */
  isCapturing: boolean;
  /** Whether cooldown between captures is active. */
  cooldownActive: boolean;
}

/** Convert a Base64 data URL to a binary Blob synchronously. */
function dataURLtoBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Capture the current video frame as a JPEG Blob.
 * Uses synchronous canvas toDataURL + dataURLtoBlob for zero-deadlock execution,
 * with a timed toBlob fallback.
 */
async function captureFrameAsBlob(
  video: HTMLVideoElement,
  quality = 0.85,
): Promise<Blob | undefined> {
  try {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      // eslint-disable-next-line no-console
      console.warn('[FaceEnrollment] videoWidth or videoHeight is 0 — cannot capture frame');
      return undefined;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // eslint-disable-next-line no-console
      console.warn('[FaceEnrollment] Could not get 2d canvas context');
      return undefined;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Primary: synchronous toDataURL -> dataURLtoBlob (instant, cannot hang/deadlock)
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl && dataUrl.length > 50) {
        const blob = dataURLtoBlob(dataUrl);
        if (blob && blob.size > 0) {
          // eslint-disable-next-line no-console
          console.info(`[FaceEnrollment] Frame captured (${blob.size} bytes)`);
          return blob;
        }
      }
    } catch (dataErr) {
      // eslint-disable-next-line no-console
      console.warn('[FaceEnrollment] toDataURL error, falling back to toBlob:', dataErr);
    }

    // Fallback: toBlob with strict 1500ms timeout
    return await new Promise<Blob | undefined>((resolve) => {
      const timeout = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.warn('[FaceEnrollment] canvas.toBlob timed out after 1500ms');
        resolve(undefined);
      }, 1500);

      canvas.toBlob((b) => {
        clearTimeout(timeout);
        resolve(b ?? undefined);
      }, 'image/jpeg', quality);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[FaceEnrollment] Exception during frame capture:', err);
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

  // Enrollment stability & timing state
  type EnrollmentPhase = 'waiting' | 'stabilizing' | 'countdown' | 'capturing' | 'cooldown' | 'complete';
  const enrollmentPhaseRef = useRef<EnrollmentPhase>('waiting');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStable, setIsStable] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);

  const stabilityStartRef = useRef<number | null>(null);
  const countdownStartRef = useRef<number | null>(null);
  const lastCaptureTimeRef = useRef<number>(0);
  const captureInProgressRef = useRef(false);
  const lastCountdownNumberRef = useRef<number | null>(null);

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
    enrollmentPhaseRef.current = 'waiting';
    stabilityStartRef.current = null;
    countdownStartRef.current = null;
    lastCaptureTimeRef.current = 0;
    captureInProgressRef.current = false;
    lastCountdownNumberRef.current = null;
    setCountdown(null);
    setIsStable(false);
    setIsCapturing(false);
    setCooldownActive(false);
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
        // If face is lost during stabilizing or countdown, gracefully reset to waiting
        if (optsRef.current.enroll && enrollmentPhaseRef.current !== 'cooldown' && enrollmentPhaseRef.current !== 'capturing') {
          enrollmentPhaseRef.current = 'waiting';
          stabilityStartRef.current = null;
          countdownStartRef.current = null;
          lastCountdownNumberRef.current = null;
          setCountdown(null);
          setIsStable(false);
        }
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
        if (optsRef.current.enroll && enrollmentPhaseRef.current !== 'cooldown' && enrollmentPhaseRef.current !== 'capturing') {
          enrollmentPhaseRef.current = 'waiting';
          stabilityStartRef.current = null;
          countdownStartRef.current = null;
          lastCountdownNumberRef.current = null;
          setCountdown(null);
          setIsStable(false);
        }
        return;
      }

      setLive(true);
      const face = faces[0];
      setLastScore(face.detection.score);
      const box = faceBoxFor(face);
      setFaceBox(box);
      const align = alignmentFor(face, video.videoWidth);
      setAlignment(align);

      // Guidance for extreme misalignment only (login mode primarily)
      if (!optsRef.current.enroll) {
        const tooFar = align.size < 0.10;
        const tooClose = align.size > 0.55;
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
        if (!isWellAligned(align)) {
          const hint =
            align.x < -0.5 ? 'moveRight' : align.x > 0.5 ? 'moveLeft' : align.y < -0.5 ? 'moveDown' : null;
          if (hint) {
            setSnap('guiding', 'face.move.into', undefined, { hint });
            return;
          }
        }
      }

      // ------------- enrollment path: automatic 5-sample capture -------------
      if (optsRef.current.enroll) {
        const now = performance.now();
        const currentCount = optsRef.current.sampleCount ?? attemptsRef.current;

        // Check if enrollment is already complete
        if (currentCount >= ENROLLMENT_SAMPLES) {
          enrollmentPhaseRef.current = 'complete';
          setCountdown(null);
          setIsStable(true);
          setIsCapturing(false);
          setCooldownActive(false);
          setSnap('faceDetected', 'face.recognized');
          return;
        }

        // 1. COOLDOWN PHASE (1500ms between captures)
        if (enrollmentPhaseRef.current === 'cooldown') {
          const elapsedCooldown = now - lastCaptureTimeRef.current;
          if (elapsedCooldown < ENROLLMENT_COOLDOWN_MS) {
            setCooldownActive(true);
            setCountdown(null);
            setIsStable(false);
            setSnap('faceDetected', 'face.hold');
            return;
          }
          // Cooldown complete!
          // eslint-disable-next-line no-console
          console.info(`[FaceEnrollment] Starting sample ${currentCount + 1}`);
          setCooldownActive(false);
          enrollmentPhaseRef.current = 'waiting';
          stabilityStartRef.current = null;
          countdownStartRef.current = null;
          lastCountdownNumberRef.current = null;
          setCountdown(null);
          setIsStable(false);
        }

        // 2. CAPTURING PHASE: One-shot in flight
        if (enrollmentPhaseRef.current === 'capturing' || captureInProgressRef.current) {
          return;
        }

        // 3. VALIDATE FACE PRESENCE FOR ENROLLMENT
        // Allow natural poses, slight head turns, and reasonable webcam lighting
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const severeOffFrame = box.x < -40 || box.y < -40 || box.x + box.width > vw + 40 || box.y + box.height > vh + 40;
        const tooFar = align.size < 0.08;
        const tooClose = align.size > 0.65;
        const scoreLow = (face.detection.score ?? 0) < 0.20;

        if (severeOffFrame || tooFar || tooClose || scoreLow) {
          if (enrollmentPhaseRef.current !== 'waiting') {
            // eslint-disable-next-line no-console
            console.info('[FaceEnrollment] Face lost position — resetting to waiting');
          }
          enrollmentPhaseRef.current = 'waiting';
          stabilityStartRef.current = null;
          countdownStartRef.current = null;
          lastCountdownNumberRef.current = null;
          setCountdown(null);
          setIsStable(false);
          setSnap('detecting', tooFar ? 'face.tooFar' : tooClose ? 'face.tooClose' : 'face.looking');
          return;
        }

        // 4. WAITING -> STABILIZING
        if (enrollmentPhaseRef.current === 'waiting') {
          enrollmentPhaseRef.current = 'stabilizing';
          stabilityStartRef.current = now;
          setIsStable(false);
          setCountdown(null);
          setSnap('faceDetected', 'face.hold');
          // eslint-disable-next-line no-console
          console.info(`[FaceEnrollment] Stable face detected`);
          return;
        }

        // 5. STABILIZING (ENROLLMENT_STABILITY_MS = 800ms)
        if (enrollmentPhaseRef.current === 'stabilizing') {
          const elapsedStable = now - (stabilityStartRef.current ?? now);
          if (elapsedStable < ENROLLMENT_STABILITY_MS) {
            setIsStable(false);
            setCountdown(null);
            setSnap('faceDetected', 'face.hold');
            return;
          }
          // Stability reached -> Start Countdown
          enrollmentPhaseRef.current = 'countdown';
          countdownStartRef.current = now;
          lastCountdownNumberRef.current = 3;
          setIsStable(true);
          setCountdown(3);
          setSnap('faceDetected', 'face.hold');
          // eslint-disable-next-line no-console
          console.info(`[FaceEnrollment] Countdown started for sample ${currentCount + 1}`);
          // eslint-disable-next-line no-console
          console.info('[FaceEnrollment] Countdown: 3');
          return;
        }

        // 6. COUNTDOWN (3 -> 2 -> 1 -> Capture)
        if (enrollmentPhaseRef.current === 'countdown') {
          const elapsedCountdown = now - (countdownStartRef.current ?? now);
          let remainingSeconds: number;

          if (elapsedCountdown < 1000) {
            remainingSeconds = 3;
          } else if (elapsedCountdown < 2000) {
            remainingSeconds = 2;
          } else if (elapsedCountdown < 3000) {
            remainingSeconds = 1;
          } else {
            remainingSeconds = 0;
          }

          if (remainingSeconds > 0) {
            if (lastCountdownNumberRef.current !== remainingSeconds) {
              lastCountdownNumberRef.current = remainingSeconds;
              // eslint-disable-next-line no-console
              console.info(`[FaceEnrollment] Countdown: ${remainingSeconds}`);
            }
            setCountdown(remainingSeconds);
            setIsStable(true);
            setSnap('faceDetected', 'face.hold');
            return;
          }

          // COUNTDOWN REACHED 0! TRIGGER CAPTURE
          // eslint-disable-next-line no-console
          console.info(`[FaceEnrollment] Starting capture for sample ${currentCount + 1}`);
          enrollmentPhaseRef.current = 'capturing';
          captureInProgressRef.current = true;
          setCountdown(null);
          setIsCapturing(true);
          setSnap('faceDetected', 'face.capture');

          const sampleIndexToCapture = currentCount + 1;
          const capturedDesc = Array.from(face.descriptor as Float32Array);

          // Asynchronous capture task with safety timeout
          void (async () => {
            const safetyTimer = window.setTimeout(() => {
              if (captureInProgressRef.current) {
                // eslint-disable-next-line no-console
                console.warn('[FaceEnrollment] Capture safety timeout (4000ms) fired — resetting state');
                captureInProgressRef.current = false;
                setIsCapturing(false);
                enrollmentPhaseRef.current = 'waiting';
                stabilityStartRef.current = null;
                countdownStartRef.current = null;
                lastCountdownNumberRef.current = null;
                setCountdown(null);
              }
            }, 4000);

            try {
              if (capturedDesc.length !== 128) {
                throw new Error(`Invalid descriptor length: ${capturedDesc.length}`);
              }
              // eslint-disable-next-line no-console
              console.info('[FaceEnrollment] Descriptor generated: 128');

              const imageBlob = await captureFrameAsBlob(video);
              if (!imageBlob || imageBlob.size === 0) {
                throw new Error('Frame capture returned empty blob');
              }
              // eslint-disable-next-line no-console
              console.info('[FaceEnrollment] Frame captured');

              attemptsRef.current += 1;
              setAttemptCount(attemptsRef.current);

              const sample: FaceSample = {
                descriptor: capturedDesc,
                capturedAt: Date.now(),
                imageBlob,
              };

              // eslint-disable-next-line no-console
              console.info(`[FaceEnrollment] Sample ${sampleIndexToCapture} saved`);
              optsRef.current.onSample?.(sample);

              // Cooldown transition
              lastCaptureTimeRef.current = performance.now();
              enrollmentPhaseRef.current = 'cooldown';
              setCooldownActive(true);
              setIsCapturing(false);
              stabilityStartRef.current = null;
              countdownStartRef.current = null;
              lastCountdownNumberRef.current = null;
              // eslint-disable-next-line no-console
              console.info('[FaceEnrollment] Starting cooldown');
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error(`[FaceEnrollment] Capture failed:`, err);
              enrollmentPhaseRef.current = 'waiting';
              stabilityStartRef.current = null;
              countdownStartRef.current = null;
              lastCountdownNumberRef.current = null;
              setCountdown(null);
              setIsCapturing(false);
            } finally {
              window.clearTimeout(safetyTimer);
              captureInProgressRef.current = false;
            }
          })();

          return;
        }

        return;
      }

      // ------------- matching path (both local profile and global matching) ----------
      const prof = profileRef.current;
      const isGlobalMatching = optsRef.current.globalMatch === true;

      // If we have a profile, use local matching; if globalMatch mode, skip profile check
      if (!isGlobalMatching && !prof?.enrolled) {
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

      // Local profile matching
      if (!isGlobalMatching) {
        setSnap('matching', 'face.verify');
        const result = matchesProfile(face.descriptor as Float32Array, prof!);
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
            return;
          }
        }
      } else {
        // Global matching mode — just validate face quality and generate descriptor
        setSnap('matching', 'face.verify');
        attemptsRef.current += 1;
        setAttemptCount(attemptsRef.current);

        // For global matching, we just need valid consecutive face detections
        const next = consecutiveRef.current + 1;
        consecutiveRef.current = next;
        setMatchProgress(next);

        if (next >= REQUIRED_CONSECUTIVE_MATCHES) {
          runningRef.current = false;
          setSnap('verifying', 'face.verify');
          // eslint-disable-next-line no-console
          console.info('[FaceLogin] Descriptor generated: 128 dimensions');
          // Pass the descriptor to onMatch for global face matching
          const descriptor = Array.from(face.descriptor as Float32Array);
          window.setTimeout(() => optsRef.current.onMatch?.(descriptor), 100);
          cleanup();
          return;
        }
        setSnap('detecting', 'face.keep');

        // Max attempts limit for global matching too
        if (attemptsRef.current >= MAX_RECOGNITION_ATTEMPTS) {
          setSnap('failure', 'face.tooMany');
          return;
        }
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
    setCountdown(null);
    setIsStable(false);
    setIsCapturing(false);
    setCooldownActive(false);
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
    countdown,
    isStable,
    isCapturing,
    cooldownActive,
  };
}

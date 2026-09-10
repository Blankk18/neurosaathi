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
} from './faceRecognition.config';
import {
  initFaceModels,
  openCameraStream,
  stopStream,
  releaseVideo,
  analyzeFrame,
  alignmentFor,
  isWellAligned,
  matchesProfile,
  movementDetected,
} from './faceRecognition.service';
import type {
  FaceAlignment,
  FaceLoginState,
  FaceProfile,
  FaceSample,
  FaceStatusInfo,
} from './types';

export interface FaceHookOptions {
  /** Enrolled profile to match against — null during enrollment. */
  profile: FaceProfile | null;
  /** When true, collect samples instead of matching against a profile. */
  enroll?: boolean;
  onSample?: (sample: FaceSample) => void;
  onMatch?: () => void;
}

export interface FaceHookResult {
  state: FaceLoginState;
  status: FaceStatusInfo;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  /** true while a face is present at all. */
  live: boolean;
  /** raw alignment for the face guide overlay (null when no face). */
  alignment: FaceAlignment | null;
  /** consecutive matches so far (0..REQUIRED_CONSECUTIVE_MATCHES). */
  matchProgress: number;
  /** frames processed so far this attempt. */
  attemptCount: number;
  /** 0..1 confidence of the latest matching cycle. */
  confidence: number;
  cancel: () => void;
  /** Load models (if needed), then open the camera and start scanning. */
  start: () => void;
  modelsReady: boolean;
}

function toSample(desc: Float32Array): FaceSample {
  return { descriptor: Array.from(desc), capturedAt: Date.now() };
}

export function useFaceRecognition(opts: FaceHookOptions): FaceHookResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<faceapi.TinyFaceDetectorOptions | null>(null);
  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [live, setLive] = useState(false);
  const [alignment, setAlignment] = useState<FaceAlignment | null>(null);
  const [matchProgress, setMatchProgress] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [state, setState] = useState<FaceLoginState>('idle');
  const [status, setStatus] = useState<FaceStatusInfo>({ state: 'idle', key: 'face.cancel' });

  // refs to avoid stale closures inside the interval callback
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
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    runningRef.current = false;
    consecutiveRef.current = 0;
    attemptsRef.current = 0;
    livenessRef.current = { prev: null, count: 0 };
    setMatchProgress(0);
    stopStream(streamRef.current);
    releaseVideo(videoRef.current);
    streamRef.current = null;
  }, []);

  // stop on unmount — no camera running in the background
  useEffect(() => cleanup, [cleanup]);

  // --------------------------------------------------------------------------
  // Recognition loop (throttled: not every browser frame).
  // --------------------------------------------------------------------------
  const tick = useCallback(async () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !runningRef.current || !detector) return;

    const faces = (await analyzeFrame(video, detector)) ?? [];
    if (!runningRef.current) return; // cancel/cleanup could have happened mid-await

    const count = faces.length;

    if (count === 0) {
      setSnap('detecting', 'face.looking');
      setAlignment(null);
      setLive(false);
      consecutiveRef.current = 0;
      livenessRef.current = { prev: null, count: 0 };
      return;
    }

    if (count > 1) {
      // multiple faces → STOP authentication
      setSnap('faceDetected', 'face.multiple');
      setAlignment(null);
      consecutiveRef.current = 0;
      livenessRef.current = { prev: null, count: 0 };
      return;
    }

    setLive(true);
    const face = faces[0];
    const align = alignmentFor(face, video.videoWidth);
    setAlignment(align);

    // alignment guidance — driven by the real detected landmarks
    if (!isWellAligned(align)) {
      const hint =
        align.x < -0.35 ? 'moveRight' : align.x > 0.35 ? 'moveLeft' : align.y < -0.35 ? 'moveDown' : align.size < 0.12 ? 'moveCloser' : 'moveBack';
      setSnap('guiding', 'face.move.into', undefined, { hint });
      consecutiveRef.current = 0;
      livenessRef.current = { prev: null, count: 0 };
      return;
    }

    // ------------- enrollment path: collect a valid sample -------------
    if (optsRef.current.enroll) {
      const lv = livenessRef.current;
      if (!movementDetected(align, lv.prev)) {
        setSnap('faceDetected', 'face.hold');
        lv.prev = align;
        return;
      }
      lv.prev = align;
      setSnap('faceDetected', 'face.capture');
      optsRef.current.onSample?.(toSample(face.descriptor as Float32Array));
      return;
    }

    // ------------- matching path -------------
    const prof = profileRef.current;
    if (!prof?.enrolled) {
      setSnap('failure', 'face.noProfile');
      return;
    }

    // prototype liveness: gentle movement before final descriptor match
    if (LIVENESS_ENABLED) {
      const lv = livenessRef.current;
      if (lv.count < LIVENESS_SAMPLES) {
        if (!movementDetected(align, lv.prev)) {
          setSnap('liveness', 'face.liveness.turn', undefined, { hint: 'moveGently' });
        } else {
          lv.count += 1;
        }
        lv.prev = align;
        return;
      }
    }

    // real descriptor comparison (never faked)
    setSnap('matching', 'face.verify');
    const result = matchesProfile(face.descriptor as Float32Array, prof);
    setConfidence(result.confidence);
    attemptsRef.current += 1;
    setAttemptCount(attemptsRef.current);

    if (result.ok) {
      const next = consecutiveRef.current + 1;
      consecutiveRef.current = next;
      setMatchProgress(next);
      if (next >= REQUIRED_CONSECUTIVE_MATCHES) {
        runningRef.current = false;
        setSnap('success', 'face.recognized');
        window.setTimeout(() => optsRef.current.onMatch?.(), 300);
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
  }, [cleanup, setSnap]);

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
  // Start: load models → request camera → begin throttled scanning.
  // --------------------------------------------------------------------------
  const start = useCallback(() => {
    if (runningRef.current) return;
    attemptsRef.current = 0;
    consecutiveRef.current = 0;
    setMatchProgress(0);
    setAttemptCount(0);
    setConfidence(0);

    setSnap('loadingModels', 'face.prepare');

    const go = async () => {
      try {
        await initFaceModels();
        setModelsReady(true);
      } catch {
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
          /* autoplay may be blocked; scan loop still tries frames */
        }
        detectorRef.current = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      }
      setSnap('cameraReady', 'face.looking');
      runningRef.current = true;
      timerRef.current = window.setInterval(() => {
        void tick();
      }, RECOGNITION_INTERVAL_MS);
    };
    void go();
  }, [handleCameraError, setSnap, tick]);

  const cancel = useCallback(() => {
    cleanup();
    setSnap('idle', 'face.cancel');
    setAlignment(null);
    setLive(false);
  }, [cleanup, setSnap]);

  return {
    state,
    status,
    videoRef,
    live,
    alignment,
    matchProgress,
    attemptCount,
    confidence,
    cancel,
    start,
    modelsReady,
  };
}
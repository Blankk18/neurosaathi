// ============================================================================
// FACE RECOGNITION — domain types (state machine + profiles)
// ============================================================================

/**
 * Explicit face-login state machine. Movements:
 * idle → loadingModels → requestingCamera → cameraReady → detecting →
 *   (faceDetected → guiding → liveness → matching)* → success | failure
 * Any point may fall back to `error` or to `idle` (when the user switches to PIN).
 */
export type FaceLoginState =
  | 'idle'
  | 'loadingModels'
  | 'requestingCamera'
  | 'cameraReady'
  | 'detecting'
  | 'faceDetected'
  | 'guiding'
  | 'matching'
  | 'liveness'
  | 'success'
  | 'failure'
  | 'error';

/** A calm status line shown under the camera. `key` is an i18n dictionary key
 *  (the UI translates it; params power {name}/{current} style substitutions). */
export interface FaceStatusInfo {
  state: FaceLoginState;
  /** i18n dictionary key for the main message line. */
  key: string;
  params?: Record<string, string | number>;
  /** Optional alignment hint — one of the `face.hint.*` keys. */
  hint?: string;
  /** Optional progress 0..1 (e.g. enrollment samples collected). */
  progress?: number;
}

/**
 * Alignment of a single detected face, derived from landmarks — used to give
 * gentle real guidance (not random messages).
 */
export interface FaceAlignment {
  /** normalised offset from frame centre, -1..1 (negative = left). */
  x: number;
  y: number;
  /** face width as a fraction of frame width — estimate of distance. */
  size: number;
  /** quality 0..1 for the face region before we accept a descriptor. */
  quality: number;
}

/** A stored face descriptor + the moment it was captured. */
export interface FaceSample {
  descriptor: number[]; // 128-dim
  capturedAt: number;
}

/** Enrolled face profile — stored locally (IndexedDB), never uploaded. */
export interface FaceProfile {
  version: number;
  enrolled: boolean;
  samples: FaceSample[];
  enrolledAt: number;
  patientId?: string;
}

/** Result of a single recognition recycle. */
export interface RecognitionResult {
  ok: boolean;
  /** 0..1 confidence (1 - distance), used for a gentle progress feel. */
  confidence: number;
}
// ============================================================================
// FACE RECOGNITION — configuration & calibration notes
//
// All tunable knobs for the real-time face login live here, so they are easy
// to calibrate without digging through component code. These are PROTOTYPE
// values, NOT biometric-grade security parameters.
//
// Calibration guidance
// --------------------
// - FACE_MATCH_THRESHOLD    face-api "distance" is 0..~1.5. Lower = stricter.
//   0.5 is a common default for relaxed UX; 0.4 is stricter. If too many
//   false rejections, raise toward 0.6; if a different face is accepted,
//   lower toward 0.4.
// - REQUIRED_CONSECUTIVE_MATCHES    number of consecutive successful recycle
//   cycles before authenticating. Higher = more stable, slower to complete.
// - LIVENESS_ENABLED        when true, the flow asks the elder to move slowly
//   (turn / lean) and verifies landmark movement before matching. It is a
//   "prototype liveness check", not enterprise anti-spoofing.
// - DETECTOR_*              TinyFaceDetector tuning — see face-api docs. The
//   relaxed threshold is used automatically when no face is found for a while.
// ============================================================================

export const FACE_MODELS_URL = '/models';

/** Recognition interval in ms — how often a frame is processed (150-300 target). */
export const RECOGNITION_INTERVAL_MS = 200;

/** Max euclidean distance between descriptors for a match (lower = stricter). */
export const FACE_MATCH_THRESHOLD = 0.55;

/** Consecutive matching recycle cycles required before authenticating. */
export const REQUIRED_CONSECUTIVE_MATCHES = 3;

/** Max total recognition cycles before giving up for this attempt. */
export const MAX_RECOGNITION_ATTEMPTS = 120;

/** During enrollment, gather this many valid face samples. */
export const ENROLLMENT_SAMPLES = 1;

/** Minimum landmark shift (px, normalised) that counts as "movement". */
export const LIVENESS_MIN_MOVEMENT = 0.02;

/** When enabled, ask for subtle movement before final matching. */
export const LIVENESS_ENABLED = true;

/** Number of movement verifications to pass the liveness check. */
export const LIVENESS_SAMPLES = 2;

// ---------------------------------------------------------------------------
// Detector tuning — the single most impactful knob for "face not detected".
// ---------------------------------------------------------------------------

/** TinyFaceDetector input size — 416 detects smaller / farther faces than 320. */
export const DETECTOR_INPUT_SIZE: 320 | 416 | 512 = 416;

/** Primary score threshold — 0.35 is reliably permissive without many false hits. */
export const DETECTOR_SCORE_THRESHOLD = 0.35;

/** Relaxed threshold used after repeated no-face frames (adapts dynamically). */
export const DETECTOR_SCORE_THRESHOLD_RELAXED = 0.25;

/** After this many consecutive no-face frames, switch to the relaxed threshold. */
export const DETECTOR_RELAX_AFTER_FRAMES = 6;

/** Camera constraints for the live stream. */
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
};

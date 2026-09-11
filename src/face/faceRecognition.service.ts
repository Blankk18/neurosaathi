// ============================================================================
// FACE RECOGNITION SERVICE — model loading, live inference, matching, storage
//
// Encapsulates @vladmandic/face-api so the UI never talks to the library
// directly. All data stays on-device. No video is ever recorded or uploaded —
// only derived 128-dim scalar descriptors are stored.
//
// Storage decision: descriptors are 128 numbers (a few KB even with 10
// samples). IndexedDB is used (not localStorage) so a larger profile never
// risks quota issues and mirrors the existing image-store pattern. Nothing is
// sent to any server.
// ============================================================================

import * as faceapi from '@vladmandic/face-api';
import {
  FACE_MODELS_URL,
  FACE_MATCH_THRESHOLD,
  LIVENESS_MIN_MOVEMENT,
  DETECTOR_INPUT_SIZE,
  DETECTOR_SCORE_THRESHOLD,
  DETECTOR_SCORE_THRESHOLD_RELAXED,
} from './faceRecognition.config';
import type { FaceAlignment, FaceBox, FaceProfile, FaceSample, RecognitionResult } from './types';

const DB_NAME = 'neurosaathi-face-db';
const DB_STORE = 'profiles';
const PROFILE_KEY = 'face-profile';
const PROFILE_VERSION = 1;

// ----------------------------------------------------------------------------
// Type alias for a detected face-with-descriptor (keeps signatures readable).
// ----------------------------------------------------------------------------
export type DetectedFace = faceapi.WithFaceDescriptor<
  faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>
>;

// ----------------------------------------------------------------------------
// IndexedDB helpers for the face profile
// ----------------------------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putProfile(profile: FaceProfile, key: string): Promise<boolean> {
  try {
    const db = await openDb();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(profile, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}

async function getProfile(key: string): Promise<FaceProfile | null> {
  try {
    const db = await openDb();
    return await new Promise<FaceProfile | null>((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as FaceProfile) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Model loading + readiness
// ----------------------------------------------------------------------------

let modelsPromise: Promise<void> | null = null;
let modelsReady = false;

export function areModelsLoaded(): boolean {
  return modelsReady;
}

/** Load detector + landmark + recognition models once. Re-entrant-safe. */
export function initFaceModels(): Promise<void> {
  if (modelsPromise) return modelsPromise;
  modelsPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODELS_URL),
      ]);
      modelsReady = true;
    } catch (err) {
      modelsReady = false;
      modelsPromise = null;
      throw err; // Re-throw so callers see the failure
    }
  })();
  modelsPromise.catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[face] model loading failed:', err);
    modelsReady = false;
    modelsPromise = null;
  });
  return modelsPromise;
}

/** Get primary detector options for face detection. */
export function getPrimaryDetectorOptions(): faceapi.TinyFaceDetectorOptions {
  return new faceapi.TinyFaceDetectorOptions({
    inputSize: DETECTOR_INPUT_SIZE,
    scoreThreshold: DETECTOR_SCORE_THRESHOLD,
  });
}

/** Get relaxed detector options for fallback when primary detection fails repeatedly. */
export function getRelaxedDetectorOptions(): faceapi.TinyFaceDetectorOptions {
  return new faceapi.TinyFaceDetectorOptions({
    inputSize: DETECTOR_INPUT_SIZE,
    scoreThreshold: DETECTOR_SCORE_THRESHOLD_RELAXED,
  });
}

// ----------------------------------------------------------------------------
// Stream lifecycle
// ----------------------------------------------------------------------------

export async function openCameraStream(constraints: MediaStreamConstraints): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia(constraints);
}

export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

export function releaseVideo(video: HTMLVideoElement | null): void {
  if (video) video.srcObject = null;
}

// ----------------------------------------------------------------------------
// Frame analysis
// ----------------------------------------------------------------------------

function landmarkCenter(lm: faceapi.FaceLandmarks68): { x: number; y: number } {
  const pts = lm.positions;
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

function landmarkExtent(lm: faceapi.FaceLandmarks68): number {
  const pts = lm.positions;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
  }
  return maxX - minX;
}

/**
 * Analyse the current video frame. Returns the list of detected faces with
 * landmarks + descriptors (empty implies no face). The dangerous case of more
 * than one face is surfaced to the caller so it can refuse to authenticate.
 */
export async function analyzeFrame(
  video: HTMLVideoElement,
  detectorOptions: faceapi.TinyFaceDetectorOptions,
): Promise<DetectedFace[] | null> {
  try {
    const result = await faceapi
      .detectAllFaces(video, detectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();
    return result as DetectedFace[];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[face] analyzeFrame error:', err);
    return null;
  }
}

/** Bounding box in video pixel coordinates for overlay rendering. */
export function faceBoxFor(face: DetectedFace): FaceBox {
  const b = face.detection.box;
  return { x: b.x, y: b.y, width: b.width, height: b.height, score: face.detection.score };
}

/** Infer a crude alignment from the first face (real landmark-based guidance). */
export function alignmentFor(face: DetectedFace, frameW: number): FaceAlignment {
  const lm = face.landmarks;
  const c = landmarkCenter(lm);
  const extent = landmarkExtent(lm);
  const boxH = face.detection.box.height;
  const size = extent / frameW;
  const boxSize = boxH / frameW;
  const x = (c.x - frameW / 2) / (frameW / 2);
  const y = (c.y - frameW / 2) / (frameW / 2);
  const quality = Math.min(
    1,
    Math.max(0, 1 - Math.abs(x) * 1.2 - (boxSize < 0.12 ? 0.3 : 0) - (boxSize > 0.5 ? 0.4 : 0)),
  );
  return { x, y, size, quality };
}

/** True when the face is centred, upright and a comfortable size. */
export function isWellAligned(a: FaceAlignment): boolean {
  // Relaxed thresholds: allow more tilt/offset so valid faces are not rejected.
  // Increased tolerance on x/y and widened size range.
  return Math.abs(a.x) < 0.45 && Math.abs(a.y) < 0.5 && a.size > 0.06 && a.size < 0.7;
}

/** Small O(n) euclidean distance used for descriptor comparison. */
function euclidean(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = (a[i] as number) - (b[i] as number);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function descriptorLowestDistance(candidate: Float32Array, samples: FaceSample[]): number {
  let best = Infinity;
  for (const s of samples) {
    const d = euclidean(candidate, s.descriptor);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Compare one live descriptor against the enrolled profile. Returns ok=true
 * when the nearest enrolled descriptor is within FACE_MATCH_THRESHOLD. The
 * hook requires multiple consecutive ok cycles before authenticating.
 */
export function matchesProfile(descriptor: Float32Array, profile: FaceProfile): RecognitionResult {
  if (!profile.enrolled || profile.samples.length === 0) {
    return { ok: false, confidence: 0, distance: Infinity };
  }
  const distance = descriptorLowestDistance(descriptor, profile.samples);
  const confidence = Math.max(0, Math.min(1, 1 - distance / 1.5));
  return { ok: distance < FACE_MATCH_THRESHOLD, confidence, distance };
}

/** Liveness: did the face landmark centre move more than the minimum? */
export function movementDetected(a: FaceAlignment, prev: FaceAlignment | null): boolean {
  if (!prev) return false;
  const dx = Math.abs(a.x - prev.x);
  const dy = Math.abs(a.y - prev.y);
  return Math.hypot(dx, dy) > LIVENESS_MIN_MOVEMENT;
}

// ----------------------------------------------------------------------------
// Profile persistence
// ----------------------------------------------------------------------------

/**
 * Load face profile from IndexedDB, scoped by elderId.
 * Key format: 'face-profile:{elderId}'
 * This prevents a cached profile from one user being served to another.
 */
export async function loadFaceProfile(elderId?: string): Promise<FaceProfile | null> {
  const key = elderId ? `${PROFILE_KEY}:${elderId}` : PROFILE_KEY;
  const profile = await getProfile(key);
  return profile && profile.version === PROFILE_VERSION ? profile : null;
}

/**
 * Save face profile to IndexedDB, scoped by elderId.
 * Blobs (imageBlob) are NOT stored here — only descriptors and metadata.
 */
export async function saveFaceProfile(profile: FaceProfile, elderId?: string): Promise<boolean> {
  const key = elderId ? `${PROFILE_KEY}:${elderId}` : PROFILE_KEY;
  // Strip any imageBlob fields before IndexedDB storage
  const stripped: FaceProfile = {
    ...profile,
    version: PROFILE_VERSION,
    samples: profile.samples.map((s) => ({ descriptor: s.descriptor, capturedAt: s.capturedAt })),
  };
  return putProfile(stripped, key);
}

/**
 * Delete face profile from IndexedDB, scoped by elderId.
 */
export async function resetFaceProfile(elderId?: string): Promise<boolean> {
  const key = elderId ? `${PROFILE_KEY}:${elderId}` : PROFILE_KEY;
  try {
    const db = await openDb();
    await new Promise<boolean>((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
    return true;
  } catch {
    return false;
  }
}

export function buildFaceProfile(samples: FaceSample[], patientId?: string): FaceProfile {
  return {
    version: PROFILE_VERSION,
    enrolled: true,
    samples,
    enrolledAt: Date.now(),
    patientId,
  };
}

/** Labelled alignment hint (used for gentle, real, non-random guidance). */
export function alignmentHint(a: FaceAlignment): string | null {
  if (Math.abs(a.x) > 0.35) return a.x < 0 ? 'moveRight' : 'moveLeft';
  if (a.y < -0.35) return 'moveDown';
  if (a.size < 0.08) return 'moveCloser';
  if (a.size > 0.6) return 'moveBack';
  return null;
}

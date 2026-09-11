// ============================================================================
// FACE DATABASE SERVICE — Supabase persistence layer for face_enrollments
//
// ARCHITECTURE:
//   Camera (video frame)
//     ↓
//   useFaceRecognition (descriptor + imageBlob per sample)
//     ↓
//   FaceEnrollment UI calls:
//     1. uploadEnrollmentImages()  → face-enrollments storage bucket (PRIVATE)
//     2. saveFaceEnrollment()      → face_enrollments table
//     ↓
//   Supabase = AUTHORITATIVE
//   IndexedDB = OPTIONAL CACHE (no blobs stored there)
//
// SECURITY:
//   - Uses only VITE_SUPABASE_PUBLISHABLE_KEY (anon key)
//   - Storage bucket 'face-enrollments' is PRIVATE — no public URLs
//   - Storage RLS policies verify ownership via:
//       auth.uid() → profiles.auth_user_id → elder_profiles.profile_id → elder_profiles.id
//   - getPublicUrl() is NEVER called — use createSignedUrl() for any display
//   - Only derived 128-dim descriptors are stored in the DB
//   - Only the 10 accepted enrollment frames are stored in Storage
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { getElderProfileById, getElderProfileByProfileId } from './authService';
import type { FaceProfile, FaceSample } from '@/face/types';

/** Current face model version identifier stored alongside embeddings. */
export const FACE_MODEL_VERSION = 'vladmandic-tinyface-1.0';

/** Name of the private Supabase Storage bucket for enrollment images. */
export const FACE_BUCKET = 'face-enrollments';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface FaceEnrollmentResult {
  success: boolean;
  error?: string;
}

export interface ImageUploadResult {
  success: boolean;
  paths: string[];
  error?: string;
  /** The first exact Supabase Storage error encountered, for surfacing in UI/logs. */
  firstError?: string;
  /** Number of blobs that were undefined or zero-byte (capture failed at hook level). */
  missingBlobs: number;
  /** The enrollmentId for this batch. Scopes paths under {authUserId}/{enrollmentId}/. */
  enrollmentId: string;
}

// ---------------------------------------------------------------------------
// Image upload
// ---------------------------------------------------------------------------

/**
 * Upload enrollment frame images to the private 'face-enrollments' storage bucket.
 *
 * PATH FORMAT: {authUserId}/{enrollmentId}/sample-NN.jpg
 *
 *   authUserId   = supabase.auth.getUser().data.user.id  (anonymous Supabase UID)
 *   enrollmentId = caller-generated UUID per enrollment attempt (no collisions)
 *
 * RLS policy evaluates: (storage.foldername(name))[1] = auth.uid()::text
 * This works because authUserId === auth.uid() for the authenticated user.
 *
 * NOTE: The database face_enrollments row still uses elder_profiles.id as elder_id.
 *       Storage path identification and DB row identification are separate concerns.
 *
 * @param authUserId   - supabase.auth.getUser() user.id (must match auth.uid())
 * @param enrollmentId - unique UUID for this enrollment attempt (caller-generated)
 * @param blobs        - Array of Blob|undefined, one per accepted face sample
 */
export async function uploadEnrollmentImages(
  authUserId: string,
  enrollmentId: string,
  blobs: (Blob | undefined)[],
): Promise<ImageUploadResult> {
  // eslint-disable-next-line no-console
  console.info(`[FaceStorage] uploadEnrollmentImages — authUserId: ${authUserId}, enrollmentId: ${enrollmentId}, totalBlobs: ${blobs.length}`);

  if (!isSupabaseConfigured) {
    // eslint-disable-next-line no-console
    console.error('[FaceStorage] Supabase not configured');
    return { success: false, paths: [], error: 'Supabase not configured', missingBlobs: 0, enrollmentId };
  }

  if (!authUserId || authUserId.trim() === '') {
    // eslint-disable-next-line no-console
    console.error('[FaceStorage] authUserId is empty');
    return { success: false, paths: [], error: 'Auth user ID is required', missingBlobs: 0, enrollmentId };
  }

  if (!enrollmentId || enrollmentId.trim() === '') {
    // eslint-disable-next-line no-console
    console.error('[FaceStorage] enrollmentId is empty');
    return { success: false, paths: [], error: 'Enrollment ID is required', missingBlobs: 0, enrollmentId };
  }

  // Verify the current Supabase session matches the provided authUserId.
  // This prevents any accidental cross-user uploads.
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    // eslint-disable-next-line no-console
    console.error('[FaceStorage] No authenticated Supabase user — cannot upload');
    return { success: false, paths: [], error: 'Not authenticated. Please re-register.', missingBlobs: 0, enrollmentId };
  }
  if (userData.user.id !== authUserId) {
    // eslint-disable-next-line no-console
    console.error(`[FaceStorage] Auth mismatch: session uid=${userData.user.id}, provided authUserId=${authUserId}`);
    return { success: false, paths: [], error: 'Auth session mismatch. Please restart registration.', missingBlobs: 0, enrollmentId };
  }
  // eslint-disable-next-line no-console
  console.info(`[FaceStorage] Auth verified — uid=${userData.user.id}`);

  // Validate blobs — reject undefined and zero-byte entries
  const validPairs: { blob: Blob; index: number }[] = [];
  let missingBlobs = 0;

  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];
    if (!blob) {
      // eslint-disable-next-line no-console
      console.warn(`[FaceStorage] Sample ${i + 1}: blob is undefined — skipping`);
      missingBlobs++;
      continue;
    }
    if (blob.size === 0) {
      // eslint-disable-next-line no-console
      console.warn(`[FaceStorage] Sample ${i + 1}: blob.size === 0 — zero-byte, skipping. type=${blob.type}`);
      missingBlobs++;
      continue;
    }
    // eslint-disable-next-line no-console
    console.info(`[FaceStorage] Sample ${i + 1}: blob OK — size=${blob.size} bytes, type=${blob.type}`);
    validPairs.push({ blob, index: i });
  }

  if (validPairs.length === 0) {
    // eslint-disable-next-line no-console
    console.error('[FaceStorage] No valid blobs to upload — all were undefined or zero-byte');
    return {
      success: false,
      paths: [],
      error: `No valid face images were captured (${missingBlobs} missing/empty). Please try enrollment again.`,
      missingBlobs,
      enrollmentId,
    };
  }

  // SEQUENTIAL upload — so each failure is individually identifiable
  const uploadedPaths: string[] = [];
  let firstError: string | undefined;

  for (let seq = 0; seq < validPairs.length; seq++) {
    const { blob, index } = validPairs[seq];
    const fileName = `sample-${String(index + 1).padStart(2, '0')}.jpg`;
    // Path: {authUserId}/{enrollmentId}/sample-NN.jpg
    // RLS: (storage.foldername(name))[1] = auth.uid()::text
    //      auth.uid() === authUserId (verified above)
    const storagePath = `${authUserId}/${enrollmentId}/${fileName}`;

    // eslint-disable-next-line no-console
    console.info(
      `[FaceStorage] Uploading ${seq + 1}/${validPairs.length} — path=${storagePath}, size=${blob.size}, type=${blob.type}`
    );

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(FACE_BUCKET)
      .upload(storagePath, blob, {
        contentType: 'image/jpeg',
        upsert: false, // enrollmentId is unique per attempt — no collisions
      });

    if (uploadError) {
      // Supabase StorageError.statusCode is typed as string (e.g. '400')
      const storageErr = uploadError as typeof uploadError & {
        statusCode?: string;
        status?: string | number;
        error?: string;
      };
      const httpStatus = storageErr.statusCode
        ? Number(storageErr.statusCode)
        : typeof storageErr.status === 'number'
          ? storageErr.status
          : Number(storageErr.status ?? 0);

      // eslint-disable-next-line no-console
      console.error(
        `[FaceStorage] Upload ${seq + 1}/${validPairs.length} FAILED — path=${storagePath}`,
        {
          message: storageErr.message,
          name: storageErr.name,
          statusCode: storageErr.statusCode,
          httpStatus,
          error: storageErr.error,
          fullError: storageErr,
        }
      );

      firstError = `[HTTP ${httpStatus || '?'}] ${storageErr.message}`;

      if (httpStatus === 400 || httpStatus === 403) {
        // eslint-disable-next-line no-console
        console.error(
          '[FaceStorage] HTTP 400/403 — Storage RLS is blocking the upload.\n' +
          'Run migration 20260912_storage_rls_auth_uid.sql in Supabase SQL Editor.\n' +
          `Rejected path: ${storagePath}\n` +
          `auth.uid() must equal: ${authUserId}`
        );
      }

      // Best-effort cleanup of files already uploaded in this batch
      if (uploadedPaths.length > 0) {
        // eslint-disable-next-line no-console
        console.info(`[FaceStorage] Cleaning up ${uploadedPaths.length} partially uploaded files…`);
        await supabase.storage.from(FACE_BUCKET).remove(uploadedPaths).catch((e: unknown) => {
          // eslint-disable-next-line no-console
          console.warn('[FaceStorage] Cleanup failed (best-effort):', e);
        });
      }

      return {
        success: false,
        paths: [],
        error:
          `Upload failed at sample ${seq + 1}/${validPairs.length}: ${storageErr.message}` +
          (httpStatus ? ` (HTTP ${httpStatus})` : '') +
          (httpStatus === 400 || httpStatus === 403
            ? ' — Run migration 20260912_storage_rls_auth_uid.sql'
            : ''),
        firstError,
        missingBlobs,
        enrollmentId,
      };
    }

    // eslint-disable-next-line no-console
    console.info(`[FaceStorage] Upload ${seq + 1}/${validPairs.length} SUCCESS — path=${uploadData?.path ?? storagePath}`);
    uploadedPaths.push(storagePath);
  }

  // eslint-disable-next-line no-console
  console.info(
    `[FaceStorage] All ${uploadedPaths.length} images uploaded — face-enrollments/${authUserId}/${enrollmentId}/`
  );

  return { success: true, paths: uploadedPaths, missingBlobs, enrollmentId };
}

// ---------------------------------------------------------------------------
// Save / upsert
// ---------------------------------------------------------------------------

/**
 * Save (or update) a face enrollment for an elder in Supabase.
 *
 * Stores all collected face descriptor samples as a JSON string (embedding)
 * and the Supabase Storage paths for the corresponding enrollment images.
 *
 * Uses upsert with `onConflict: 'elder_id'` — the table has a UNIQUE
 * constraint on elder_id, so re-enrollment naturally replaces the old row.
 *
 * NOTE: imageBlob fields are stripped before JSON serialization — only
 * descriptor and capturedAt are stored in the embedding column.
 *
 * @param elderId      - The Supabase elder_profiles.id (UUID)
 * @param samples      - Array of FaceSample (descriptor + capturedAt [+ imageBlob])
 * @param modelVersion - Model identifier string
 * @param photoPaths   - Storage paths from uploadEnrollmentImages()
 */
export async function saveFaceEnrollment(
  elderId: string,
  samples: FaceSample[],
  modelVersion: string = FACE_MODEL_VERSION,
  photoPaths: string[] = [],
): Promise<FaceEnrollmentResult> {
  if (!isSupabaseConfigured) {
    // eslint-disable-next-line no-console
    console.warn('[FaceDB] Supabase not configured — cannot save face enrollment.');
    return { success: false, error: 'Supabase not configured' };
  }

  if (!elderId || elderId.trim() === '') {
    // eslint-disable-next-line no-console
    console.error('[FaceDB] saveFaceEnrollment called with empty elderId');
    return { success: false, error: 'Elder ID is required' };
  }

  if (!samples || samples.length === 0) {
    // eslint-disable-next-line no-console
    console.error('[FaceDB] saveFaceEnrollment called with no samples');
    return { success: false, error: 'At least one face sample is required' };
  }

  // ── Diagnostic: verify auth chain before attempting write ─────────────────
  // auth.uid() → profiles.auth_user_id → profiles.id
  //           → elder_profiles.profile_id → elder_profiles.id === elderId
  try {
    // 1. get current auth user
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user ?? null;
    const authUid = authUser?.id ?? null;
    const isAnonymous = Boolean(authUser?.is_anonymous);

    // eslint-disable-next-line no-console
    console.info(`[FaceDB] auth uid = ${authUid}`);
    // eslint-disable-next-line no-console
    console.info(`[FaceDB] is_anonymous = ${isAnonymous}`);
    // eslint-disable-next-line no-console
    console.info(`[FaceDB] elderId = ${elderId}`);

    if (!authUid || !authUser) {
      // eslint-disable-next-line no-console
      console.error('[FaceDB] No authenticated user — cannot verify ownership chain');
      return { success: false, error: 'No authenticated Supabase user' };
    }

    // 2. get profiles by auth_user_id
    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .select('id, auth_user_id')
      .eq('auth_user_id', authUid)
      .maybeSingle();

    if (profileErr || !profileRow) {
      // eslint-disable-next-line no-console
      console.error(`[FaceDB] NO profiles row found for auth_user_id=${authUid}`, profileErr);
      return { success: false, error: 'No profiles row found for current user' };
    }

    // eslint-disable-next-line no-console
    console.info(`[FaceDB] profiles.id = ${profileRow.id}`);

    // 3. get elder_profiles using the shared authoritative lookup
    const { data: epRow, error: epErr } = await getElderProfileById(elderId);

    if (epErr) {
      // eslint-disable-next-line no-console
      console.error('[FaceDB] elder_profiles lookup error:', epErr.message, epErr.code);
      return { success: false, error: `elder_profiles query error: ${epErr.message}` };
    }

    if (!epRow) {
      // Diagnostic check by profile_id
      const { data: epByProfile } = await getElderProfileByProfileId(profileRow.id);
      if (epByProfile) {
        // eslint-disable-next-line no-console
        console.warn(`[FaceDB] elder_profiles found by profile_id (${epByProfile.id}) but not by elderId (${elderId})`);
      } else {
        // eslint-disable-next-line no-console
        console.error(`[FaceDB] NO elder_profiles row for elderId=${elderId} or profile_id=${profileRow.id}`);
      }
      return {
        success: false,
        error: `No elder_profiles row found for elder ID ${elderId}. Registration setup is incomplete.`
      };
    }

    // eslint-disable-next-line no-console
    console.info(`[FaceDB] elder_profiles.id = ${epRow.id}`);
    // eslint-disable-next-line no-console
    console.info(`[FaceDB] elder_profiles.profile_id = ${epRow.profile_id}`);

    // 4. verify:
    // profile.auth_user_id === auth.uid()
    // elderProfile.profile_id === profile.id
    // elderProfile.id === elderId
    const isProfileOwner = profileRow.auth_user_id === authUid;
    const isElderProfileLinked = epRow.profile_id === profileRow.id;
    const isElderIdMatch = epRow.id === elderId;

    // eslint-disable-next-line no-console
    console.info('[FaceDB] FINAL ID CHECK');
    // eslint-disable-next-line no-console
    console.info(`authUserId = ${authUid}`);
    // eslint-disable-next-line no-console
    console.info(`profileId = ${profileRow.id}`);
    // eslint-disable-next-line no-console
    console.info(`elderId = ${elderId}`);
    // eslint-disable-next-line no-console
    console.info(`elderProfile.id = ${epRow.id}`);
    // eslint-disable-next-line no-console
    console.info(`elderProfile.profile_id = ${epRow.profile_id}`);

    if (!isProfileOwner || !isElderProfileLinked || !isElderIdMatch) {
      // eslint-disable-next-line no-console
      console.error('[FaceDB] ownership verified = false', {
        isProfileOwner,
        isElderProfileLinked,
        isElderIdMatch,
      });
      return {
        success: false,
        error: `Ownership verification failed: profileOwner=${isProfileOwner}, linked=${isElderProfileLinked}, idMatch=${isElderIdMatch}`
      };
    }

    // eslint-disable-next-line no-console
    console.info('[FaceDB] ownership verified = true');
  } catch (diagErr: unknown) {
    const msg = diagErr instanceof Error ? diagErr.message : 'Unknown diagnostic error';
    // eslint-disable-next-line no-console
    console.error('[FaceDB] Auth chain diagnostic exception:', diagErr);
    return { success: false, error: `Diagnostic check failed: ${msg}` };
  }

  // Strip imageBlob before serializing — Blobs must NOT go into JSON
  const embedding = JSON.stringify(
    samples.map((s) => ({
      descriptor: s.descriptor,
      capturedAt: s.capturedAt,
    })),
  );

  const payload = {
    elder_id: elderId,
    embedding,
    sample_count: samples.length,
    model_version: modelVersion,
    photo_paths: photoPaths,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  try {
    // Check if an existing row exists for this elder_id
    const { data: existingRow, error: checkErr } = await supabase
      .from('face_enrollments')
      .select('id')
      .eq('elder_id', elderId)
      .maybeSingle();

    if (checkErr) {
      // eslint-disable-next-line no-console
      console.warn('[FaceDB] Check for existing enrollment error (non-fatal):', checkErr);
    }

    if (existingRow) {
      // eslint-disable-next-line no-console
      console.info(`[FaceDB] Existing face_enrollments row found (${existingRow.id}) — executing UPDATE`);
      const { error: updateError } = await supabase
        .from('face_enrollments')
        .update({
          embedding,
          sample_count: samples.length,
          model_version: modelVersion,
          photo_paths: photoPaths,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('elder_id', elderId);

      if (updateError) {
        // eslint-disable-next-line no-console
        console.error('[FaceDB] face_enrollments UPDATE failed:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });
        return {
          success: false,
          error: `Database UPDATE error [${updateError.code}]: ${updateError.message}${updateError.details ? ' — ' + updateError.details : ''}`,
        };
      }

      // eslint-disable-next-line no-console
      console.info(`[FaceDB] face_enrollments UPDATE OK — elder: ${elderId}`);
      return { success: true };
    }

    // Attempt INSERT
    // eslint-disable-next-line no-console
    console.info('[FaceDB] Attempting INSERT into face_enrollments…', { elderId, sampleCount: samples.length, photoPaths: photoPaths.length });

    const { error: insertError } = await supabase
      .from('face_enrollments')
      .insert(payload);

    if (!insertError) {
      // eslint-disable-next-line no-console
      console.info(`[FaceDB] face_enrollments INSERT OK — elder: ${elderId}, samples: ${samples.length}, images: ${photoPaths.length}`);
      return { success: true };
    }

    // eslint-disable-next-line no-console
    console.error('[FaceDB] face_enrollments INSERT failed:', {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
    });

    if (insertError.code === '23505') { // unique_violation
      // eslint-disable-next-line no-console
      console.info('[FaceDB] Conflict on elder_id — falling back to UPDATE…');
      const { error: updateError } = await supabase
        .from('face_enrollments')
        .update({
          embedding,
          sample_count: samples.length,
          model_version: modelVersion,
          photo_paths: photoPaths,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('elder_id', elderId);

      if (updateError) {
        // eslint-disable-next-line no-console
        console.error('[FaceDB] Fallback UPDATE also failed:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });
        return {
          success: false,
          error: `Database UPDATE error [${updateError.code}]: ${updateError.message}${updateError.details ? ' — ' + updateError.details : ''}`,
        };
      }

      // eslint-disable-next-line no-console
      console.info(`[FaceDB] face_enrollments UPDATE OK — elder: ${elderId}`);
      return { success: true };
    }

    return {
      success: false,
      error: `Database INSERT error [${insertError.code}]: ${insertError.message}${insertError.details ? ' — ' + insertError.details : ''}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown network error';
    // eslint-disable-next-line no-console
    console.error('[FaceDB] Network error saving face enrollment:', msg);
    return { success: false, error: `Network error: ${msg}` };
  }
}


// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/**
 * Load the active face enrollment for an elder from Supabase.
 *
 * Returns a FaceProfile compatible with the existing matchesProfile() function,
 * or null if no enrollment exists or Supabase is unavailable.
 *
 * NOTE: imageBlob is NOT restored from Supabase — it is ephemeral and only
 * present in memory during the enrollment session.
 */
export async function loadFaceEnrollment(elderId: string): Promise<FaceProfile | null> {
  if (!isSupabaseConfigured) return null;
  if (!elderId || elderId.trim() === '') return null;

  try {
    const { data, error } = await supabase
      .from('face_enrollments')
      .select('embedding, model_version, is_active, created_at')
      .eq('elder_id', elderId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // "no rows returned" — not enrolled yet, not an error
        return null;
      }
      // eslint-disable-next-line no-console
      console.warn('[faceDatabaseService] loadFaceEnrollment error:', error.message);
      return null;
    }

    if (!data || !data.embedding) return null;

    let rawSamples: { descriptor: number[]; capturedAt: number }[];
    try {
      rawSamples = JSON.parse(data.embedding as string);
    } catch (parseErr) {
      // eslint-disable-next-line no-console
      console.error('[faceDatabaseService] Failed to parse face embedding JSON:', parseErr);
      return null;
    }

    if (!Array.isArray(rawSamples) || rawSamples.length === 0) return null;

    const samples: FaceSample[] = rawSamples.map((s) => ({
      descriptor: Array.isArray(s.descriptor) ? s.descriptor : [],
      capturedAt: typeof s.capturedAt === 'number' ? s.capturedAt : Date.now(),
      // imageBlob intentionally omitted — not stored/loaded
    }));

    const validSamples = samples.filter(
      (s) => Array.isArray(s.descriptor) && s.descriptor.length === 128,
    );

    if (validSamples.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[faceDatabaseService] Loaded enrollment has no valid 128-dim descriptors');
      return null;
    }

    const enrolledAt = data.created_at ? new Date(data.created_at as string).getTime() : Date.now();

    return {
      version: 1,
      enrolled: true,
      samples: validSamples,
      enrolledAt,
      patientId: elderId,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    // eslint-disable-next-line no-console
    console.warn('[faceDatabaseService] loadFaceEnrollment network error:', msg);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Check
// ---------------------------------------------------------------------------

/**
 * Returns true if the elder has an active face enrollment in Supabase.
 * Lightweight — only fetches the id column.
 */
export async function hasFaceEnrollment(elderId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  if (!elderId || elderId.trim() === '') return false;

  try {
    const { data, error } = await supabase
      .from('face_enrollments')
      .select('id')
      .eq('elder_id', elderId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[faceDatabaseService] hasFaceEnrollment error:', error.message);
      return false;
    }

    return Boolean(data);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Delete / deactivate
// ---------------------------------------------------------------------------

/**
 * Deactivates (soft-deletes) the face enrollment for an elder.
 * Sets is_active = false rather than hard-deleting, preserving the audit trail.
 *
 * Note: This does NOT delete the images from Supabase Storage.
 * Storage cleanup is a separate operation if needed.
 */
export async function deleteFaceEnrollment(elderId: string): Promise<FaceEnrollmentResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }
  if (!elderId || elderId.trim() === '') {
    return { success: false, error: 'Elder ID is required' };
  }

  try {
    const { error } = await supabase
      .from('face_enrollments')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('elder_id', elderId);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[faceDatabaseService] deleteFaceEnrollment error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

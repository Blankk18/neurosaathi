-- ============================================================================
-- NEUROSAATHI — Migration: Face Enrollment Image Storage
-- Adds sample_count + photo_paths columns to face_enrollments.
-- Creates a PRIVATE Supabase Storage bucket for biometric images.
-- RLS is tied to the auth chain:
--   auth.uid() → profiles.auth_user_id → profiles.id
--   → elder_profiles.profile_id → elder_profiles.id
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema additions to face_enrollments
-- ---------------------------------------------------------------------------

ALTER TABLE public.face_enrollments
  ADD COLUMN IF NOT EXISTS sample_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_paths  TEXT[]   NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.face_enrollments.sample_count IS
  'Number of accepted face descriptor samples (should equal ENROLLMENT_SAMPLES = 10)';

COMMENT ON COLUMN public.face_enrollments.photo_paths IS
  'Supabase Storage paths for the captured enrollment frame images (one per sample). '
  'Format: face-enrollments/{elder_id}/sample-NN.jpg';

-- ---------------------------------------------------------------------------
-- 2. Private storage bucket for biometric enrollment images
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'face-enrollments',
  'face-enrollments',
  false,                                          -- PRIVATE — no public URLs
  524288,                                         -- 512 KB max per file
  ARRAY['image/jpeg', 'image/webp', 'image/png']
)
ON CONFLICT (id) DO UPDATE
  SET public            = false,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 3. Helper function: verify that the currently authenticated user owns the
--    elder_profile whose UUID appears as the first folder segment of a storage
--    object path inside the face-enrollments bucket.
--
--    Path format: {elder_id}/sample-01.jpg
--    (storage.foldername(name))[1] extracts the first path component.
--
--    Chain verified:
--      auth.uid()
--        → public.profiles.auth_user_id
--        → public.profiles.id
--        → public.elder_profiles.profile_id
--        → public.elder_profiles.id  (= folder name / elder_id)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.storage_path_elder_id_belongs_to_caller(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.elder_profiles  ep
    JOIN   public.profiles         p  ON p.id = ep.profile_id
    WHERE  p.auth_user_id = auth.uid()
    AND    ep.id::text    = (storage.foldername(object_name))[1]
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Storage RLS policies for face-enrollments bucket
-- ---------------------------------------------------------------------------

-- INSERT — authenticated elder may upload to their own path only
CREATE POLICY "Elder can upload own enrollment images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'face-enrollments'
  AND auth.uid() IS NOT NULL
  AND public.storage_path_elder_id_belongs_to_caller(name)
);

-- SELECT — authenticated elder may read their own images (for signed URL generation)
CREATE POLICY "Elder can read own enrollment images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'face-enrollments'
  AND auth.uid() IS NOT NULL
  AND public.storage_path_elder_id_belongs_to_caller(name)
);

-- UPDATE — allow overwrite on re-enrollment (same path, same elder)
CREATE POLICY "Elder can update own enrollment images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'face-enrollments'
  AND auth.uid() IS NOT NULL
  AND public.storage_path_elder_id_belongs_to_caller(name)
)
WITH CHECK (
  bucket_id = 'face-enrollments'
  AND auth.uid() IS NOT NULL
  AND public.storage_path_elder_id_belongs_to_caller(name)
);

-- DELETE — elder may delete their own images when re-enrolling or resetting
CREATE POLICY "Elder can delete own enrollment images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'face-enrollments'
  AND auth.uid() IS NOT NULL
  AND public.storage_path_elder_id_belongs_to_caller(name)
);

-- NOTE: No public read policy. getPublicUrl() will not work for this bucket.
-- Use supabase.storage.createSignedUrl() for any display use case.

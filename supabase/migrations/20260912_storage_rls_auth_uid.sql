-- ============================================================================
-- NEUROSAATHI — FINAL STORAGE RLS FOR FACE ENROLLMENT IMAGES
-- Migration: 20260912_storage_rls_auth_uid.sql
--
-- STORAGE PATH:
--   face-enrollments/{authUserId}/{enrollmentId}/sample-NN.jpg
--
--   First folder segment = auth.uid()::text (the anonymous user's Supabase UUID)
--   Second folder segment = random UUID generated per enrollment attempt
--
-- RLS RULE:
--   (storage.foldername(name))[1] = auth.uid()::text
--   No joins to profiles/elder_profiles inside Storage policies.
--   Simple, correct, works for anonymous auth users.
--
-- DATABASE:
--   face_enrollments.elder_id = elder_profiles.id  (unchanged)
--   Storage path identification is separate from DB row identification.
-- ============================================================================

-- Drop ALL old face-enrollment storage policies (from all previous migrations)
DROP POLICY IF EXISTS "Elder can upload own enrollment images"  ON storage.objects;
DROP POLICY IF EXISTS "Elder can read own enrollment images"    ON storage.objects;
DROP POLICY IF EXISTS "Elder can update own enrollment images"  ON storage.objects;
DROP POLICY IF EXISTS "Elder can delete own enrollment images"  ON storage.objects;

-- Also drop any policies from the very first storage migration
DROP POLICY IF EXISTS "Authenticated users can upload face enrollments" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own face enrollments"             ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own face enrollments"           ON storage.objects;

-- Ensure the bucket exists and is PRIVATE
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-enrollments', 'face-enrollments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ---------------------------------------------------------------------------
-- UPLOAD (INSERT)
-- ---------------------------------------------------------------------------
CREATE POLICY "Elder can upload own enrollment images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'face-enrollments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- READ (SELECT)
-- ---------------------------------------------------------------------------
CREATE POLICY "Elder can read own enrollment images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'face-enrollments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- UPDATE
-- ---------------------------------------------------------------------------
CREATE POLICY "Elder can update own enrollment images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'face-enrollments'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'face-enrollments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- DELETE (for cleanup after failed enrollments)
-- ---------------------------------------------------------------------------
CREATE POLICY "Elder can delete own enrollment images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'face-enrollments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify
SELECT policyname, cmd
FROM pg_policies
WHERE tablename  = 'objects'
  AND schemaname = 'storage'
  AND (qual LIKE '%face-enrollments%' OR with_check LIKE '%face-enrollments%')
ORDER BY policyname;

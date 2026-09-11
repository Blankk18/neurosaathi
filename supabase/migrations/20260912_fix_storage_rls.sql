-- ============================================================================
-- NEUROSAATHI — FIX STORAGE RLS FOR FACE ENROLLMENT IMAGES
-- Migration: 20260912_fix_storage_rls.sql
--
-- PROBLEM:
--   The previous face-enrollments Storage RLS used a helper function
--   storage_path_elder_id_belongs_to_caller() that walks:
--       auth.uid() → profiles.auth_user_id → profiles.id
--     → elder_profiles.profile_id → elder_profiles.id
--   If this function was never deployed to the live DB, ALL uploads return
--   HTTP 400 (Forbidden) because the policy can't evaluate.
--
-- FIX:
--   Replace the complex helper-function-based policy with a direct policy
--   that extracts the elder_id from the storage path (first path segment)
--   and verifies ownership using a direct SQL EXISTS check.
--   No helper function needed — Supabase's storage.foldername() is built-in.
--
-- PATH FORMAT:
--   face-enrollments/{elder_id}/{enrollment_id}/sample-NN.jpg
--   The first segment (storage.foldername(name)[1]) is the elder_id.
--   We verify: elder_profiles.id::text = first_segment
--           AND elder_profiles → profiles → auth.uid()
-- ============================================================================

-- Drop the old helper function if it exists
DROP FUNCTION IF EXISTS public.storage_path_elder_id_belongs_to_caller(TEXT);

-- Drop old policies on the face-enrollments bucket
DROP POLICY IF EXISTS "Elder can upload own enrollment images" ON storage.objects;
DROP POLICY IF EXISTS "Elder can read own enrollment images" ON storage.objects;
DROP POLICY IF EXISTS "Elder can delete own enrollment images" ON storage.objects;
DROP POLICY IF EXISTS "Elder can update own enrollment images" ON storage.objects;

-- Ensure the bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-enrollments', 'face-enrollments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ---------------------------------------------------------------------------
-- UPLOAD (INSERT) policy
-- Path: face-enrollments/{elder_id}/{enrollment_id}/sample-NN.jpg
-- First segment = elder_id UUID
-- Verify the authenticated user owns this elder_id via profiles chain.
-- ---------------------------------------------------------------------------
CREATE POLICY "Elder can upload own enrollment images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'face-enrollments'
  AND EXISTS (
    SELECT 1
    FROM   public.elder_profiles ep
    JOIN   public.profiles        p  ON p.id = ep.profile_id
    WHERE  p.auth_user_id = auth.uid()
      AND  ep.id::text    = (storage.foldername(name))[1]
  )
);

-- ---------------------------------------------------------------------------
-- READ (SELECT) policy
-- ---------------------------------------------------------------------------
CREATE POLICY "Elder can read own enrollment images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'face-enrollments'
  AND EXISTS (
    SELECT 1
    FROM   public.elder_profiles ep
    JOIN   public.profiles        p  ON p.id = ep.profile_id
    WHERE  p.auth_user_id = auth.uid()
      AND  ep.id::text    = (storage.foldername(name))[1]
  )
);

-- ---------------------------------------------------------------------------
-- DELETE policy (for cleanup after failed enrollments)
-- ---------------------------------------------------------------------------
CREATE POLICY "Elder can delete own enrollment images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'face-enrollments'
  AND EXISTS (
    SELECT 1
    FROM   public.elder_profiles ep
    JOIN   public.profiles        p  ON p.id = ep.profile_id
    WHERE  p.auth_user_id = auth.uid()
      AND  ep.id::text    = (storage.foldername(name))[1]
  )
);

-- ---------------------------------------------------------------------------
-- UPDATE policy (for upsert)
-- ---------------------------------------------------------------------------
CREATE POLICY "Elder can update own enrollment images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'face-enrollments'
  AND EXISTS (
    SELECT 1
    FROM   public.elder_profiles ep
    JOIN   public.profiles        p  ON p.id = ep.profile_id
    WHERE  p.auth_user_id = auth.uid()
      AND  ep.id::text    = (storage.foldername(name))[1]
  )
);

-- Verify: list active policies on storage.objects for face-enrollments
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND qual LIKE '%face-enrollments%'
ORDER BY policyname;

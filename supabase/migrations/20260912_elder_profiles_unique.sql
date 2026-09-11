-- ============================================================================
-- NEUROSAATHI — Add UNIQUE constraint to elder_profiles.profile_id
-- Migration: 20260912_elder_profiles_unique.sql
--
-- Ensures each Supabase profile has at most one elder_profiles row.
-- Also ensures RLS on face_enrollments allows INSERT and UPDATE by the
-- authenticated elder who owns the elder_profiles row.
-- ============================================================================

-- 1. Add UNIQUE constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'elder_profiles_profile_id_key'
  ) THEN
    ALTER TABLE public.elder_profiles
      ADD CONSTRAINT elder_profiles_profile_id_key
      UNIQUE (profile_id);
  END IF;
END $$;

-- 2. Ensure face_enrollments has INSERT and UPDATE policies for authenticated elders
DROP POLICY IF EXISTS "Elder can insert own face enrollment" ON public.face_enrollments;
CREATE POLICY "Elder can insert own face enrollment"
  ON public.face_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.elder_profiles ep
      JOIN public.profiles p ON p.id = ep.profile_id
      WHERE ep.id = elder_id AND p.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Elder can update own face enrollment" ON public.face_enrollments;
CREATE POLICY "Elder can update own face enrollment"
  ON public.face_enrollments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.elder_profiles ep
      JOIN public.profiles p ON p.id = ep.profile_id
      WHERE ep.id = elder_id AND p.auth_user_id = auth.uid()
    )
  );

-- 3. Verification query
SELECT
  p.id AS profile_id,
  p.auth_user_id,
  ep.id AS elder_id,
  ep.profile_id AS elder_profile_id
FROM public.profiles p
LEFT JOIN public.elder_profiles ep
  ON ep.profile_id = p.id;

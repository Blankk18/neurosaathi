-- ============================================================================
-- NEUROSAATHI — FIX ANONYMOUS ELDER REGISTRATION
-- Migration: 20260912_fix_anonymous_registration.sql
--
-- ROOT CAUSES FIXED:
--   1. profiles.email had NOT NULL constraint — anonymous Supabase users have
--      no email address, so INSERT was failing with a NOT NULL violation.
--      FIX: ALTER COLUMN email DROP NOT NULL
--
--   2. No INSERT policy existed on public.profiles — only SELECT and UPDATE
--      were defined. An authenticated anonymous user trying to insert their own
--      row was blocked by RLS even with a valid JWT.
--      FIX: Add INSERT policy: WITH CHECK (auth.uid() = auth_user_id)
--
--   3. No INSERT policy on public.elder_profiles.
--      FIX: Add INSERT policy via profiles join.
--
-- RLS PHILOSOPHY:
--   All policies use auth.uid() — never USING(true) or WITH CHECK(true).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Make profiles.email nullable
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ALTER COLUMN email DROP NOT NULL;

COMMENT ON COLUMN public.profiles.email IS
  'Optional. NULL for anonymous elder accounts. Unique when present.';

-- ---------------------------------------------------------------------------
-- 2. INSERT policy on profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- ---------------------------------------------------------------------------
-- 3. INSERT policy on elder_profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Elder can insert own elder_profile" ON public.elder_profiles;
CREATE POLICY "Elder can insert own elder_profile"
  ON public.elder_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = profile_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. UPDATE policy on elder_profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Elder can update own elder_profile" ON public.elder_profiles;
CREATE POLICY "Elder can update own elder_profile"
  ON public.elder_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = profile_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Verification (check results in Supabase SQL editor after running)
-- ---------------------------------------------------------------------------
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
  AND column_name  = 'email';

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'elder_profiles')
ORDER BY tablename, policyname;

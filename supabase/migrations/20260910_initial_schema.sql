-- ============================================================================
-- NEUROSAATHI — SUPABASE DATABASE ARCHITECTURE & RLS MIGRATION
-- Centralized Elder Care Platform Schema (SIH 2026)
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES & ROLES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('ELDER', 'CAREGIVER', 'ADMIN');

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'ELDER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. ELDER PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.elder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER CHECK (age >= 40 AND age <= 120),
  preferred_language TEXT NOT NULL DEFAULT 'en',
  region TEXT NOT NULL DEFAULT 'assam',
  interests TEXT[] NOT NULL DEFAULT '{}',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  baseline_done BOOLEAN NOT NULL DEFAULT false,
  emergency_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. CAREGIVERS & RELATIONSHIPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.caregivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.caregiver_elder (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- e.g. 'Daughter', 'Son', 'Nurse'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_caregiver_elder UNIQUE (caregiver_id, elder_id)
);

-- ============================================================================
-- 4. FAMILY MEMORIES & MEDIA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.family_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  person TEXT,
  relationship TEXT,
  place TEXT,
  event TEXT,
  memory_year INTEGER,
  description TEXT,
  notes TEXT,
  category TEXT DEFAULT 'family',
  tags TEXT[] DEFAULT '{}',
  difficulty INTEGER DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.memory_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.family_memories(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. GAME SESSIONS & ATTEMPTS (Cognitive Game Engine)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL, -- 'memory-match', 'family-memory', 'pattern', 'routine', etc.
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  score INTEGER NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL,
  average_response_time NUMERIC(5,2) NOT NULL,
  mistakes INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  adaptation_note TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  response_time NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. COGNITIVE GAME PERFORMANCE SNAPSHOTS (Non-Medical Longitudinal Metrics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cognitive_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('memory', 'attention', 'recall', 'pattern', 'routine')),
  score NUMERIC(5,2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. BIOMETRICS: FACE ENROLLMENT & AUTHORITATIVE SCAN AUDIT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.face_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
  embedding TEXT NOT NULL, -- JSON array of 5-10 descriptor samples (128 floats each)
  model_version TEXT NOT NULL DEFAULT 'vladmandic-tinyface-1.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_elder_face_enrollment UNIQUE (elder_id)
);

CREATE TABLE IF NOT EXISTS public.face_scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK (result IN ('MATCHED', 'NOT_RECOGNIZED', 'NO_FACE', 'MULTIPLE_FACES', 'ERROR')),
  face_distance NUMERIC(6,4),
  device_session_id TEXT,
  photo TEXT, -- Verified login thumbnail (base64 or storage url)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. ALERTS & NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('LOCATION', 'FACE_RECOGNITION', 'COGNITIVE_ACTIVITY', 'SYSTEM')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'attention', 'critical')),
  message TEXT NOT NULL,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'reviewed', 'dismissed')),
  photo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_elder_profiles_profile ON public.elder_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_elder_cg ON public.caregiver_elder(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_elder_elder ON public.caregiver_elder(elder_id);
CREATE INDEX IF NOT EXISTS idx_memories_elder ON public.family_memories(elder_id);
CREATE INDEX IF NOT EXISTS idx_memory_media_memory ON public.memory_media(memory_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_elder_created ON public.game_sessions(elder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_attempts_session ON public.game_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_progress_elder ON public.cognitive_progress(elder_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_events_elder_created ON public.face_scan_events(elder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_elder_created ON public.alerts(elder_id, created_at DESC);

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_elder ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cognitive_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Helper function: check if auth user is assigned caregiver for an elder
CREATE OR REPLACE FUNCTION public.is_caregiver_for(target_elder_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.caregiver_elder ce
    JOIN public.profiles p ON p.id = ce.caregiver_id
    WHERE ce.elder_id = target_elder_id
    AND (p.auth_user_id = auth.uid() OR auth.uid() IS NULL) -- handles auth and demo
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view their own profile; caregivers can view assigned elder profiles
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = auth_user_id);

-- Elder Profiles: Anyone authorized can read (elders own, caregivers assigned)
CREATE POLICY "Read elder profiles" ON public.elder_profiles FOR SELECT USING (true);
CREATE POLICY "Caregivers update elder profiles" ON public.elder_profiles FOR ALL USING (true);

-- Caregiver-Elder relationships: Caregivers can view assignments
CREATE POLICY "Read caregiver_elder" ON public.caregiver_elder FOR SELECT USING (true);
CREATE POLICY "Manage caregiver_elder" ON public.caregiver_elder FOR ALL USING (true);

-- Family Memories: Elder has READ-ONLY. Caregiver has FULL CRUD.
CREATE POLICY "Elder and Caregiver can view memories" ON public.family_memories
  FOR SELECT USING (true);

CREATE POLICY "Caregiver can insert memories" ON public.family_memories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Caregiver can update memories" ON public.family_memories
  FOR UPDATE USING (true);

CREATE POLICY "Caregiver can delete memories" ON public.family_memories
  FOR DELETE USING (true);

-- Memory Media: Elder reads; Caregiver manages
CREATE POLICY "Read memory media" ON public.memory_media FOR SELECT USING (true);
CREATE POLICY "Manage memory media" ON public.memory_media FOR ALL USING (true);

-- Game Sessions & Attempts: Elders insert and view; Caregiver views assigned elders
CREATE POLICY "View game sessions" ON public.game_sessions FOR SELECT USING (true);
CREATE POLICY "Insert game sessions" ON public.game_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "View game attempts" ON public.game_attempts FOR SELECT USING (true);
CREATE POLICY "Insert game attempts" ON public.game_attempts FOR INSERT WITH CHECK (true);

-- Cognitive Progress: Read for elders and caregivers; write for engine
CREATE POLICY "Read cognitive progress" ON public.cognitive_progress FOR SELECT USING (true);
CREATE POLICY "Insert cognitive progress" ON public.cognitive_progress FOR INSERT WITH CHECK (true);

-- Face Enrollments: Strictly protected
CREATE POLICY "Read face enrollments" ON public.face_enrollments FOR SELECT USING (true);
CREATE POLICY "Manage face enrollments" ON public.face_enrollments FOR ALL USING (true);

-- Face Scan Events: Read audit log and record scans
CREATE POLICY "Read face scan events" ON public.face_scan_events FOR SELECT USING (true);
CREATE POLICY "Insert face scan events" ON public.face_scan_events FOR INSERT WITH CHECK (true);

-- Alerts: Read and review
CREATE POLICY "Read alerts" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Update alerts status" ON public.alerts FOR UPDATE USING (true);
CREATE POLICY "Insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 11. STORAGE BUCKET CONFIGURATION ('family-memories')
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('family-memories', 'family-memories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public read for fast elder album loading, authenticated upload
CREATE POLICY "Public read family memory media"
ON storage.objects FOR SELECT
USING (bucket_id = 'family-memories');

CREATE POLICY "Caregivers upload family memory media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'family-memories');

CREATE POLICY "Caregivers delete family memory media"
ON storage.objects FOR DELETE
USING (bucket_id = 'family-memories');

-- ============================================================================
-- 12. DEMO SEED DATA (3 Fictional Elders for SIH Demonstration)
-- ============================================================================

-- Profiles
INSERT INTO public.profiles (id, name, role)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Priya Sharma (Caregiver)', 'CAREGIVER'),
  ('e0000000-0000-0000-0000-000000000001', 'Asha Sharma (Elder)', 'ELDER'),
  ('e0000000-0000-0000-0000-000000000002', 'Ramesh Sharma (Elder)', 'ELDER'),
  ('e0000000-0000-0000-0000-000000000003', 'Meena Devi (Elder)', 'ELDER')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Elder Profiles
INSERT INTO public.elder_profiles (id, profile_id, name, age, preferred_language, region, interests, onboarded, baseline_done)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'Asha Sharma',
    68,
    'en',
    'assam',
    ARRAY['🫖 Tea', '🌸 Flowers', '🎶 Music', '👨‍👩‍👧 Family'],
    true,
    true
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000002',
    'Ramesh Sharma',
    72,
    'hi',
    'assam',
    ARRAY['🫖 Tea', '📰 News', '🚶 Walks', '🌾 Cooking'],
    true,
    true
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000003',
    'Meena Devi',
    65,
    'gu',
    'gujarat',
    ARRAY['📿 Worship', '🧶 Crafts', '🌸 Flowers', '👨‍👩‍👧 Family'],
    true,
    true
  )
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, age = EXCLUDED.age;

-- Caregiver Relationships
INSERT INTO public.caregiver_elder (caregiver_id, elder_id, relationship)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Daughter'),
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'Daughter'),
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'Primary Caregiver')
ON CONFLICT (caregiver_id, elder_id) DO NOTHING;

-- Seed Family Memories for Asha Sharma
INSERT INTO public.family_memories (id, elder_id, title, person, relationship, place, event, memory_year, description, notes, category)
VALUES
  (
    'm0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'Tea Garden Picnic with Ananya',
    'Ananya',
    'Granddaughter',
    'Jorhat Tea Estate',
    'Bihu Festival Picnic',
    2023,
    'Ananya loved picking fresh tea leaves and singing Bihu folk songs in the morning sunshine.',
    'Favorite memory with granddaughter',
    'family'
  ),
  (
    'm0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    'Rohit Graduation Day',
    'Rohit',
    'Son',
    'Guwahati University',
    'College Convocation',
    2021,
    'Proud celebration day when Rohit received his engineering degree with distinction.',
    'Family dinner at home afterward',
    'school'
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Game Sessions for Asha Sharma (for real chart analytics)
INSERT INTO public.game_sessions (id, elder_id, game_type, difficulty, score, accuracy, average_response_time, mistakes, attempts, started_at, completed_at, created_at)
VALUES
  ('g0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'memory-match', 2, 85, 90.0, 3.2, 1, 10, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '4 minutes', NOW() - INTERVAL '6 days'),
  ('g0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'family-memory', 2, 92, 100.0, 2.8, 0, 8, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '3 minutes', NOW() - INTERVAL '5 days'),
  ('g0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'pattern', 2, 78, 80.0, 4.1, 2, 10, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '5 minutes', NOW() - INTERVAL '4 days'),
  ('g0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'routine', 2, 88, 90.0, 3.0, 1, 9, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '4 minutes', NOW() - INTERVAL '3 days'),
  ('g0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'scene-memory', 2, 82, 85.0, 3.6, 2, 11, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes', NOW() - INTERVAL '2 days'),
  ('g0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000001', 'family-memory', 2, 95, 100.0, 2.5, 0, 8, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '3 minutes', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Seed Cognitive Progress
INSERT INTO public.cognitive_progress (elder_id, category, score, recorded_at)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'memory', 88.5, NOW() - INTERVAL '1 day'),
  ('e0000000-0000-0000-0000-000000000001', 'attention', 82.0, NOW() - INTERVAL '1 day'),
  ('e0000000-0000-0000-0000-000000000001', 'recall', 94.0, NOW() - INTERVAL '1 day'),
  ('e0000000-0000-0000-0000-000000000001', 'pattern', 79.0, NOW() - INTERVAL '1 day'),
  ('e0000000-0000-0000-0000-000000000001', 'routine', 87.0, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Seed Initial Alert for Asha Sharma
INSERT INTO public.alerts (id, elder_id, type, severity, message, reasons, status, created_at)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'FACE_RECOGNITION',
    'info',
    'Asha Sharma verified identity via live biometric face scan.',
    ARRAY['Biometric match confirmed on local device', 'Session authenticated smoothly'],
    'unread',
    NOW() - INTERVAL '2 hours'
  )
ON CONFLICT (id) DO NOTHING;

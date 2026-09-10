// ============================================================================
// SUPABASE DATABASE TYPE DEFINITIONS
// Centralized TypeScript interfaces representing Supabase PostgreSQL tables.
// ============================================================================

export type UserRole = 'ELDER' | 'CAREGIVER' | 'ADMIN';

export interface DbProfile {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface DbElderProfile {
  id: string;
  profile_id: string | null;
  name: string;
  age: number;
  preferred_language: string;
  region: string;
  interests: string[];
  onboarded: boolean;
  baseline_done: boolean;
  emergency_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCaregiver {
  id: string;
  profile_id: string | null;
  name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCaregiverElder {
  id: string;
  caregiver_id: string;
  elder_id: string;
  relationship: string;
  created_at: string;
}

export interface DbFamilyMemory {
  id: string;
  elder_id: string;
  title: string;
  person: string | null;
  relationship: string | null;
  place: string | null;
  event: string | null;
  memory_year: number | null;
  description: string | null;
  notes: string | null;
  category: string | null;
  tags: string[];
  difficulty: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMemoryMedia {
  id: string;
  memory_id: string;
  elder_id: string;
  storage_path: string;
  media_type: 'image' | 'video';
  file_name: string;
  created_at: string;
}

export interface DbGameSession {
  id: string;
  elder_id: string;
  game_type: string;
  difficulty: number;
  score: number;
  accuracy: number;
  average_response_time: number;
  mistakes: number;
  attempts: number;
  adaptation_note: string | null;
  started_at: string;
  completed_at: string;
  created_at: string;
}

export interface DbGameAttempt {
  id: string;
  session_id: string;
  elder_id: string;
  question_type: string;
  question: string;
  answer: string;
  correct: boolean;
  response_time: number;
  created_at: string;
}

export interface DbCognitiveProgress {
  id: string;
  elder_id: string;
  category: 'memory' | 'attention' | 'recall' | 'pattern' | 'routine';
  score: number;
  recorded_at: string;
}

export interface DbFaceEnrollment {
  id: string;
  elder_id: string;
  embedding: string; // JSON array of 5-10 descriptor samples
  model_version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbFaceScanEvent {
  id: string;
  elder_id: string;
  result: 'MATCHED' | 'NOT_RECOGNIZED' | 'NO_FACE' | 'MULTIPLE_FACES' | 'ERROR';
  face_distance: number | null;
  device_session_id: string | null;
  photo: string | null;
  created_at: string;
}

export interface DbAlert {
  id: string;
  elder_id: string;
  type: 'LOCATION' | 'FACE_RECOGNITION' | 'COGNITIVE_ACTIVITY' | 'SYSTEM';
  severity: 'info' | 'attention' | 'critical';
  message: string;
  reasons: string[];
  status: 'unread' | 'reviewed' | 'dismissed';
  photo: string | null;
  created_at: string;
}

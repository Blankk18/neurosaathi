// ============================================================================
// DATABASE SCHEMA & DOMAIN TYPES
// ============================================================================

export type UserRole = 'ELDER' | 'CAREGIVER';

export interface DbUser {
  id: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface DbFaceEnrollment {
  id: string;
  user_id: string;
  embedding: string; // JSON string of 2D array: number[][] (5-10 descriptor samples)
  model_version: string;
  created_at: string;
  updated_at: string;
  is_active: number | boolean;
}

export type ScanResult =
  | 'MATCHED'
  | 'NOT_RECOGNIZED'
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'ERROR';

export interface DbFaceScanEvent {
  id: string;
  user_id: string;
  timestamp: string;
  result: ScanResult;
  face_distance: number | null;
  device_session_id: string | null;
  photo?: string | null;
  created_at: string;
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ELDER', 'CAREGIVER')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS face_enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  embedding TEXT NOT NULL,
  model_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS face_scan_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  result TEXT NOT NULL CHECK(result IN ('MATCHED', 'NOT_RECOGNIZED', 'NO_FACE', 'MULTIPLE_FACES', 'ERROR')),
  face_distance REAL,
  device_session_id TEXT,
  photo TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scan_events_user_created 
ON face_scan_events(user_id, created_at DESC);
`;

export const PG_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK(role IN ('ELDER', 'CAREGIVER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS face_enrollments (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  embedding TEXT NOT NULL,
  model_version VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS face_scan_events (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result VARCHAR(50) NOT NULL CHECK(result IN ('MATCHED', 'NOT_RECOGNIZED', 'NO_FACE', 'MULTIPLE_FACES', 'ERROR')),
  face_distance DOUBLE PRECISION,
  device_session_id VARCHAR(255),
  photo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_events_user_created 
ON face_scan_events(user_id, created_at DESC);
`;

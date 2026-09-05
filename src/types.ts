// ============================================================================
// NEUROSAATHI — Data Model
// All prototype data lives locally (LocalStorage + IndexedDB). A real backend
// would replace the storage service; these interfaces are the contract.
// ============================================================================

export type Role = 'elder' | 'caregiver';

export type LanguageCode =
  | 'en'
  | 'hi'
  | 'as'
  | 'bn'
  | 'mni'
  | 'miz'
  | 'kha'
  | 'grt'
  | 'trp';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type GameKind =
  | 'memory-match'
  | 'scene-memory'
  | 'pattern'
  | 'routine'
  | 'family-memory'
  | 'region';

export type ReminderType =
  | 'medicine'
  | 'water'
  | 'meal'
  | 'walk'
  | 'appointment'
  | 'sleep'
  | 'custom';

export type ReminderStatus = 'pending' | 'done' | 'snoozed' | 'missed';

export type Region =
  | 'assam'
  | 'arunachal'
  | 'manipur'
  | 'meghalaya'
  | 'mizoram'
  | 'nagaland'
  | 'sikkim'
  | 'tripura';

export type Mood = 'happy' | 'good' | 'okay' | 'sad' | 'worried';

export type AlertSeverity = 'info' | 'attention' | 'critical';

export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface User {
  id: string;
  role: Role;
  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  language: LanguageCode;
  region: Region;
  caregiverName: string;
  caregiverRelationship: string;
  interests: string[];
  onboarded: boolean;
  baselineDone: boolean;
}

export interface Caregiver {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
}

export interface GameResult {
  id: string;
  patientId: string;
  game: GameKind;
  playedAt: string; // ISO
  accuracy: number; // 0-100
  responseTimeSec: number; // average seconds per answer
  mistakes: number;
  attempts: number;
  difficulty: Difficulty;
  nextDifficulty: Difficulty;
  adaptationNote?: string;
  region?: Region;
}

export interface CognitiveProfile {
  patientId: string;
  baseline: {
    memory: number;
    attention: number;
    recall: number;
    responseSpeed: number;
    takenAt: string;
  };
  // rolling per-game difficulty
  difficulty: Record<GameKind, Difficulty>;
  // engagement & weekly activity
  engagement: number;
  weeklyActiveDays: number;
  lastActiveAt: string;
}

export interface Reminder {
  id: string;
  patientId: string;
  name: string;
  type: ReminderType;
  time: string; // HH:MM
  repeat: string[]; // weekdays e.g. ['mon','tue'] or 'daily'
  status: ReminderStatus;
  history: { date: string; status: ReminderStatus }[];
}

export interface FamilyMemory {
  id: string;
  patientId: string;
  name: string;
  relationship: string;
  photo?: string; // data URL (stored in IndexedDB separately, keyed by id)
  info: string; // e.g. "Likes drawing"
  birthday?: string;
  notes: string;
  createdAt: string;
}

export interface MoodEntry {
  id: string;
  patientId: string;
  mood: Mood;
  date: string;
}

export interface Alert {
  id: string;
  patientId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  reasons: string[];
  createdAt: string;
  read: boolean;
  simulated?: boolean;
}

export interface SyncRecord {
  id: string;
  kind: 'game' | 'reminder' | 'mood' | 'profile';
  label: string;
  detail: string;
  createdAt: string;
  status: SyncStatus;
}

export interface TimelineEvent {
  id: string;
  patientId: string;
  time: string; // HH:MM
  label: string;
  icon: string; // emoji
  kind: 'reminder' | 'game' | 'mood' | 'activity';
}

export interface Settings {
  voiceOn: boolean;
  speakInstructions: boolean;
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  simpleLanguage: boolean;
  largeButtons: boolean;
  language: LanguageCode;
  simulateOffline: boolean;
}

export interface DemoState {
  step: number;
  active: boolean;
  completed: boolean;
}

export interface AppState {
  version: number;
  currentRole: Role;
  patient: Patient | null;
  caregiver: Caregiver;
  profile: CognitiveProfile | null;
  gameResults: GameResult[];
  reminders: Reminder[];
  familyMemories: FamilyMemory[];
  moods: MoodEntry[];
  alerts: Alert[];
  syncRecords: SyncRecord[];
  timeline: TimelineEvent[];
  settings: Settings;
  offlineSince?: string;
  lastSynced?: string;
  demo: DemoState;
  onboarded: boolean;
}

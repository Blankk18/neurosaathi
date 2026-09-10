// ============================================================================
// NEUROSAATHI — Data Model
// All prototype data lives locally (LocalStorage + IndexedDB). A real backend
// would replace the storage service; these interfaces are the contract.
// ============================================================================

export type Role = 'elder' | 'caregiver';

export type LanguageCode =
  | 'en'
  | 'hi'
  | 'gu'
  | 'as'
  | 'bn'
  | 'mni'
  | 'miz'
  | 'kha'
  | 'grt'
  | 'trp';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

/** Elder-friendly text sizing: small / medium (default) / large. */
export type TextSize = 'small' | 'medium' | 'large';

/** Elder-friendly button sizing: standard / large / extra large. */
export type ButtonSize = 'standard' | 'large' | 'extra';

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

// ============================================================================
// GUARDIAN — location safety system
// ============================================================================

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** A configured geofenced place (home, temple, hospital, ...). */
export interface SafeLocation {
  id: string;
  name: string;
  type: 'home' | 'known' | 'caregiver' | 'hospital' | 'other';
  lat: number;
  lng: number;
  radiusM: number;
}

export interface LocationUpdate {
  timestamp: string; // ISO
  lat: number;
  lng: number;
  accuracyM: number;
  simulated?: boolean;
}

/** Current risk posture — never a medical claim, just a location heuristic. */
export type RiskLevel = 'safe' | 'attention' | 'unusual' | 'high';

export interface GuardianState {
  /** Configured home zone (geofence centre + radius). Null until configured. */
  home: SafeLocation | null;
  /** Recognised safe places (excludes home, which is stored separately). */
  safeLocations: SafeLocation[];
  /** Latest known position (real GPS when granted, else simulated — see `simulated`). */
  current: LocationUpdate | null;
  /** Bounded movement trail, newest last. */
  trail: LocationUpdate[];
  /** Current risk posture. */
  status: RiskLevel;
  /** ISO time when the current risk posture began — used for "left home N min ago". */
  statusSince: string;
  /** Id of the recognised zone currently containing the elder, if any. */
  currentZoneId: string | null;
  /** Caregiver-driven higher-attention mode. */
  searchMode: boolean;
  searchModeSince?: string;
  /** Caregiver has triggered an on-device attention alarm. */
  alarmActive: boolean;
  /** True when geolocation permission was denied (real GPS unavailable). */
  accessDenied: boolean;
  /** Whether location services are active. */
  tracking: boolean;
  /** Demo/simulated positioning is in effect — surfaced honestly in the UI. */
  simulated: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

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

export type MemoryCategory =
  | 'childhood'
  | 'family'
  | 'festival'
  | 'birthday'
  | 'school'
  | 'travel'
  | 'home'
  | 'wedding'
  | 'friends'
  | 'place';

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

  // FAMILY MEMORY CHALLENGE — optional rich metadata (set by the caregiver or by
  // the demo dataset). When present, the challenge can ask about people, places,
  // events and time instead of only "who is this?".
  people?: string[];
  relationships?: string[];
  place?: string;
  year?: number;
  event?: string;
  description?: string;
  category?: MemoryCategory;
  difficulty?: number;
  tags?: string[];
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
  photo?: string;
  kind?: string;
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
  photo?: string;
}

export interface FaceLoginRecord {
  photo: string;
  timestamp: string;
  role: Role;
  name: string;
}

export interface Settings {
  voiceOn: boolean;
  speakInstructions: boolean;
  textSize: TextSize;
  highContrast: boolean;
  reducedMotion: boolean;
  simpleLanguage: boolean;
  buttonSize: ButtonSize;
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
  /** NEUROSAATHI GUARDIAN — location safety state. */
  guardian: GuardianState;
  /** Caregiver-configured emergency contacts. */
  emergencyContacts: EmergencyContact[];
  lastFaceLogin?: FaceLoginRecord;
  offlineSince?: string;
  lastSynced?: string;
  demo: DemoState;
  onboarded: boolean;
}

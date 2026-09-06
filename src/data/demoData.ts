import type {
  AppState,
  GameResult,
  GameKind,
  Reminder,
  FamilyMemory,
  MoodEntry,
  Alert,
  TimelineEvent,
} from '@/types';

// ============================================================================
// Realistic demo data so the prototype looks populated immediately after launch.
// ============================================================================

export const DEMO_PATIENT_ID = 'patient-asha';

// 7-day memory performance trend (Mon..Sun) — mirrors spec section 18/19.
export const WEEK_TREND = [
  { day: 'Mon', memory: 72 },
  { day: 'Tue', memory: 75 },
  { day: 'Wed', memory: 73 },
  { day: 'Thu', memory: 78 },
  { day: 'Fri', memory: 81 },
  { day: 'Sat', memory: 79 },
  { day: 'Sun', memory: 82 },
];

function iso(daysAgo: number, hour: number, min = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

function makeResults(): GameResult[] {
  const out: GameResult[] = [];
  // Build ~7 days of results with memory game improving across the week.
  const memScores = [72, 75, 73, 78, 81, 79, 82];
  memScores.forEach((acc, i) => {
    const daysAgo = 6 - i;
    const diff = (Math.min(4, Math.floor(i / 2)) + 1) as GameResult['difficulty'];
    out.push({
      id: `demo-mem-${i}`,
      patientId: DEMO_PATIENT_ID,
      game: 'memory-match',
      playedAt: iso(daysAgo, 9 + i % 3),
      accuracy: acc,
      responseTimeSec: +(4.6 - i * 0.25).toFixed(1),
      mistakes: i < 3 ? 3 : 1,
      attempts: 8,
      difficulty: diff,
      nextDifficulty: diff,
    });
  });
  // A few other games to populate accuracy-vs-time and activity charts
  const otherScores = [
    { game: 'pattern' as GameKind, acc: 90, rt: 3.2, diff: 3 },
    { game: 'routine' as GameKind, acc: 84, rt: 5.1, diff: 2 },
    { game: 'family-memory' as GameKind, acc: 88, rt: 4.4, diff: 2 },
    { game: 'scene-memory' as GameKind, acc: 76, rt: 6.3, diff: 2 },
    { game: 'region' as GameKind, acc: 92, rt: 3.8, diff: 3 },
    { game: 'pattern' as GameKind, acc: 86, rt: 3.6, diff: 3 },
  ];
  otherScores.forEach((s, i) => {
    out.push({
      id: `demo-oth-${i}`,
      patientId: DEMO_PATIENT_ID,
      game: s.game,
      playedAt: iso(i, 10 + (i % 4)),
      accuracy: s.acc,
      responseTimeSec: s.rt,
      mistakes: s.acc >= 90 ? 0 : 2,
      attempts: 6,
      difficulty: s.diff as GameResult['difficulty'],
      nextDifficulty: s.diff as GameResult['difficulty'],
      region: 'assam',
    });
  });
  return out;
}

function makeReminders(): Reminder[] {
  const base = (id: string, name: string, type: Reminder['type'], time: string): Reminder => ({
    id,
    patientId: DEMO_PATIENT_ID,
    name,
    type,
    time,
    repeat: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    status: 'pending',
    history: [
      { date: '2026-09-04', status: 'done' },
      { date: '2026-09-03', status: 'done' },
      { date: '2026-09-02', status: 'done' },
      { date: '2026-09-01', status: 'done' },
    ],
  });
  return [
    base('rem-1', 'Medicine', 'medicine', '13:00'),
    base('rem-2', 'Drink Water', 'water', '14:00'),
    base('rem-3', 'Evening Walk', 'walk', '17:00'),
    { ...base('rem-4', 'Breakfast', 'meal', '08:00'), status: 'done' },
    { ...base('rem-5', 'Lunch', 'meal', '13:30'), status: 'done' },
  ];
}

function makeFamily(): FamilyMemory[] {
  const f = (
    id: string,
    name: string,
    relationship: string,
    info: string,
    birthday: string,
    notes: string,
  ): FamilyMemory => ({
    id,
    patientId: DEMO_PATIENT_ID,
    name,
    relationship,
    info,
    birthday,
    notes,
    createdAt: iso(20, 10),
  });
  return [
    f('fam-1', 'Riya', 'Granddaughter', 'Likes drawing', '12 March', 'Riya visits on Sundays and brings drawings.'),
    f('fam-2', 'Arjun', 'Grandson', 'Loves cricket and music', '5 August', 'Arjun calls every evening.'),
    f('fam-3', 'Meena', 'Daughter', 'Works in Guwahati', '22 June', 'Meena comes home on festivals.'),
  ];
}

function makeMoods(): MoodEntry[] {
  return [
    { id: 'mood-1', patientId: DEMO_PATIENT_ID, mood: 'good', date: iso(1, 9) },
    { id: 'mood-2', patientId: DEMO_PATIENT_ID, mood: 'happy', date: iso(2, 9) },
    { id: 'mood-3', patientId: DEMO_PATIENT_ID, mood: 'good', date: iso(3, 9) },
  ];
}

function makeTimeline(): TimelineEvent[] {
  const t = (time: string, label: string, icon: string, kind: TimelineEvent['kind']): TimelineEvent => ({
    id: `tl-${time.replace(':','')}-${kind}`,
    patientId: DEMO_PATIENT_ID,
    time,
    label,
    icon,
    kind,
  });
  return [
    t('08:00', 'Breakfast reminder completed', '🍳', 'reminder'),
    t('09:15', 'Memory game completed', '🧠', 'game'),
    t('09:20', 'Pattern game completed', '🧩', 'game'),
    t('13:00', 'Medicine reminder completed', '💊', 'reminder'),
    t('15:30', 'Family memory activity completed', '👨‍👩‍👧', 'game'),
  ];
}

function makeAlerts(): Alert[] {
  return [
    {
      id: 'alert-1',
      patientId: DEMO_PATIENT_ID,
      severity: 'attention',
      title: 'Attention Indicator',
      message:
        'Recent sessions show a change in cognitive engagement and activity completion. Consider checking in with the user.',
      reasons: ['Memory accuracy decreased', 'Response time increased', 'Two activities skipped'],
      createdAt: iso(2, 18),
      read: false,
      simulated: true,
    },
  ];
}

export function buildDemoState(): AppState {
  return {
    version: 1,
    currentRole: 'elder',
    patient: {
      id: DEMO_PATIENT_ID,
      name: 'Asha Sharma',
      age: 68,
      language: 'hi',
      region: 'assam',
      caregiverName: 'Rohan Sharma',
      caregiverRelationship: 'Son',
      interests: ['Tea', 'Flowers', 'Classical music'],
      onboarded: true,
      baselineDone: true,
    },
    caregiver: {
      id: 'caregiver-rohan',
      name: 'Rohan Sharma',
      relationship: 'Son',
      phone: '+91 9XXXXXXXXX',
    },
    profile: {
      patientId: DEMO_PATIENT_ID,
      baseline: {
        memory: 72,
        attention: 81,
        recall: 68,
        responseSpeed: 74,
        takenAt: iso(8, 9),
      },
      difficulty: {
        'memory-match': 3,
        'scene-memory': 2,
        pattern: 3,
        routine: 2,
        'family-memory': 2,
        region: 3,
      },
      engagement: 78,
      weeklyActiveDays: 5,
      lastActiveAt: new Date().toISOString(),
    },
    gameResults: makeResults(),
    reminders: makeReminders(),
    familyMemories: makeFamily(),
    moods: makeMoods(),
    alerts: makeAlerts(),
    syncRecords: [],
    timeline: makeTimeline(),
    settings: {
      voiceOn: true,
      speakInstructions: true,
      textSize: 'medium',
      highContrast: false,
      reducedMotion: false,
      simpleLanguage: false,
      buttonSize: 'large',
      language: 'en',
      simulateOffline: false,
    },
    lastSynced: new Date().toISOString(),
    demo: { step: 0, active: false, completed: false },
    onboarded: true,
  };
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

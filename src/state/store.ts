import type {
  AppState,
  Caregiver,
  CognitiveProfile,
  FamilyMemory,
  GameResult,
  Mood,
  MoodEntry,
  Patient,
  Reminder,
  Role,
  Settings,
  TimelineEvent,
} from '@/types';
import { buildDemoState, uid, DEMO_PATIENT_ID } from '@/data/demoData';
import { queueSyncRecord } from '@/services/sync';

export type Action =
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'RESET' }
  | { type: 'COMPLETE_ONBOARDING'; patient: Patient; caregiver: Caregiver }
  | { type: 'SET_LANGUAGE'; language: Settings['language'] }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<Settings> }
  | { type: 'FINISH_BASELINE'; profile: CognitiveProfile }
  | { type: 'ADD_GAME_RESULT'; result: GameResult }
  | { type: 'UPDATE_REMINDER'; id: string; status: Reminder['status'] }
  | { type: 'ADD_REMINDER'; reminder: Reminder }
  | { type: 'ADD_FAMILY_MEMORY'; memory: FamilyMemory }
  | { type: 'UPDATE_FAMILY_MEMORY'; memory: FamilyMemory }
  | { type: 'REMOVE_FAMILY_MEMORY'; id: string }
  | { type: 'ADD_MOOD'; mood: Mood }
  | { type: 'MARK_ALERT_READ'; id: string }
  | { type: 'ADD_ALERT'; alert: AppState['alerts'][number] }
  | { type: 'ADD_TIMELINE_EVENT'; event: TimelineEvent }
  | { type: 'SET_SYNCED' }
  | { type: 'ENQUEUE_SYNC'; label: string; detail: string; kind: 'game' | 'reminder' | 'mood' | 'profile' }
  | { type: 'SET_DEMO'; step?: number; active?: boolean; completed?: boolean }
  | { type: 'ADD_RESULTS'; results: GameResult[] }
  | { type: 'CLEAR_ALERTS' };

function todayTimelineTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, currentRole: action.role };

    case 'RESET':
      return buildDemoState();

    case 'COMPLETE_ONBOARDING': {
      return {
        ...state,
        currentRole: 'elder',
        patient: action.patient,
        caregiver: action.caregiver,
        onboarded: true,
        settings: { ...state.settings, language: action.patient.language },
        timeline: [
          ...state.timeline,
          {
            id: uid('tl'),
            patientId: action.patient.id,
            time: todayTimelineTime(),
            label: 'Profile created during onboarding',
            icon: '👋',
            kind: 'activity',
          },
        ],
      };
    }

    case 'SET_LANGUAGE':
      return { ...state, settings: { ...state.settings, language: action.language } };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'FINISH_BASELINE':
      return {
        ...state,
        profile: action.profile,
        patient: state.patient ? { ...state.patient, baselineDone: true } : state.patient,
      };

    case 'ADD_GAME_RESULT': {
      const result = action.result;
      const allResults = [...state.gameResults, result];
      // distinct active days in the last 7 days for the "weekly activity" metric
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      const activeDays = new Set(
        allResults
          .filter((r) => new Date(r.playedAt) >= weekAgo)
          .map((r) => r.playedAt.slice(0, 10)),
      ).size;
      const profile = state.profile
        ? {
            ...state.profile,
            difficulty: { ...state.profile.difficulty, [result.game]: result.nextDifficulty },
            engagement: Math.round(
              Math.min(99, Math.max(40, state.profile.engagement * 0.55 + result.accuracy * 0.45)),
            ),
            weeklyActiveDays: Math.min(7, Math.max(state.profile.weeklyActiveDays, activeDays)),
            lastActiveAt: new Date().toISOString(),
          }
        : null;
      const enqueued = queueSyncRecord(state, {
        kind: 'game',
        label: `${result.game}`,
        detail: `Accuracy ${result.accuracy}% · Level ${result.nextDifficulty}`,
      });
      return {
        ...enqueued,
        gameResults: allResults,
        profile,
        timeline: [
          ...enqueued.timeline,
          {
            id: uid('tl'),
            patientId: result.patientId,
            time: todayTimelineTime(),
            label: `${result.game} completed`,
            icon: '🎮',
            kind: 'game',
          },
        ],
      };
    }

    case 'ADD_REMINDER':
      return { ...state, reminders: [...state.reminders, action.reminder] };

    case 'UPDATE_REMINDER': {
      const reminders = state.reminders.map((r) => {
        if (r.id !== action.id) return r;
        return {
          ...r,
          status: action.status,
          history: [
            { date: new Date().toISOString().slice(0, 10), status: action.status },
            ...r.history,
          ].slice(0, 60),
        };
      });
      const reminder = reminders.find((r) => r.id === action.id);
      const enqueued = state.offlineSince
        ? queueSyncRecord(state, {
            kind: 'reminder',
            label: reminder?.name ?? 'Reminder',
            detail: `Marked ${action.status}`,
          })
        : state;
      return {
        ...enqueued,
        reminders,
        timeline: reminder
          ? [
              ...enqueued.timeline,
              {
                id: uid('tl'),
                patientId: reminder.patientId,
                time: todayTimelineTime(),
                label: `${reminder.name} — ${action.status}`,
                icon: '✅',
                kind: 'reminder',
              },
            ]
          : enqueued.timeline,
      };
    }

    case 'ADD_FAMILY_MEMORY':
      return { ...state, familyMemories: [...state.familyMemories, action.memory] };

    case 'UPDATE_FAMILY_MEMORY': {
      const list = state.familyMemories.map((m) =>
        m.id === action.memory.id ? action.memory : m,
      );
      return { ...state, familyMemories: list };
    }

    case 'REMOVE_FAMILY_MEMORY':
      return { ...state, familyMemories: state.familyMemories.filter((m) => m.id !== action.id) };

    case 'ADD_MOOD': {
      const entry: MoodEntry = {
        id: uid('mood'),
        patientId: state.patient?.id ?? DEMO_PATIENT_ID,
        mood: action.mood,
        date: new Date().toISOString(),
      };
      return {
        ...state,
        moods: [...state.moods, entry],
        timeline: [
          ...state.timeline,
          {
            id: uid('tl'),
            patientId: entry.patientId,
            time: todayTimelineTime(),
            label: `Mood check-in`,
            icon: '💬',
            kind: 'mood',
          },
        ],
      };
    }

    case 'MARK_ALERT_READ':
      return { ...state, alerts: state.alerts.map((a) => (a.id === action.id ? { ...a, read: true } : a)) };

    case 'ADD_ALERT':
      return { ...state, alerts: [action.alert, ...state.alerts].slice(0, 50) };

    case 'CLEAR_ALERTS':
      return { ...state, alerts: [] };

    case 'ADD_TIMELINE_EVENT':
      return { ...state, timeline: [action.event, ...state.timeline].slice(0, 200) };

    case 'SET_SYNCED':
      return { ...state, lastSynced: new Date().toISOString() };

    case 'ENQUEUE_SYNC':
      return queueSyncRecord(state, { kind: action.kind, label: action.label, detail: action.detail });

    case 'SET_DEMO':
      return { ...state, demo: { ...state.demo, ...(action.step !== undefined && { step: action.step }), ...(action.active !== undefined && { active: action.active }), ...(action.completed !== undefined && { completed: action.completed }) } };

    case 'ADD_RESULTS': {
      const withQueue = action.results.reduce(
        (acc, r) =>
          queueSyncRecord(acc, { kind: 'game', label: r.game, detail: `Accuracy ${r.accuracy}%` }),
        state,
      );
      return {
        ...withQueue,
        gameResults: [...withQueue.gameResults, ...action.results],
        profile: withQueue.profile
          ? { ...withQueue.profile, lastActiveAt: new Date().toISOString() }
          : withQueue.profile,
      };
    }

    default:
      return state;
  }
}
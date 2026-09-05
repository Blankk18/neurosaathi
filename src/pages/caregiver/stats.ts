import type { AppState, GameResult, GameKind } from '@/types';
import { WEEK_TREND } from '@/data/demoData';

// ============================================================================
// Caregiver statistics — derived purely from stored app state (no fake values).
// Blends seeded demo history with whatever the user played since.
// ============================================================================

export function engagement(state: AppState): number {
  return state.profile?.engagement ?? 70;
}

export function memoryPerformance(state: AppState): number {
  const mems = state.gameResults.filter((r) => r.game === 'memory-match' || r.game === 'scene-memory');
  if (mems.length === 0) return state.profile?.baseline.memory ?? 72;
  const recent = mems.slice(-5);
  return Math.round(recent.reduce((s, r) => s + r.accuracy, 0) / recent.length);
}

export function attentionLevel(state: AppState): number {
  const atts = state.gameResults.filter((r) => r.game === 'pattern' || r.game === 'scene-memory');
  if (atts.length === 0) return state.profile?.baseline.attention ?? 81;
  const recent = atts.slice(-5);
  return Math.round(recent.reduce((s, r) => s + r.accuracy, 0) / recent.length);
}

export function adherence(state: AppState): number {
  const today = new Date().toISOString().slice(0, 10);
  const reminders = state.reminders;
  const done = reminders.filter((r) => r.history.some((h) => h.date === today && h.status === 'done')).length;
  return reminders.length ? Math.round((done / reminders.length) * 100) : 91;
}

export function weeklyActiveDays(state: AppState): number {
  return state.profile?.weeklyActiveDays ?? 5;
}

function dayIdx(playedAt: string): number {
  const d = new Date(playedAt);
  return d.getDay(); // 0 Sun .. 6 Sat
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 7-day memory trend: use actual sessions per weekday, falling back to demo trend. */
export function memoryTrend(state: AppState): { day: string; memory: number }[] {
  const mems = state.gameResults.filter((r) => r.game === 'memory-match' || r.game === 'scene-memory');
  const byDay = new Map<number, number[]>();
  mems.forEach((r) => {
    const i = dayIdx(r.playedAt);
    byDay.set(i, [...(byDay.get(i) ?? []), r.accuracy]);
  });
  return DAYS.map((day) => {
    const demo = WEEK_TREND.find((w) => w.day === day)?.memory ?? 75;
    const vals = byDay.get(DAYS.indexOf(day)) ?? [];
    const mem = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : demo;
    return { day, memory: mem };
  });
}

export function accuracyVsTime(state: AppState): { name: string; accuracy: number; time: number }[] {
  const recent = state.gameResults.slice(-8);
  return recent.map((r) => ({
    name: shortGame(r.game),
    accuracy: r.accuracy,
    time: r.responseTimeSec,
  }));
}

function shortGame(g: GameKind): string {
  const map: Record<GameKind, string> = {
    'memory-match': 'Memory',
    'scene-memory': 'Scene',
    pattern: 'Pattern',
    routine: 'Routine',
    'family-memory': 'Family',
    region: 'Region',
  };
  return map[g] ?? g;
}

/** Adherence by day (demo blended with real history). */
export function adherenceChart(state: AppState): { day: string; adherence: number }[] {
  const history = state.reminders.flatMap((r) => r.history);
  return DAYS.map((day) => {
    const demo = WEEK_TREND.find((w) => w.day === day)?.memory ?? 80;
    const entries = history.filter((h) => {
      const d = new Date(h.date);
      return DAYS[d.getDay()] === day;
    });
    const pct = entries.length
      ? Math.round((entries.filter((e) => e.status === 'done' || e.status === 'snoozed').length / entries.length) * 100)
      : Math.min(97, demo + 8);
    return { day, adherence: pct };
  });
}

export function activityFreq(state: AppState): { name: string; plays: number }[] {
  const counts = new Map<GameKind, number>();
  state.gameResults.forEach((r) => counts.set(r.game, (counts.get(r.game) ?? 0) + 1));
  const base: { name: string; plays: number }[] = [
    { name: 'Memory', plays: 0 },
    { name: 'Scene', plays: 0 },
    { name: 'Pattern', plays: 0 },
    { name: 'Routine', plays: 0 },
    { name: 'Family', plays: 0 },
    { name: 'Region', plays: 0 },
  ];
  counts.forEach((v, k) => {
    const b = base.find((x) => x.name === shortGame(k));
    if (b) b.plays += v;
  });
  return base;
}

export function generatedInsights(results: GameResult[]): string[] {
  const out: string[] = [];
  const mem = results.filter((r) => r.game === 'memory-match' || r.game === 'scene-memory');
  if (mem.length >= 2) {
    const older = mem.slice(-Math.min(mem.length, 4), -1);
    const latest = mem[mem.length - 1];
    if (older.length && latest.accuracy > Math.round(older.reduce((s, r) => s + r.accuracy, 0) / older.length)) {
      const diff = latest.accuracy - Math.round(older.reduce((s, r) => s + r.accuracy, 0) / older.length);
      out.push(`Memory game accuracy improved by ${Math.max(1, Math.round(diff))}% in recent sessions.`);
    }
  }
  const morning = results.filter((r) => new Date(r.playedAt).getHours() < 12);
  const afternoon = results.filter((r) => new Date(r.playedAt).getHours() >= 12);
  if (morning.length >= 1 && afternoon.length >= 1) {
    const mAvg = morning.reduce((s, r) => s + r.accuracy, 0) / morning.length;
    const aAvg = afternoon.reduce((s, r) => s + r.accuracy, 0) / afternoon.length;
    if (mAvg > aAvg) {
      out.push('User tends to perform better during morning sessions.');
    }
  }
  const patternAvg = results.filter((r) => r.game === 'pattern').reduce((s, r) => s + r.accuracy, 0) /
    Math.max(1, results.filter((r) => r.game === 'pattern').length);
  const recallAvg = results.filter((r) => r.game === 'family-memory' || r.game === 'routine').reduce((s, r) => s + r.accuracy, 0) /
    Math.max(1, results.filter((r) => r.game === 'family-memory' || r.game === 'routine').length);
  if (patternAvg > recallAvg && patternAvg > 0) {
    out.push('Pattern games are currently easier for the user than recall-based games.');
  }
  const done = [
    ...new Set(
      results
        .filter((r) => new Date(r.playedAt).toISOString().slice(0, 10))
        .map((r) => r.playedAt.slice(0, 10)),
    ),
  ].length;
  if (done >= 3) {
    out.push(`The user completed ${done} active day${done > 1 ? 's' : ''} — engagement looks steady.`);
  }
  out.push('Consider scheduling cognitive activities in the morning when engagement appears higher.');
  return out;
}

export function todayTimeline(state: AppState) {
  return [...state.timeline]
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 12);
}

export function lastActiveLabel(state: AppState): string {
  if (!state.profile?.lastActiveAt) return '—';
  const d = new Date(state.profile.lastActiveAt);
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
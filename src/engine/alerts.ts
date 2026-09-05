import type { Alert, GameResult, Reminder, AlertSeverity } from '@/types';

// ============================================================================
// Smart caregiver alert engine.
//
// NEVER signals on a single poor score. It combines several signals across
// several sessions:
//   • memory accuracy trend ↓
//   • response time trend ↑
//   • mistake count trend ↑
//   • skipped / missed activities
// The result is an "Attention Indicator" — explicitly not a diagnosis.
// ============================================================================

interface Signals {
  memoryDown: number; // percentage points drop vs 4+ days ago
  responseSlowerPct: number;
  mistakesUp: number;
  skippedActivities: number;
  activityGapDays: number;
}

function dayKey(recentN: number): string {
  const d = new Date();
  d.setDate(d.getDate() - recentN);
  return d.toISOString().slice(0, 10);
}

function trendAnalysis(results: GameResult[]): Signals {
  const mem = results
    .filter((r) => r.game === 'memory-match' || r.game === 'scene-memory')
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt));

  if (mem.length < 4) {
    return { memoryDown: 0, responseSlowerPct: 0, mistakesUp: 0, skippedActivities: 0, activityGapDays: 0 };
  }

  const older = mem.slice(0, 3);
  const newer = mem.slice(-3);
  const avg = (arr: GameResult[], f: (r: GameResult) => number) =>
    arr.reduce((s, r) => s + f(r), 0) / arr.length;

  const memDrop = avg(older, (r) => r.accuracy) - avg(newer, (r) => r.accuracy);
  const rtOlder = avg(older, (r) => r.responseTimeSec);
  const rtNewer = avg(newer, (r) => r.responseTimeSec);
  const slowerPct = rtOlder > 0 ? ((rtNewer - rtOlder) / rtOlder) * 100 : 0;
  const mistakesUp = avg(newer, (r) => r.mistakes) - avg(older, (r) => r.mistakes);

  return {
    memoryDown: +memDrop.toFixed(1),
    responseSlowerPct: +slowerPct.toFixed(0),
    mistakesUp: +mistakesUp.toFixed(1),
    skippedActivities: 0,
    activityGapDays: 0,
  };
}

export interface AlertResult {
  alert: Alert | null;
  reasons: string[];
  triggered: boolean;
}

export function evaluateAttentionIndicator(
  results: GameResult[],
  reminders: Reminder[],
): AlertResult {
  const signals = trendAnalysis(results);

  // miss detection from reminder history (last 2 days)
  const missed = reminders
    .flatMap((r) => r.history)
    .filter((h) => h.status === 'missed')
    .length;

  // skipped activities = days with no game results in the last 3 days
  const last3 = [0, 1, 2].map((n) => dayKey(n));
  const activeDays = new Set(results.map((r) => r.playedAt.slice(0, 10)));
  const skippedActivities = last3.filter((d) => !activeDays.has(d)).length;

  const reasons: string[] = [];
  if (signals.memoryDown >= 3) reasons.push(`Memory accuracy decreased by ~${Math.round(signals.memoryDown)}%`);
  if (signals.responseSlowerPct >= 15) reasons.push(`Response time increased (${+signals.responseSlowerPct}% slower)`);
  if (signals.mistakesUp >= 1) reasons.push(`Mistakes increased across recent sessions`);
  if (missed >= 2) reasons.push(`${missed} reminders were missed`);
  if (skippedActivities >= 2) reasons.push(`${skippedActivities} planned activities were skipped`);

  const severity: AlertSeverity = reasons.length >= 3 ? 'attention' : 'info';
  const triggered = reasons.length >= 2;

  if (!triggered) {
    return { alert: null, reasons, triggered: false };
  }

  const alert: Alert = {
    id: `alert-${Date.now().toString(36)}`,
    patientId: results[0]?.patientId ?? 'patient-asha',
    severity,
    title: 'Attention Indicator',
    message:
      'Recent sessions show a change in cognitive engagement and activity completion. Consider checking in with the user.',
    reasons,
    createdAt: new Date().toISOString(),
    read: false,
    simulated: true,
  };

  return { alert, reasons, triggered: true };
}

/** Generates a scripted multi-day performance decline for the demo feature. */
export function simulateDecline(): GameResult[] {
  const days = [
    { acc: 82, rt: 3.9, mistakes: 1 },
    { acc: 80, rt: 4.4, mistakes: 2 },
    { acc: 77, rt: 4.8, mistakes: 2 },
    { acc: 74, rt: 5.4, mistakes: 3 },
    { acc: 70, rt: 6.1, mistakes: 4 },
  ];
  const out: GameResult[] = [];
  days.forEach((d, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (4 - i));
    date.setHours(9, 30, 0, 0);
    out.push({
      id: `sim-${i}`,
      patientId: 'patient-asha',
      game: 'memory-match',
      playedAt: date.toISOString(),
      accuracy: d.acc,
      responseTimeSec: d.rt,
      mistakes: d.mistakes,
      attempts: 8,
      difficulty: 3,
      nextDifficulty: 3,
    });
  });
  return out;
}
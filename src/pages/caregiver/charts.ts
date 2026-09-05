// Chart helpers for the caregiver dashboard.

export function pastWeek(): { label: string; date: string }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const out: { label: string; date: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ label: days[d.getDay()], date: d.toISOString().slice(0, 10) });
  }
  return out;
}

/** Merge a per-weekday trend (stats.memoryTrend) into rolling 7-day labels. */
export function blendTrend(
  week: { label: string; date: string }[],
  trend: { day: string; memory: number }[],
): { label: string; memory: number }[] {
  return week.map((w) => {
    const match = trend.find((t) => t.day === w.label);
    return { label: w.label, memory: match?.memory ?? 75 };
  });
}
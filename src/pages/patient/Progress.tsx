import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, SectionTitle, StatTile } from '@/components/ui';
import { PageHeader } from '@/components/common';

function thisWeekRange(): [Date, Date] {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay()); // Sunday
  return [start, now];
}

export default function Progress() {
  const { t, state } = useApp();
  const navigate = useNavigate();
  const patient = state.patient;
  const base = state.profile?.baseline;
  const results = state.gameResults;

  const weekly = useMemo(() => {
    const [start, now] = thisWeekRange();
    const week = results.filter((r) => new Date(r.playedAt) >= start && new Date(r.playedAt) <= now);
    const before = results.filter((r) => new Date(r.playedAt) < start && new Date(r.playedAt) >= new Date(start.getTime() - 7 * 86400000));
    const avg = (arr: typeof results) => (arr.length ? Math.round(arr.reduce((s, r) => s + r.accuracy, 0) / arr.length) : 0);
    const memoryGame = week.filter((r) => r.game === 'memory-match');
    const attentionGame = week.filter((r) => r.game === 'pattern' || r.game === 'scene-memory');
    const recallGame = week.filter((r) => r.game === 'family-memory' || r.game === 'routine');

    const memNow = memoryGame.length ? avg(memoryGame) : base?.memory ?? 70;
    const memBefore = before.filter((r) => r.game === 'memory-match').length ? avg(before.filter((r) => r.game === 'memory-match')) : base?.memory ?? 70;
    const attNow = attentionGame.length ? avg(attentionGame) : base?.attention ?? 75;
    const attBefore = before.filter((r) => r.game === 'pattern' || r.game === 'scene-memory').length ? avg(before.filter((r) => r.game === 'pattern' || r.game === 'scene-memory')) : base?.attention ?? 75;
    const recNow = recallGame.length ? avg(recallGame) : base?.recall ?? 65;
    const recBefore = before.filter((r) => r.game === 'family-memory' || r.game === 'routine').length ? avg(before.filter((r) => r.game === 'family-memory' || r.game === 'routine')) : base?.recall ?? 65;

    const activeDays = new Set(week.map((r) => r.playedAt.slice(0, 10))).size;
    return {
      memory: memNow - memBefore,
      attention: attNow - attBefore,
      recall: recNow - recBefore,
      activeDays,
      memNow,
      recNow,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, base]);

  const delta = (v: number) => (v >= 0 ? `↑ ${Math.abs(v)}%` : `↓ ${Math.abs(v)}%`);

  return (
    <div>
      <PageHeader title={t('progress.title')} subtitle={patient?.name} />

      <div className="mt-4 rounded-3xl bg-brand-700 p-5 text-white shadow-lift">
        <h2 className="text-xl font-extrabold">🎯 {t('progress.week')}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <div className="text-2xl font-extrabold">{delta(weekly.memory)}</div>
            <div className="text-sm font-bold">{t('progress.memory')}</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <div className="text-2xl font-extrabold">{delta(weekly.attention)}</div>
            <div className="text-sm font-bold">{t('progress.attention')}</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <div className="text-2xl font-extrabold">{delta(weekly.recall)}</div>
            <div className="text-sm font-bold">{t('progress.recall')}</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <div className="text-2xl font-extrabold">{weekly.activeDays}/{Math.max(7, weekly.activeDays)}</div>
            <div className="text-sm font-bold">{t('progress.activities')}</div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <SectionTitle icon="🌄">{t('progress.journey')}</SectionTitle>
        <Card>
          <p className="text-xl font-bold text-brand-900">🌟 {t('progress.encourage')}</p>
          <div className="mt-3 flex items-center gap-4">
            <span className="text-4xl" aria-hidden>🌱</span>
            <p className="text-base text-neutral-600">
              {t('progress.journey.desc')}
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-5 space-y-3">
        <StatTile label={t('progress.memory')} value={weekly.memNow} hint="% " trend={{ up: weekly.memory >= 0, text: delta(weekly.memory) }} />
        <StatTile label={t('progress.recall')} value={weekly.recNow} hint="% " trend={{ up: weekly.recall >= 0, text: delta(weekly.recall) }} />
      </div>

      <button onClick={() => navigate('/mood')} className="card mt-5 flex w-full items-center gap-3 text-left hover:shadow-lift">
        <span className="text-4xl" aria-hidden>💬</span>
        <div>
          <div className="text-lg font-extrabold text-brand-900">{t('progress.mood.question')}</div>
          <div className="text-sm font-semibold text-neutral-500">{t('progress.mood.sub')}</div>
        </div>
      </button>
    </div>
  );
}
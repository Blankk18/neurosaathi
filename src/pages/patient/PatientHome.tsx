import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, SectionTitle } from '@/components/ui';
import { PageHeader } from '@/components/common';
import { currentDifficulty, recentForGame, adaptDifficulty, LEVEL_TO_CARDS } from '@/engine/adaptive';
import type { GameKind } from '@/types';

const ACTIVITIES: { game: GameKind; emoji: string; labelKey: string }[] = [
  { game: 'memory-match', emoji: '🧠', labelKey: 'games.memory' },
  { game: 'scene-memory', emoji: '🖼️', labelKey: 'games.scene' },
  { game: 'routine', emoji: '🕰️', labelKey: 'games.routine' },
  { game: 'family-memory', emoji: '👨‍👩‍👧', labelKey: 'games.family' },
];

const GAME_ROUTE: Record<GameKind, string> = {
  'memory-match': '/games/memory',
  'scene-memory': '/games/scene',
  pattern: '/games/pattern',
  routine: '/games/routine',
  'family-memory': '/games/family',
  region: '/games/region',
};

export default function PatientHome() {
  const { t, state, speakText } = useApp();
  const navigate = useNavigate();
  const patient = state.patient;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t('home.greeting.morning');
    if (h < 17) return t('home.greeting.afternoon');
    return t('home.greeting.evening');
  }, [t]);

  const name = patient?.name ?? t('home.friend');

  // show a banner when a recent session triggered a difficulty change
  const adapted = useMemo(() => {
    return state.gameResults.some((r) => r.adaptationNote && r.nextDifficulty !== r.difficulty);
  }, [state.gameResults]);

  return (
    <div>
      <PageHeader />
      <h1 className="fade-up text-3xl font-extrabold text-brand-900">
        {greeting}, {name} 👋
      </h1>
      <button
        onClick={() => speakText(`${greeting}, ${name}. ${t('voice.greet')}`)}
        className="mt-1 text-lg font-semibold text-brand-700"
      >
        🔊 {t('home.talk')}
      </button>

      {adapted && (
        <div className="mt-4 rounded-2xl border-2 border-brand-200 bg-brand-50 px-4 py-3 text-base font-bold text-brand-800">
          🤖 {t('games.adapted.banner')}
        </div>
      )}

      {/* big start button */}
      <div className="mt-5">
        <button
          onClick={() => navigate(GAME_ROUTE['memory-match'])}
          className="btn-huge bg-accent-400 text-white hover:bg-accent-500"
        >
          ▶ {t('home.start.activity')}
        </button>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => navigate('/voice')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-lg font-bold text-brand-800 shadow-card hover:shadow-lift"
        >
          🎤 {t('home.talk')}
        </button>
        <button
          onClick={() => navigate('/mood')}
          className="rounded-2xl bg-white px-4 py-4 text-2xl shadow-card hover:shadow-lift"
          aria-label={t('home.mood.checkin')}
        >
          💬
        </button>
      </div>

      <SectionTitle icon="🎮">{t('home.today.activities')}</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {ACTIVITIES.map(({ game, emoji, labelKey }) => {
          const recent = recentForGame(state.gameResults, game);
          const prev = currentDifficulty(state.gameResults, game, 1);
          const d = adaptDifficulty(prev, recent);
          const cards = LEVEL_TO_CARDS[d.nextDifficulty] ?? 8;
          void cards;
          return (
            <button
              key={game}
              onClick={() => navigate(GAME_ROUTE[game])}
              className="card flex flex-col items-center justify-center gap-2 p-5 transition hover:shadow-lift"
            >
              <span className="text-4xl" aria-hidden>{emoji}</span>
              <span className="text-center text-lg font-extrabold text-brand-900">{t(labelKey)}</span>
              <span className="chip bg-brand-100 text-brand-700">{t('games.level')} {d.nextDifficulty}</span>
            </button>
          );
        })}
      </div>

      <SectionTitle icon="🔔">{t('home.today.reminders')}</SectionTitle>
      <div className="space-y-3">
        {state.reminders.slice(0, 4).map((r) => (
          <Card key={r.id} className="flex items-center gap-3" onClick={() => navigate('/reminders')}>
            <span className="text-3xl" aria-hidden>
              {r.type === 'medicine' ? '💊' : r.type === 'water' ? '💧' : r.type === 'walk' ? '🚶' : '🍽️'}
            </span>
            <div className="flex-1">
              <div className="text-lg font-extrabold text-brand-900">{r.name}</div>
              <div className="text-base font-semibold text-brand-600">{r.time}</div>
            </div>
            {r.status === 'done' ? (
              <span className="chip bg-brand-600 text-white">✓ {t('reminders.status.taken')}</span>
            ) : (
              <span className="chip bg-warm-100 text-warm-500">• {t('reminders.status.pending')}</span>
            )}
          </Card>
        ))}
        {state.reminders.length === 0 && <Card className="text-center text-neutral-500">{t('home.noReminders')}</Card>}
      </div>
    </div>
  );
}
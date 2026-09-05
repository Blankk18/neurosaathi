import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { currentDifficulty, recentForGame, adaptDifficulty } from '@/engine/adaptive';
import type { GameKind } from '@/types';

const GAMES: { game: GameKind; route: string; emoji: string; titleKey: string; descKey: string }[] = [
  { game: 'memory-match', route: '/games/memory', emoji: '🧠', titleKey: 'games.memory', descKey: 'games.memory.desc' },
  { game: 'scene-memory', route: '/games/scene', emoji: '🖼️', titleKey: 'games.scene', descKey: 'games.scene.desc' },
  { game: 'pattern', route: '/games/pattern', emoji: '🔀', titleKey: 'games.pattern', descKey: 'games.pattern.desc' },
  { game: 'routine', route: '/games/routine', emoji: '🕰️', titleKey: 'games.routine', descKey: 'games.routine.desc' },
  { game: 'family-memory', route: '/games/family', emoji: '👨‍👩‍👧', titleKey: 'games.family', descKey: 'games.family.desc' },
  { game: 'region', route: '/games/region', emoji: '🏡', titleKey: 'games.region', descKey: 'games.region.desc' },
];

export default function GamesHub() {
  const { t, state, speakText } = useApp();
  const navigate = useNavigate();

  const adapted = state.gameResults.some((r) => r.adaptationNote && r.nextDifficulty !== r.difficulty);

  return (
    <div>
      <PageHeader
        backTo="/home"
        title={t('games.title')}
        right={
          <button onClick={() => speakText(t('games.title'))} className="rounded-full bg-white p-3 text-xl shadow-card" aria-label="Speak">
            🔊
          </button>
        }
      />

      {adapted && (
        <div className="mt-3 rounded-2xl border-2 border-brand-200 bg-brand-50 px-4 py-3 text-base font-bold text-brand-800">
          🤖 {t('games.adapted.banner')}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {GAMES.map(({ game, route, emoji, titleKey, descKey }) => {
          const recent = recentForGame(state.gameResults, game);
          const prev = currentDifficulty(state.gameResults, game, 1);
          const d = adaptDifficulty(prev, recent);
          return (
            <button key={game} onClick={() => navigate(route)} className="card flex h-40 flex-col items-center justify-center gap-1 p-4 transition hover:shadow-lift">
              <span className="text-5xl" aria-hidden>{emoji}</span>
              <span className="text-lg font-extrabold leading-tight text-brand-900">{t(titleKey)}</span>
              <span className="text-sm font-semibold text-neutral-500">{t(descKey)}</span>
              <span className="chip mt-1 bg-brand-100 text-brand-700">
                {t('games.level')} {d.nextDifficulty}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl bg-brand-700 p-4 text-brand-50">
        <p className="text-base font-bold">
          💡 {t('games.adapted.banner')}
        </p>
      </div>
    </div>
  );
}
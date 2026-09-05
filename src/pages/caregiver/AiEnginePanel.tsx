import { useMemo, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { Card, Chip } from '@/components/ui';
import { recentForGame, currentDifficulty, adaptDifficulty, difficultyLabel } from '@/engine/adaptive';
import type { GameKind } from '@/types';

const GAMES: { game: GameKind; titleKey: string }[] = [
  { game: 'memory-match', titleKey: 'games.memory' },
  { game: 'scene-memory', titleKey: 'games.scene' },
  { game: 'pattern', titleKey: 'games.pattern' },
  { game: 'routine', titleKey: 'games.routine' },
  { game: 'family-memory', titleKey: 'games.family' },
  { game: 'region', titleKey: 'games.region' },
];

export function AiEnginePanel() {
  const { t, state } = useApp();
  const [game, setGame] = useState<GameKind>('memory-match');

  const info = useMemo(() => {
    const recent = recentForGame(state.gameResults, game);
    const prev = currentDifficulty(state.gameResults, game, 1);
    const decision = adaptDifficulty(prev, recent);
    const last = recent.at(-1);
    return { recent, decision, last };
  }, [state.gameResults, game]);

  const { decision, last } = info;
  const actionText =
    decision.action === 'increase'
      ? `${difficultyLabel(decision.previousDifficulty)} → ${difficultyLabel(decision.nextDifficulty)}`
      : decision.action === 'decrease'
        ? `${difficultyLabel(decision.previousDifficulty)} → ${difficultyLabel(decision.nextDifficulty)}`
        : difficultyLabel(decision.nextDifficulty);

  return (
    <Card>
      <h3 className="text-lg font-extrabold text-brand-900">🤖 {t('cg.adapter.title')}</h3>
      <p className="text-sm font-semibold text-neutral-500">{t('cg.adapter.desc')}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {GAMES.map((g) => (
          <button
            key={g.game}
            onClick={() => setGame(g.game)}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${game === g.game ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700'}`}
          >
            {t(g.titleKey)}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-brand-50 p-4">
        <div className="text-sm font-bold uppercase tracking-wide text-brand-600">{t('cg.adapter.recent')}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-brand-900">
          <div className="rounded-xl bg-white p-2 text-center">
            <div className="text-2xl font-extrabold">{last?.accuracy ?? decision.evidence.accuracy}%</div>
            <div className="text-xs font-bold text-brand-600">{t('cg.adapter.accuracy')}</div>
          </div>
          <div className="rounded-xl bg-white p-2 text-center">
            <div className="text-2xl font-extrabold">{last?.responseTimeSec ?? decision.evidence.responseTimeSec}s</div>
            <div className="text-xs font-bold text-brand-600">{t('cg.adapter.rt')}</div>
          </div>
          <div className="rounded-xl bg-white p-2 text-center">
            <div className="text-2xl font-extrabold">{last?.mistakes ?? decision.evidence.mistakes}</div>
            <div className="text-xs font-bold text-brand-600">{t('cg.adapter.mistakes')}</div>
          </div>
          <div className="rounded-xl bg-white p-2 text-center">
            <div className="text-2xl font-extrabold">{difficultyLabel(decision.previousDifficulty).split(' ')[1]}</div>
            <div className="text-xs font-bold text-brand-600">{t('cg.adapter.prevDiff')}</div>
          </div>
          <div className="col-span-2 rounded-xl bg-white p-2 text-center">
            <div className="text-sm font-bold text-brand-500">{t('cg.adapter.sessions')}</div>
            <div className="text-xl font-extrabold">{decision.evidence.recentSessions}</div>
          </div>
        </div>

        <div className="mt-3">
          <Chip tone={decision.action === 'increase' ? 'brand' : decision.action === 'decrease' ? 'accent' : 'neutral'}>
            {decision.action === 'increase' ? t('cg.adapter.increase') : decision.action === 'decrease' ? t('cg.adapter.decrease') : t('cg.adapter.maintain')}
          </Chip>
          <div className="mt-2 text-xl font-extrabold text-brand-900">
            {decision.action === 'maintain' ? `${t('cg.adapter.keep')} ` : `${t('cg.adapter.set')} `}
            {actionText}
          </div>
          <div className="mt-1 text-sm font-semibold text-brand-700">“{decision.reason}”</div>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-neutral-400">{t('cg.adapter.mock')}</p>
    </Card>
  );
}
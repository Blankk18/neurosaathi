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
    <Card className="fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-brand-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-lg">{'\u{1F916}'}</span>
            {t('cg.adapter.title')}
          </h3>
          <p className="mt-1 text-sm font-semibold text-neutral-500">{t('cg.adapter.desc')}</p>
        </div>
        <Chip tone="info">⚠ ✦</Chip>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {GAMES.map((g) => (
          <button
            key={g.game}
            onClick={() => setGame(g.game)}
            className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
              game === g.game ? 'bg-brand-600 text-white shadow-sm' : 'bg-warm-50 text-warm-700 hover:bg-warm-100'
            }`}
          >
            {t(g.titleKey)}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-3xl border border-info-100 bg-info-50/60 p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-info-100 text-xs">✦</div>
          <div className="text-xs font-extrabold uppercase tracking-wider text-info-600">{t('cg.adapter.recent')}</div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-brand-900">
          <div className="rounded-2xl bg-white/80 p-3 text-center shadow-soft">
            <div className="text-2xl font-extrabold text-brand-900">{last?.accuracy ?? decision.evidence.accuracy}%</div>
            <div className="mt-0.5 text-xs font-bold text-neutral-500">{t('cg.adapter.accuracy')}</div>
          </div>
          <div className="rounded-2xl bg-white/80 p-3 text-center shadow-soft">
            <div className="text-2xl font-extrabold text-brand-900">{last?.responseTimeSec ?? decision.evidence.responseTimeSec}s</div>
            <div className="mt-0.5 text-xs font-bold text-neutral-500">{t('cg.adapter.rt')}</div>
          </div>
          <div className="rounded-2xl bg-white/80 p-3 text-center shadow-soft">
            <div className="text-2xl font-extrabold text-brand-900">{last?.mistakes ?? decision.evidence.mistakes}</div>
            <div className="mt-0.5 text-xs font-bold text-neutral-500">{t('cg.adapter.mistakes')}</div>
          </div>
          <div className="rounded-2xl bg-white/80 p-3 text-center shadow-soft">
            <div className="text-2xl font-extrabold text-brand-900">{difficultyLabel(decision.previousDifficulty).split(' ')[1]}</div>
            <div className="mt-0.5 text-xs font-bold text-neutral-500">{t('cg.adapter.prevDiff')}</div>
          </div>
          <div className="col-span-2 rounded-2xl bg-white/80 p-3 text-center shadow-soft">
            <div className="text-sm font-bold text-neutral-400">{t('cg.adapter.sessions')}</div>
            <div className="mt-0.5 text-xl font-extrabold text-brand-900">{decision.evidence.recentSessions}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white/90 p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={decision.action === 'increase' ? 'brand' : decision.action === 'decrease' ? 'accent' : 'neutral'}>
              {decision.action === 'increase' ? t('cg.adapter.increase') : decision.action === 'decrease' ? t('cg.adapter.decrease') : t('cg.adapter.maintain')}
            </Chip>
            <span className="text-xs font-bold text-neutral-400">✨ {t('cg.adapter.mock')}</span>
          </div>
          <div className="mt-2.5 text-xl font-extrabold text-brand-900">
            {decision.action === 'maintain' ? `${t('cg.adapter.keep')} ` : `${t('cg.adapter.set')} `}
            {actionText}
          </div>
          <div className="mt-1.5 border-l-2 border-info-200 pl-3 text-sm font-semibold italic text-brand-700">“{decision.reason}”</div>
        </div>
      </div>
    </Card>
  );
}
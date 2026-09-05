import { useMemo } from 'react';
import { useApp } from '@/state/AppContext';
import { Card, Disclaimer } from '@/components/ui';
import * as stats from './stats';
import { adaptDifficulty, currentDifficulty, recentForGame, difficultyLabel } from '@/engine/adaptive';

const GAME_TITLE: Record<string, string> = {
  'memory-match': 'games.memory',
  pattern: 'games.pattern',
  'scene-memory': 'games.scene',
  routine: 'games.routine',
  'family-memory': 'games.family',
  region: 'games.region',
};

export default function Insights() {
  const { t, state } = useApp();

  const insights = useMemo(() => stats.generatedInsights(state.gameResults), [state.gameResults]);

  const adaptations = useMemo(() => {
    const kinds = ['memory-match', 'pattern', 'scene-memory', 'routine'] as const;
    return kinds
      .map((g) => {
        const recent = recentForGame(state.gameResults, g);
        const prev = currentDifficulty(state.gameResults, g, 1);
        const d = adaptDifficulty(prev, recent);
        return { g, d };
      })
      .filter((x) => x.d.nextDifficulty > x.d.previousDifficulty || x.d.nextDifficulty < x.d.previousDifficulty)
      .slice(0, 3);
  }, [state.gameResults]);

  return (
    <div>
      <div className="mb-2">
        <Disclaimer>{t('cg.insight.label')}</Disclaimer>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xl font-extrabold text-brand-900">💡 {t('cg.insights')}</h2>
          <div className="space-y-3">
            {insights.map((ins, i) => (
              <Card key={i} className="border-l-4 border-l-brand-400">
                <p className="text-base font-semibold text-brand-900">{ins}</p>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-extrabold text-brand-900">🤖 {t('cg.adaptation')}</h2>
          <div className="space-y-3">
            {adaptations.length === 0 && (
              <Card className="text-neutral-500">{t('cg.insights.steady')}</Card>
            )}
            {adaptations.map(({ g, d }) => (
              <Card key={g}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold capitalize text-brand-900">{t(GAME_TITLE[g] ?? g)}</span>
                  <span
                    className={`chip ${
                      d.action === 'increase' ? 'bg-brand-100 text-brand-700' : 'bg-warm-100 text-warm-500'
                    }`}
                  >
                    {difficultyLabel(d.previousDifficulty)} → {difficultyLabel(d.nextDifficulty)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-neutral-600">{d.reason}</p>
              </Card>
            ))}
          </div>

          <h2 className="mb-2 mt-6 text-xl font-extrabold text-brand-900">🎯 {t('cg.engagement')}</h2>
          <Card className="flex items-center gap-4">
            <span className="text-4xl">{stats.engagement(state) >= 65 ? '🌤️' : '🌥️'}</span>
            <div>
              <div className="text-2xl font-extrabold text-brand-900">{stats.engagement(state)}%</div>
              <div className="text-sm font-semibold text-neutral-500">{t('cg.engagement')} {t('cg.engagement.steady')}</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
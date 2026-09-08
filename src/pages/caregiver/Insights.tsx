import { useMemo } from 'react';
import { useApp } from '@/state/AppContext';
import { Card, Disclaimer, Chip } from '@/components/ui';
import { LightbulbIcon, TargetIcon, HeartIcon, EyeIcon } from '@/components/Icons';
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

  const eng = stats.engagement(state);

  return (
    <div className="space-y-5 fade-in">
      {/* subtle page label + non-diagnostic disclaimer — keep verbatim */}
      <div className="space-y-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-400">Care insights · gentle, non-diagnostic</p>
        <Disclaimer>{t('cg.insight.label')}</Disclaimer>
      </div>

      {/* summary signal — calm overview strip */}
      <Card tone="tinted" className="border border-brand-100/70 px-4 py-4 shadow-sm md:px-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm ring-1 ring-brand-100">
            <EyeIcon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold tracking-tight text-brand-900">A calm look at recent play</div>
            <div className="mt-0.5 text-sm font-semibold leading-snug text-neutral-500">
              {insights.length} {insights.length === 1 ? 'observation' : 'observations'} · {adaptations.length === 0 ? 'no tuning needed' : `${adaptations.length} gentle ${adaptations.length === 1 ? 'adaptation' : 'adaptations'}`} · {eng}% engagement
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="brand">{insights.length} insights</Chip>
            <Chip tone={adaptations.length ? 'warm' : 'neutral'}>{adaptations.length} adaptations</Chip>
            <Chip tone={eng >= 65 ? 'brand' : 'warm'}>{eng}%</Chip>
          </div>
        </div>
      </Card>

      {/* two polished columns */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* left — observations */}
        <div className="space-y-3 lg:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2.5 text-[17px] font-extrabold tracking-tight text-brand-900">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                  <LightbulbIcon size={16} />
                </span>
                {t('cg.insights')}
              </h2>
              <p className="mt-1 max-w-[36ch] text-xs font-semibold leading-relaxed text-neutral-400">
                Warm, plain-language patterns from recent sessions — reassuring and easy to share with family.
              </p>
            </div>
            <span className="hidden shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-extrabold text-brand-600 ring-1 ring-brand-100 sm:inline-flex">
              {insights.length}
            </span>
          </div>

          <div className="space-y-3">
            {insights.map((ins, i) => (
              <Card key={i} className="flex gap-3.5 rounded-[1.25rem] border border-brand-100/60 p-4 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <LightbulbIcon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand-400">Observation {i + 1}</p>
                  <p className="mt-1 text-[15px] font-semibold leading-relaxed text-brand-900">{ins}</p>
                </div>
              </Card>
            ))}
            {insights.length === 0 && (
              <Card className="rounded-[1.25rem] border border-dashed border-brand-200 bg-brand-50/40 p-6 text-center">
                <p className="text-sm font-bold text-brand-700">No observations yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm font-semibold leading-relaxed text-neutral-500">
                  As your loved one plays a few more sessions, gentle observations will appear here.
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* right — adaptations + engagement */}
        <div className="space-y-5 lg:col-span-5">
          {/* adaptations */}
          <div className="space-y-3">
            <div>
              <h2 className="flex items-center gap-2.5 text-[17px] font-extrabold tracking-tight text-brand-900">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warm-500 text-white shadow-sm">
                  <TargetIcon size={16} />
                </span>
                {t('cg.adaptation')}
              </h2>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-neutral-400">
                The app quietly tunes difficulty to keep things encouraging — never pressured.
              </p>
            </div>

            <div className="space-y-3">
              {adaptations.length === 0 && (
                <Card className="rounded-[1.25rem] border border-warm-100 bg-warm-50/40 p-4 text-center">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-warm-500 shadow-sm ring-1 ring-warm-100">
                    <TargetIcon size={16} />
                  </div>
                  <p className="mt-2 text-sm font-extrabold text-brand-900">Steady and well-paced</p>
                  <p className="mx-auto mt-1 max-w-[28ch] text-sm font-semibold leading-relaxed text-neutral-500">
                    {t('cg.insights.steady')}
                  </p>
                </Card>
              )}
              {adaptations.map(({ g, d }) => (
                <Card key={g} className="rounded-[1.25rem] border border-neutral-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warm-50 text-warm-600 ring-1 ring-warm-100">
                        <TargetIcon size={15} />
                      </span>
                      <span className="truncate text-[15px] font-extrabold capitalize tracking-tight text-brand-900">
                        {t(GAME_TITLE[g] ?? g)}
                      </span>
                    </div>
                    <span
                      className={`chip shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                        d.action === 'increase' ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-200' : 'bg-warm-100 text-warm-600 ring-1 ring-warm-200'
                      }`}
                    >
                      {difficultyLabel(d.previousDifficulty)} → {difficultyLabel(d.nextDifficulty)}
                    </span>
                  </div>
                  <p className="mt-3 rounded-xl bg-canvas/70 px-3.5 py-3 text-sm font-semibold leading-relaxed text-neutral-600 ring-1 ring-brand-50">
                    “{d.reason}”
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* engagement — hero metric */}
          <div className="space-y-3">
            <h2 className="flex items-center gap-2.5 text-[17px] font-extrabold tracking-tight text-brand-900">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-info-500 text-white shadow-sm">
                <HeartIcon size={15} />
              </span>
              {t('cg.engagement')}
            </h2>

            <Card className="overflow-hidden rounded-[1.4rem] border border-brand-100 bg-gradient-to-br from-white to-brand-50/50 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-brand-500 shadow-sm ring-1 ring-brand-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
                  Weekly rhythm
                </span>
                <Chip tone={eng >= 65 ? 'brand' : 'warm'}>{eng >= 65 ? 'Steady' : 'Gentle focus'}</Chip>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-2xl bg-white text-[30px] shadow-sm ring-1 ring-brand-100">
                  <span aria-hidden>{eng >= 65 ? '🌤️' : '🌥️'}</span>
                </div>
                <div className="min-w-0">
                  <div className="text-3xl font-extrabold tracking-tight text-brand-900">{eng}%</div>
                  <div className="mt-0.5 text-sm font-semibold leading-snug text-neutral-500">
                    {t('cg.engagement')} · {t('cg.engagement.steady')}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-widest text-brand-400">
                  <span>Engagement</span>
                  <span>{eng}%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-100 p-1">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, eng))}%` }}
                  />
                </div>
                <p className="mt-2.5 text-xs font-semibold leading-relaxed text-neutral-400">
                  A calm, non-clinical signal — higher means more consistent, joyful play recently.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

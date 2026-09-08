import { useState } from 'react';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { useGameSession } from './useGameSession';
import GameResultScreen from './GameResultScreen';
import { REGIONS, getRegion, emojiFor, type RegionInfo } from '@/data/culturalData';
import type { Region } from '@/types';

interface Round {
  item: string;
  options: string[];
  correct: string;
}

function buildRounds(region: RegionInfo): Round[] {
  return region.objects.slice(0, 4).map((item) => {
    const others = REGIONS.filter((r) => r.code !== region.code)
      .flatMap((r) => r.objects)
      .filter((o) => o !== item)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return { item, options: [item, ...others].sort(() => Math.random() - 0.5), correct: item };
  });
}

export default function RegionGame() {
  const { t, state, dispatch } = useApp();
  const { finish, last, decision } = useGameSession('region');

  const [region, setRegion] = useState<Region>(state.patient?.region ?? 'assam');
  const info = getRegion(region);
  const level = last?.result.nextDifficulty ?? (state.profile?.difficulty.region ?? 1);

  const [phase, setPhase] = useState<'pick' | 'start' | 'quiz' | 'done'>('pick');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [tick, setTick] = useState(() => Date.now());

  const begin = () => {
    setRounds(buildRounds(info));
    setQIdx(0);
    setCorrect(0);
    setMistakes(0);
    setTimes([]);
    setPhase('start');
    setTick(Date.now());
  };

  const answer = (opt: string) => {
    const rt = (Date.now() - tick) / 1000;
    const isCorrect = opt === rounds[qIdx].correct;
    const newCorrect = isCorrect ? correct + 1 : correct;
    const newMistakes = isCorrect ? mistakes : mistakes + 1;
    const newTimes = [...times, rt];
    setCorrect(newCorrect);
    setMistakes(newMistakes);
    setTimes(newTimes);
    setTick(Date.now());
    if (qIdx < rounds.length - 1) setQIdx((i) => i + 1);
    else {
      setPhase('done');
      finish(
        { correct: newCorrect, total: rounds.length, responseTimes: newTimes, mistakes: newMistakes },
        { region },
      );
    }
  };

  const stepPct = phase === 'quiz' && rounds.length
    ? Math.round(((qIdx) / rounds.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader inProgress={phase === 'quiz'} backTo="/games" showHome right={
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-base font-bold text-brand-700 shadow-sm">
          {t('games.level')} {level}
        </span>
      } />

      {phase === 'done' && last ? (
        <div className="mx-auto mt-6 max-w-lg px-4">
          <GameResultScreen result={last.result} decision={decision} onPlayAgain={() => setPhase('pick')} />
        </div>
      ) : (
        <main className="mx-auto max-w-lg px-4 pb-24">
          {/* ---- Pick Phase ---- */}
          {phase === 'pick' && (
            <section className="mt-6 fade-up">
              <h1 className="text-3xl font-extrabold leading-tight text-brand-900">
                {t('region.title')}
              </h1>
              <p className="mt-2 text-xl font-semibold text-brand-700">
                {t('region.choose')}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                {REGIONS.map((r) => {
                  const isActive = region === r.code;
                  return (
                    <button
                      key={r.code}
                      onClick={() => {
                        setRegion(r.code);
                        dispatch({ type: 'UPDATE_SETTINGS', settings: {} });
                      }}
                      className={`group relative flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-6 text-center transition-all duration-200 ${
                        isActive
                          ? 'border-brand-400 bg-brand-50 shadow-md ring-2 ring-brand-200'
                          : 'border-transparent bg-white shadow-sm hover:border-brand-200 hover:shadow-md'
                      }`}
                      aria-pressed={isActive}
                    >
                      <span className="text-4xl drop-shadow-sm transition-transform duration-200 group-hover:scale-110" aria-hidden>
                        {r.emoji}
                      </span>
                      <span className="text-lg font-extrabold text-brand-900 leading-snug">
                        {r.name}
                      </span>
                      <span className="text-xs font-semibold text-neutral-500 leading-snug">
                        {r.tagline}
                      </span>
                      {isActive && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs text-white shadow">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={begin}
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-accent-500 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:bg-accent-600 hover:shadow-xl active:scale-[0.97]"
                >
                  ▶ {t('region.familiar')}
                </button>
              </div>
            </section>
          )}

          {/* ---- Start Overlay ---- */}
          {phase === 'start' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/30 p-6 backdrop-blur-sm fade-in">
              <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-50 shadow-inner">
                  <span className="text-5xl drop-shadow-sm" aria-hidden>{info.emoji}</span>
                </div>
                <h2 className="mt-5 text-3xl font-extrabold text-brand-900 leading-tight">
                  {t('region.title')}
                </h2>
                <p className="mt-2 text-xl font-semibold text-brand-600">
                  {info.name} · {t('region.familiar')}
                </p>
                <button
                  onClick={() => { setPhase('quiz'); setTick(Date.now()); }}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-accent-500 py-4 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:bg-accent-600 hover:shadow-xl active:scale-[0.97]"
                >
                  ▶ {t('common.start')}
                </button>
              </div>
            </div>
          )}

          {/* ---- Quiz Phase ---- */}
          {phase === 'quiz' && rounds[qIdx] && (
            <section className="mt-6 fade-up">
              {/* Gentle progress bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-base font-bold text-brand-600">
                  <span>{info.name}</span>
                  <span>{qIdx + 1} / {rounds.length}</span>
                </div>
                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-brand-100">
                  <div
                    className="h-full rounded-full bg-brand-400 transition-all duration-500 ease-out"
                    style={{ width: `${stepPct}%` }}
                  />
                </div>
              </div>

              {/* Emoji display */}
              <div className="mx-auto flex w-full max-w-xs flex-col items-center rounded-3xl bg-white px-6 py-10 shadow-md">
                <span className="text-7xl drop-shadow-sm" aria-hidden>{emojiFor(rounds[qIdx].item)}</span>
              </div>

              <p className="mt-5 text-center text-2xl font-extrabold text-brand-900 leading-snug">
                {t('region.familiar')}?
              </p>

              {/* Option tiles */}
              <div className="mt-5 flex flex-col gap-3">
                {rounds[qIdx].options.map((o) => (
                  <button
                    key={o}
                    onClick={() => answer(o)}
                    className="group w-full rounded-2xl border-2 border-transparent bg-white px-6 py-5 text-left text-xl font-bold text-brand-900 shadow-sm transition-all duration-200 hover:border-brand-200 hover:shadow-md active:scale-[0.98]"
                  >
                    <span className="pointer-events-none flex items-center justify-between gap-3">
                      {o}
                      <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-40">
                        ▸
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
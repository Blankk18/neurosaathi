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

  return (
    <div>
      <PageHeader inProgress={phase === 'quiz'} backTo="/games" showHome right={
        <span className="chip bg-brand-100 text-brand-700">{t('games.level')} {level}</span>
      } />

      {phase === 'done' && last ? (
        <div className="mt-4">
          <GameResultScreen result={last.result} decision={decision} onPlayAgain={() => setPhase('pick')} />
        </div>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-extrabold text-brand-900">{t('region.title')}</h1>

          {phase === 'pick' && (
            <div className="mt-4">
              <p className="text-lg font-semibold text-brand-700">{t('region.choose')}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {REGIONS.map((r) => (
                  <button
                    key={r.code}
                    onClick={() => {
                      setRegion(r.code);
                      dispatch({ type: 'UPDATE_SETTINGS', settings: {} });
                    }}
                    className={`card flex flex-col items-center gap-1 p-4 text-center ${region === r.code ? 'ring-4 ring-brand-300' : ''}`}
                  >
                    <span className="text-3xl" aria-hidden>{r.emoji}</span>
                    <span className="text-lg font-extrabold text-brand-900">{r.name}</span>
                    <span className="text-xs font-semibold text-neutral-500">{r.tagline}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <button onClick={begin} className="btn-huge">
                  ▶ {t('region.familiar')}
                </button>
              </div>
            </div>
          )}

          {phase === 'start' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 p-6">
              <div className="card max-w-sm text-center">
                <span className="text-5xl" aria-hidden>{info.emoji}</span>
                <h2 className="mt-2 text-2xl font-extrabold text-brand-900">{t('region.title')}</h2>
                <p className="mt-2 text-lg font-semibold text-brand-700">{info.name} · {t('region.familiar')}</p>
                <button onClick={() => { setPhase('quiz'); setTick(Date.now()); }} className="btn-huge mt-5">
                  ▶ {t('common.start')}
                </button>
              </div>
            </div>
          )}

          {phase === 'quiz' && rounds[qIdx] && (
            <div className="mt-4">
              <div className="text-base font-bold text-brand-600">
                {info.name} · {qIdx + 1}/{rounds.length}
              </div>
              <div className="mt-3 flex flex-col items-center rounded-3xl bg-white p-6 shadow-card">
                <span className="text-6xl" aria-hidden>{emojiFor(rounds[qIdx].item)}</span>
              </div>
              <p className="mt-3 text-center text-xl font-extrabold text-brand-900">
                {t('region.familiar')}?
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {rounds[qIdx].options.map((o) => (
                  <button key={o} onClick={() => answer(o)} className="card text-left text-lg font-bold text-brand-900 hover:shadow-lift">
                    {o}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
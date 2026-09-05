import { useState } from 'react';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { useGameSession } from './useGameSession';
import GameResultScreen from './GameResultScreen';

const EMOJIS = ['🍎', '🍌', '🍇', '🍊', '🔵', '🟥', '🟩', '⭐'];

interface Round {
  sequence: string[];
  options: string[];
  correct: string;
}

// rule builders produce the full target sequence; the player sees it minus the last item
function alternate(a: string, b: string, len: number): string[] {
  return Array.from({ length: len }, (_, i) => (i % 2 === 0 ? a : b));
}
function cycle(list: string[], len: number): string[] {
  return Array.from({ length: len }, (_, i) => list[i % list.length]);
}
function growing(a: string, len: number): string[] {
  return Array.from({ length: len }, (_, i) => (i < 2 ? a : i === 2 ? '🍇' : i === 3 ? '⭐' : a));
}

function drawRound(level: number, round: number): Round {
  const len = level >= 5 ? 7 : level === 4 ? 6 : level === 3 ? 5 : level === 2 ? 4 : 3;
  const builders = [
    () => alternate('🍎', '🍌', len),
    () => alternate('🔵', '🟥', len),
    () => cycle(['🍇', '🍊'], len),
    () => cycle(['🟩', '⭐', '🔵'], len),
    () => growing('🍎', len),
  ];
  const seq = builders[(round + level) % builders.length]();
  const correct = seq[seq.length - 1];
  const distractors = EMOJIS.filter((e) => e !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
  return { sequence: seq.slice(0, -1), options, correct };
}

export default function PatternGame() {
  const { t, state } = useApp();
  const { finish, last, decision } = useGameSession('pattern');

  const level = last?.result.nextDifficulty ?? (state.profile?.difficulty.pattern ?? 1);
  const TOTAL_ROUNDS = 5;

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'start' | 'play' | 'done'>('start');
  const [r, setR] = useState<Round>(() => drawRound(level, 0));
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [tick, setTick] = useState(() => Date.now());
  const [picked, setPicked] = useState<string | null>(null);

  const start = () => {
    setRound(0);
    setCorrect(0);
    setMistakes(0);
    setTimes([]);
    setR(drawRound(level, 0));
    setPhase('play');
    setTick(Date.now());
  };

  const choose = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const rt = (Date.now() - tick) / 1000;
    const isCorrect = opt === r.correct;
    const newCorrect = isCorrect ? correct + 1 : correct;
    const newMistakes = isCorrect ? mistakes : mistakes + 1;
    setCorrect(newCorrect);
    setMistakes(newMistakes);
    setTimes((x) => [...x, rt]);
    setTick(Date.now());

    window.setTimeout(() => {
      setPicked(null);
      if (round < TOTAL_ROUNDS - 1) {
        setRound((n) => n + 1);
        setR(drawRound(level, round + 1));
      } else {
        setPhase('done');
        finish({ correct: newCorrect, total: TOTAL_ROUNDS, responseTimes: [...times, rt], mistakes: newMistakes });
      }
    }, 900);
  };

  return (
    <div>
      <PageHeader inProgress={phase !== 'done'} backTo="/games" showHome right={
        <span className="chip bg-brand-100 text-brand-700">{t('games.level')} {level}</span>
      } />

      {phase === 'done' && last ? (
        <div className="mt-4">
          <GameResultScreen result={last.result} decision={decision} onPlayAgain={start} />
        </div>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-extrabold text-brand-900">{t('games.pattern')}</h1>

          {phase === 'start' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 p-6">
              <div className="card max-w-sm text-center">
                <span className="text-5xl" aria-hidden>🔀</span>
                <h2 className="mt-2 text-2xl font-extrabold text-brand-900">{t('games.pattern')}</h2>
                <p className="mt-2 text-lg font-semibold text-brand-700">{t('pattern.question')}</p>
                <button onClick={start} className="btn-huge mt-5">
                  ▶ {t('common.start')}
                </button>
              </div>
            </div>
          )}

          {phase === 'play' && (
            <div className="mt-4">
              <div className="text-base font-bold text-brand-600">
                {t('pattern.watch')} · {round + 1}/{TOTAL_ROUNDS}
              </div>
              <div className="mt-4 flex min-h-20 flex-wrap items-center justify-center gap-2 rounded-3xl bg-white p-4 shadow-card">
                {r.sequence.map((e, i) => (
                  <span key={i} className="text-4xl">{e}</span>
                ))}
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-dashed border-brand-300 text-2xl">
                  ?
                </span>
              </div>
              <p className="mt-4 text-center text-xl font-extrabold text-brand-900">{t('pattern.question')}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {r.options.map((o) => (
                  <button
                    key={o}
                    onClick={() => choose(o)}
                    className={`tile h-24 text-5xl transition hover:shadow-lift ${
                      picked ? (o === r.correct ? 'ring-4 ring-brand-400' : o === picked ? 'ring-4 ring-accent-400 opacity-60' : 'opacity-40') : ''
                    }`}
                  >
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
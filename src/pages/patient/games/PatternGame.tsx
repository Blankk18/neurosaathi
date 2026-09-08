import { useState } from 'react';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui';
import { BrainIcon, CheckCircleIcon, PlayIcon, TargetIcon, SparkleIcon } from '@/components/Icons';
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

  const done = phase === 'done';
  const progressSlots = Array.from({ length: TOTAL_ROUNDS }, (_, i) => i);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader inProgress={!done} backTo="/games" showHome right={
        <span className="chip bg-brand-100 text-brand-700">
          <SparkleIcon size={14} className="text-brand-600" /> {t('games.level')} {level}
        </span>
      } />

      {done && last ? (
        <div className="mt-4">
          <GameResultScreen result={last.result} decision={decision} onPlayAgain={start} />
        </div>
      ) : (
        <div className="mt-2">
          {phase === 'start' && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/85 p-6 backdrop-blur-sm"
              role="dialog"
              aria-label={t('games.pattern')}
            >
              <div className="card w-full max-w-md text-center pop fade-up">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-brand-600 shadow-card">
                  <BrainIcon size={48} />
                </div>
                <h2 className="mt-5 text-3xl font-extrabold text-brand-900">{t('games.pattern')}</h2>
                <p className="mx-auto mt-3 max-w-xs text-xl font-semibold text-brand-700">
                  {t('pattern.question')}
                </p>
                <div className="mt-5 flex justify-center">
                  <Button variant="huge" onClick={start} className="w-full sm:w-auto sm:px-12">
                    <PlayIcon size={20} /> {t('common.start')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {phase === 'play' && (
            <div className="mt-4 fade-up">
              {/* Calm header: watch label + gentle step progress */}
              <div className="flex items-center justify-between gap-4">
                <span className="chip bg-brand-100 text-brand-700">
                  <TargetIcon size={14} className="text-brand-600" /> {t('pattern.watch')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5" aria-hidden>
                    {progressSlots.map((i) => (
                      <span
                        key={i}
                        className={`h-2.5 w-2.5 rounded-full transition-colors ${
                          i <= round ? 'bg-brand-400' : 'bg-brand-100'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-base font-bold text-brand-600">
                    {round + 1}/{TOTAL_ROUNDS}
                  </span>
                </div>
              </div>

              {/* The pattern itself — gentle fade-in reveal */}
              <div className="mt-4 flex min-h-24 flex-wrap items-center justify-center gap-3 rounded-3xl bg-brand-50 p-5 shadow-card border border-brand-100">
                {r.sequence.map((e, i) => (
                  <span
                    key={i}
                    className="fade-in text-5xl"
                    style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'backwards' }}
                    aria-hidden
                  >
                    {e}
                  </span>
                ))}
                <span className="fade-in flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-dashed border-brand-300 bg-white/70 text-2xl font-extrabold text-brand-400">
                  ?
                </span>
              </div>

              <p className="mt-5 text-center text-2xl font-extrabold text-brand-900">{t('pattern.question')}</p>

              {/* Option tiles — large, tappable, gentle selection state */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                {r.options.map((o) => (
                  <button
                    key={o}
                    onClick={() => choose(o)}
                    aria-label={o}
                    className={`tile h-28 text-5xl transition-all duration-200 hover:shadow-lift active:scale-[0.98] ${
                      picked
                        ? o === r.correct
                          ? 'ring-4 ring-brand-400'
                          : o === picked
                            ? 'ring-4 ring-accent-400 opacity-60'
                            : 'opacity-40'
                        : ''
                    }`}
                    style={!picked ? { animation: 'fadeUp 0.35s ease' } : undefined}
                  >
                    {o}
                  </button>
                ))}
              </div>

              {/* Encouraging feedback (visual only while a choice is shown) */}
              <div className="mt-4 flex min-h-9 items-center justify-center">
                {picked && (
                  <div className={`flex items-center gap-2 text-lg font-bold pop ${picked === r.correct ? 'text-brand-600' : 'text-warm-500'}`}>
                    {picked === r.correct ? (
                      <>
                        <CheckCircleIcon size={22} /> {t('pattern.correct')}
                      </>
                    ) : (
                      '💛'
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
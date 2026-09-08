import { useEffect, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { Card, Chip } from '@/components/ui';
import { BrainIcon, CheckCircleIcon, ChevronRightIcon, ClockIcon, SparkleIcon, TimerIcon } from '@/components/Icons';
import { useGameSession } from './useGameSession';
import GameResultScreen from './GameResultScreen';

interface RoutineItem {
  id: string;
  timeKey: string;
  taskKey: string;
  emoji: string;
}

const ROUTINE: RoutineItem[] = [
  { id: 'wakeup', timeKey: 'routine.time.wakeup', taskKey: 'routine.task.wakeup', emoji: '🌅' },
  { id: 'breakfast', timeKey: 'routine.time.breakfast', taskKey: 'routine.task.breakfast', emoji: '🍳' },
  { id: 'medicine', timeKey: 'routine.time.medicine', taskKey: 'routine.task.medicine', emoji: '💊' },
  { id: 'tea', timeKey: 'routine.time.tea', taskKey: 'routine.task.tea', emoji: '🍵' },
  { id: 'lunch', timeKey: 'routine.time.lunch', taskKey: 'routine.task.lunch', emoji: '🍚' },
  { id: 'walk', timeKey: 'routine.time.walk', taskKey: 'routine.task.walk', emoji: '🚶' },
];

interface Q {
  promptKey: string;
  options: string[];
  correct: string;
}

const QUESTIONS: Q[] = [
  { promptKey: 'routine.q1.prompt', options: ['routine.task.medicine', 'routine.task.tea', 'routine.task.lunch', 'routine.task.wakeup'], correct: 'routine.task.medicine' },
  { promptKey: 'routine.q2.prompt', options: ['routine.time.wakeup', 'routine.time.medicine', 'routine.time.lunch', 'routine.time.walk'], correct: 'routine.time.medicine' },
  { promptKey: 'routine.q3.prompt', options: ['routine.task.lunch', 'routine.task.walk', 'routine.task.tea', 'routine.task.medicine'], correct: 'routine.task.walk' },
  { promptKey: 'routine.q4.prompt', options: ['routine.time.tea', 'routine.time.breakfast', 'routine.time.lunch', 'routine.time.walk'], correct: 'routine.time.lunch' },
  { promptKey: 'routine.q5.prompt', options: ['routine.task.wakeup', 'routine.task.breakfast', 'routine.task.tea', 'routine.task.lunch'], correct: 'routine.task.wakeup' },
];

// Difficulty scaling: higher level → shorter schedule viewing time (8–12s)
// and more recall questions (3–5).
const showSecsFor = (level: number) => Math.min(12, Math.max(8, 13 - level));
const questionCountFor = (level: number) => Math.min(5, Math.max(3, 2 + level));

export default function RoutineRecall() {
  const { t, state } = useApp();
  const { finish, last, decision } = useGameSession('routine');

  const level = last?.result.nextDifficulty ?? (state.profile?.difficulty.routine ?? 1);
  const showSecs = showSecsFor(level);
  const questions = QUESTIONS.slice(0, questionCountFor(level));

  const [phase, setPhase] = useState<'start' | 'review' | 'quiz' | 'done'>('start');
  const [qIdx, setQIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [left, setLeft] = useState(showSecs);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (phase !== 'review') return;
    setLeft(showSecs);
    const iv = setInterval(() => setLeft((s) => s - 1), 1000);
    const tmo = setTimeout(() => setPhase('quiz'), showSecs * 1000);
    return () => {
      clearInterval(iv);
      clearTimeout(tmo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = () => {
    setQIdx(0);
    setCorrect(0);
    setMistakes(0);
    setTimes([]);
    setPhase('review');
    setTick(Date.now());
  };

  const answer = (optKey: string) => {
    const rt = (Date.now() - tick) / 1000;
    const isCorrect = optKey === questions[qIdx].correct;
    const newCorrect = isCorrect ? correct + 1 : correct;
    const newMistakes = isCorrect ? mistakes : mistakes + 1;
    const newTimes = [...times, rt];
    setCorrect(newCorrect);
    setMistakes(newMistakes);
    setTimes(newTimes);
    setTick(Date.now());
    if (qIdx < questions.length - 1) setQIdx((i) => i + 1);
    else {
      setPhase('done');
      finish({ correct: newCorrect, total: questions.length, responseTimes: newTimes, mistakes: newMistakes });
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <PageHeader
        title={t('games.routine')}
        inProgress={phase === 'review' || phase === 'quiz'}
        backTo="/games"
        showHome
        right={<Chip tone="brand">{t('games.level')} {level}</Chip>}
      />

      {phase === 'done' && last ? (
        <div className="mt-4">
          <GameResultScreen result={last.result} decision={decision} onPlayAgain={start} />
        </div>
      ) : (
        <>
          {phase === 'start' && (
            <div className="fade-up">
              <Card className="mt-6 overflow-hidden border border-brand-100 p-0 text-center">
                {/* soft accent top bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-brand-200 via-brand-300 to-warm-200" aria-hidden />
                <div className="px-6 pb-7 pt-7 sm:px-8 sm:pb-8 sm:pt-8">
                  {/* calendar emblem */}
                  <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border border-brand-100 bg-brand-50 text-5xl shadow-soft" aria-hidden>
                    🗓️
                  </div>
                  <div className="mt-4 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-extrabold tracking-wide text-brand-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden /> {t('games.routine')}
                    </span>
                  </div>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-900">{t('routine.title')}</h2>
                  <p className="mx-auto mt-2 max-w-[32ch] text-[15px] font-semibold leading-relaxed text-neutral-500">{t('routine.watch.hint')}</p>

                  <div className="divider my-5" />

                  {/* meta pills — elder-readable, warm */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-canvas px-4 py-3.5 text-left">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
                        <TimerIcon size={20} />
                      </span>
                      <div>
                        <div className="text-[11px] font-extrabold uppercase tracking-widest text-brand-400">Viewing time</div>
                        <div className="text-base font-extrabold text-brand-900">⏱ {showSecs} {t('routine.secs')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-canvas px-4 py-3.5 text-left">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
                        <BrainIcon size={20} />
                      </span>
                      <div>
                        <div className="text-[11px] font-extrabold uppercase tracking-widest text-brand-400">Recall</div>
                        <div className="text-base font-extrabold text-brand-900">❓ {questions.length} {t('games.questions')}</div>
                      </div>
                    </div>
                  </div>

                  {/* reassurance */}
                  <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-warm-600">
                    <SparkleIcon size={16} /> Take your time — no rush.
                  </p>

                  <button onClick={start} className="btn-huge mt-6">
                    ▶ {t('routine.ready')}
                  </button>
                  <p className="mt-3 text-xs font-semibold text-neutral-400">You can review the routine once more before we begin.</p>
                </div>
              </Card>
            </div>
          )}

          {phase === 'review' && (
            <Card className="fade-up mt-6 overflow-hidden border border-brand-100 p-0">
              {/* gentle countdown bar */}
              <div className="h-1.5 w-full bg-brand-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.max(0, Math.min(100, (left / showSecs) * 100))}%` }}
                  role="progressbar"
                  aria-valuenow={Math.max(0, left)}
                  aria-valuemin={0}
                  aria-valuemax={showSecs}
                />
              </div>
              <div className="px-5 py-6 sm:px-6 sm:py-7">
                {/* header row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-extrabold shadow-soft ${left <= 3 ? 'border-warm-200 bg-warm-50 text-warm-700' : 'border-brand-200 bg-brand-50 text-brand-700'}`}>
                      <TimerIcon size={16} /> ⏳ {Math.max(0, left)} {t('routine.secs')}
                    </span>
                    <span className="hidden items-center gap-1 text-sm font-bold text-neutral-400 sm:inline-flex">
                      <ClockIcon size={16} /> Level {level}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-warm-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-warm-400 animate-pulse" aria-hidden /> Memorizing
                  </span>
                </div>

                <div className="mt-4 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-3xl" aria-hidden>🗓️</div>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-900">🗓️ {t('routine.watch')}</h2>
                  <p className="mt-1 text-sm font-semibold text-neutral-500">{t('routine.memorizing')}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-400">Study the order — it will be just as shown when we ask.</p>
                </div>

                {/* ordered routine — calm timeline style */}
                <div className="relative mt-6">
                  {/* vertical rail */}
                  <div className="pointer-events-none absolute bottom-4 left-[19px] top-4 hidden w-px bg-brand-100 sm:block" aria-hidden />
                  <div className="space-y-3">
                    {ROUTINE.map((r, idx) => (
                      <div key={r.id} className="group relative flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-3.5 py-3.5 shadow-card transition hover:border-brand-200 hover:shadow-lift sm:gap-4 sm:px-4">
                        {/* order number */}
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-extrabold text-white shadow-soft" aria-hidden>
                          {idx + 1}
                        </span>
                        {/* emoji tile */}
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-warm-200 bg-warm-50 text-2xl" aria-hidden>{r.emoji}</span>
                        {/* task copy */}
                        <span className="min-w-0 flex-1 text-left text-[17px] font-extrabold leading-tight text-brand-900">{t(r.taskKey)}</span>
                        {/* time chip */}
                        <span className="chip shrink-0 border border-brand-100 bg-brand-50 text-brand-700">{t(r.timeKey)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-brand-100 bg-canvas px-4 py-3 text-center">
                  <p className="text-sm font-bold leading-relaxed text-brand-700">
                    <CheckCircleIcon size={16} className="mr-1 inline align-text-bottom text-brand-500" />
                    Tip: picture yourself doing each step in order — it makes recall gentler.
                  </p>
                </div>

                <button onClick={() => setPhase('quiz')} className="mt-5 w-full rounded-2xl bg-brand-600 px-6 py-4 text-lg font-extrabold text-white shadow-lift transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200">
                  ✓ {t('routine.ready')}
                </button>
                <p className="mt-2 text-center text-xs font-semibold text-neutral-400">Or wait — we will continue automatically.</p>
              </div>
            </Card>
          )}

          {phase === 'quiz' && (
            <Card className="fade-up mt-6 overflow-hidden border border-brand-100 p-0">
              {/* segmented progress — calm & legible */}
              <div className="border-b border-brand-100 bg-canvas px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm font-extrabold text-brand-700 shadow-soft">
                    <BrainIcon size={16} /> ❓ {qIdx + 1} / {questions.length}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
                    Question {qIdx + 1} of {questions.length}
                  </span>
                </div>
                <div className="mt-3 flex gap-1.5">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-all duration-300 ${i < qIdx ? 'bg-brand-400' : i === qIdx ? 'bg-brand-600 shadow-soft' : 'bg-brand-100'}`}
                      aria-hidden
                    />
                  ))}
                </div>
                {/* linear fallback for screen readers */}
                <div className="sr-only" role="progressbar" aria-valuenow={qIdx + 1} aria-valuemin={1} aria-valuemax={questions.length}>
                  {qIdx + 1} of {questions.length}
                </div>
              </div>

              <div className="px-5 py-6 text-center sm:px-6 sm:py-7">
                <h2 className="text-balance text-2xl font-extrabold leading-tight tracking-tight text-brand-900 sm:text-[1.7rem]">{t(questions[qIdx].promptKey)}</h2>
                <p className="mt-2 text-sm font-semibold text-neutral-500">{t('routine.recall.hint')}</p>

                <div className="mt-6 grid gap-3 text-left">
                  {questions[qIdx].options.map((o, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <button
                        key={o}
                        onClick={() => answer(o)}
                        className="group flex w-full items-center gap-4 rounded-2xl border-2 border-brand-100 bg-white px-4 py-5 text-left shadow-card transition hover:border-brand-200 hover:shadow-lift focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 active:scale-[0.99] sm:px-5"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-sm font-extrabold tracking-wide text-brand-700 transition group-hover:bg-brand-100">
                          {letter}
                        </span>
                        <span className="flex-1 text-[19px] font-extrabold leading-snug text-brand-900">{t(o)}</span>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-neutral-400 transition group-hover:bg-brand-50 group-hover:text-brand-600">
                          <ChevronRightIcon size={18} />
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-5 text-center text-xs font-semibold leading-relaxed text-neutral-400">
                  Tap the answer that feels right — there is no rush, and every try helps.
                </p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

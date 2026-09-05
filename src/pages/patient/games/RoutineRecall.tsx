import { useEffect, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
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
        right={<span className="chip bg-brand-100 text-brand-700">{t('games.level')} {level}</span>}
      />

      {phase === 'done' && last ? (
        <div className="mt-4">
          <GameResultScreen result={last.result} decision={decision} onPlayAgain={start} />
        </div>
      ) : (
        <>
          {phase === 'start' && (
            <div className="mt-6 rounded-3xl bg-white p-6 text-center shadow-card">
              <span className="text-5xl" aria-hidden>🗓️</span>
              <h2 className="mt-3 text-2xl font-extrabold text-brand-900">{t('routine.title')}</h2>
              <p className="mt-2 text-lg font-semibold text-neutral-600">{t('routine.watch.hint')}</p>
              <div className="mt-3 text-base font-bold text-brand-600">
                ⏱ {showSecs} {t('routine.secs')} · ❓ {questions.length} {t('games.questions')}
              </div>
              <button onClick={start} className="btn-huge mt-5">
                ▶ {t('routine.ready')}
              </button>
            </div>
          )}

          {phase === 'review' && (
            <div className="mt-6 rounded-3xl bg-white p-6 text-center shadow-card">
              <div className="mb-2 text-sm font-bold text-brand-600">⏳ {Math.max(0, left)} {t('routine.secs')}</div>
              <h2 className="text-xl font-extrabold text-brand-900">🗓️ {t('routine.watch')}</h2>
              <p className="mt-1 text-base font-semibold text-neutral-600">{t('routine.memorizing')}</p>
              <div className="mt-4 space-y-2">
                {ROUTINE.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-brand-50 p-3">
                    <span className="text-2xl" aria-hidden>{r.emoji}</span>
                    <span className="flex-1 text-left text-lg font-extrabold text-brand-900">{t(r.taskKey)}</span>
                    <span className="chip bg-brand-100 text-brand-700">{t(r.timeKey)}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setPhase('quiz')} className="mt-4 rounded-full bg-brand-600 px-5 py-2 font-bold text-white hover:bg-brand-700">
                ✓ {t('routine.ready')}
              </button>
            </div>
          )}

          {phase === 'quiz' && (
            <div className="mt-6 rounded-3xl bg-white p-6 text-center shadow-card">
              <div className="text-base font-bold text-brand-600">❓ {qIdx + 1} / {questions.length}</div>
              <h2 className="mt-2 text-2xl font-extrabold text-brand-900">{t(questions[qIdx].promptKey)}</h2>
              <p className="mt-1 text-base font-semibold text-neutral-500">{t('routine.recall.hint')}</p>
              <div className="mt-4 space-y-3">
                {questions[qIdx].options.map((o) => (
                  <button key={o} onClick={() => answer(o)} className="card flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-50 px-4 py-4 text-center text-xl font-bold text-brand-900 hover:shadow-lift">
                    {t(o)}
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

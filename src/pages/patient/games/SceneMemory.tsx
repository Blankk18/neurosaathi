import { useEffect, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui';
import { BrainIcon, TimerIcon, TargetIcon, CheckCircleIcon, ChevronRightIcon } from '@/components/Icons';
import { LEVEL_TO_SCENE_SECS } from '@/engine/adaptive';
import { useGameSession } from './useGameSession';
import GameResultScreen from './GameResultScreen';

interface SceneItem {
  emoji: string;
  labelKey: string;
  style: React.CSSProperties;
}

const SCENE: SceneItem[] = [
  { emoji: '🏠', labelKey: 'scene.item.house', style: { top: '6%', left: '38%', fontSize: 44 } },
  { emoji: '🍵', labelKey: 'scene.item.teacups', style: { top: '30%', left: '12%', fontSize: 32 } },
  { emoji: '🍇', labelKey: 'scene.item.fruit', style: { top: '28%', left: '72%', fontSize: 34 } },
  { emoji: '🎒', labelKey: 'scene.item.bag', style: { top: '62%', left: '10%', fontSize: 36 } },
  { emoji: '☂️', labelKey: 'scene.item.umbrella', style: { top: '20%', left: '26%', fontSize: 40 } },
  { emoji: '🌿', labelKey: 'scene.item.plants', style: { top: '58%', left: '78%', fontSize: 34 } },
  { emoji: '🚲', labelKey: 'scene.item.bicycle', style: { top: '66%', left: '46%', fontSize: 40 } },
  { emoji: '👧', labelKey: 'scene.item.child', style: { top: '38%', left: '60%', fontSize: 38 } },
  { emoji: '🧣', labelKey: 'scene.item.shawl', style: { top: '10%', left: '70%', fontSize: 32 } },
];

interface Q {
  promptKey: string;
  optionsKeys: string[];
  correctKey: string;
}

export default function SceneMemory() {
  const { t, state } = useApp();
  const { finish, last, decision } = useGameSession('scene-memory');

  const level = last?.result.nextDifficulty ?? (state.profile?.difficulty['scene-memory'] ?? 1);
  const watchSecs = LEVEL_TO_SCENE_SECS[level] ?? 10;

  const questions: Q[] = [
    { promptKey: 'scene.q1.prompt', optionsKeys: ['scene.q1.o1', 'scene.q1.o2', 'scene.q1.o3', 'scene.q1.o4'], correctKey: 'scene.q1.correct' },
    { promptKey: 'scene.q2.prompt', optionsKeys: ['scene.q2.o1', 'scene.q2.o2', 'scene.q2.o3', 'scene.q2.o4'], correctKey: 'scene.q2.correct' },
    { promptKey: 'scene.q3.prompt', optionsKeys: ['scene.q3.o1', 'scene.q3.o2', 'scene.q3.o3', 'scene.q3.o4'], correctKey: 'scene.q3.correct' },
    { promptKey: 'scene.q4.prompt', optionsKeys: ['scene.q4.o1', 'scene.q4.o2', 'scene.q4.o3', 'scene.q4.o4'], correctKey: 'scene.q4.correct' },
  ];

  const [phase, setPhase] = useState<'start' | 'watch' | 'quiz' | 'done'>('start');
  const [countdown, setCountdown] = useState(watchSecs);
  const [qIdx, setQIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [respTimes, setRespTimes] = useState<number[]>([]);
  const [tick, setTick] = useState(() => Date.now());
  // Presentation-only: gentle nudge for the last answer (true = correct, false = incorrect, null = none yet).
  const [feedback, setFeedback] = useState<boolean | null>(null);

  useEffect(() => {
    if (phase !== 'watch') return;
    const iv = setInterval(() => setCountdown((s) => s - 1), 1000);
    const tmo = setTimeout(() => {
      setPhase('quiz');
      setTick(Date.now());
    }, watchSecs * 1000);
    return () => {
      clearInterval(iv);
      clearTimeout(tmo);
    };
  }, [phase, watchSecs]);

  const restart = () => {
    setPhase('start');
    setQIdx(0);
    setCorrect(0);
    setMistakes(0);
    setRespTimes([]);
    setFeedback(null);
  };

  const answer = (opt: string) => {
    const rt = (Date.now() - tick) / 1000;
    const isCorrect = opt === t(questions[qIdx].correctKey);
    setFeedback(isCorrect);
    const newCorrect = isCorrect ? correct + 1 : correct;
    const newMistakes = isCorrect ? mistakes : mistakes + 1;
    const newTimes = [...respTimes, rt];
    setCorrect(newCorrect);
    setMistakes(newMistakes);
    setRespTimes(newTimes);
    setTick(Date.now());
    if (qIdx < questions.length - 1) {
      setQIdx((i) => i + 1);
    } else {
      setPhase('done');
      finish({ correct: newCorrect, total: questions.length, responseTimes: newTimes, mistakes: newMistakes });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title={t('games.scene')}
        subtitle={t('games.scene.desc')}
        inProgress={phase !== 'done'}
        backTo="/games"
        showHome
        right={
          <span className="chip bg-brand-100 text-brand-700">{t('games.level')} {level}</span>
        }
      />

      {phase === 'done' && last && decision ? (
        <div className="mt-4">
          <GameResultScreen result={last.result} decision={decision} onPlayAgain={restart} />
        </div>
      ) : (
        <>
          {phase === 'start' && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/85 p-6 backdrop-blur-sm"
              role="dialog"
              aria-label={t('games.scene')}
            >
              <div className="card w-full max-w-md text-center pop fade-up">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-brand-600 shadow-card">
                  <BrainIcon size={48} />
                </div>
                <h2 className="mt-5 text-3xl font-extrabold text-brand-900">{t('games.scene')}</h2>
                <p className="mt-2 text-xl font-semibold text-brand-700">{t('scene.watch')}</p>
                <p className="mx-auto mt-2 max-w-xs text-lg font-semibold text-neutral-500">{t('scene.watch.hint')}</p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-warm-50 px-4 py-2 text-base font-bold text-warm-600">
                  <TimerIcon size={18} /> {watchSecs} {t('routine.secs')}
                </div>
                <div className="mt-6">
                  <Button variant="huge" onClick={() => { setPhase('watch'); setCountdown(watchSecs); }}>
                    ▶ {t('scene.ready')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {phase === 'watch' && (
            <div className="mt-4 fade-up">
              {/* Calm header: watch label + gentle countdown pill */}
              <div className="flex items-center justify-between gap-4">
                <span className="chip bg-brand-100 text-brand-700">
                  <TargetIcon size={14} className="text-brand-600" /> {t('scene.watch')}
                </span>
                <span className={`chip ${countdown <= 3 ? 'bg-warm-100 text-warm-600' : 'bg-brand-50 text-brand-700'}`}>
                  <TimerIcon size={14} /> {countdown}s
                </span>
              </div>

              {/* The scene — large, framed, calm */}
              <div className="relative mt-4 h-80 w-full overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-b from-brand-50 via-warm-50 to-brand-100 shadow-card">
                {SCENE.map((it, i) => (
                  <span key={it.labelKey + i} className="absolute" style={it.style} title={t(it.labelKey)} aria-label={t(it.labelKey)}>
                    {it.emoji}
                  </span>
                ))}
                {/* ground */}
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-brand-200/60" />
              </div>

              <p className="mt-3 text-center text-lg font-semibold text-neutral-500">{t('scene.watch.hint')}</p>
            </div>
          )}

          {phase === 'quiz' && (
            <div className="mt-4 fade-up" key={qIdx}>
              {/* Legible progress: gentle bar + step counter */}
              <div className="flex items-center justify-between gap-4">
                <span className="chip bg-brand-100 text-brand-700">
                  <TargetIcon size={14} className="text-brand-600" /> {t('scene.question')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-brand-100" aria-hidden>
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-500"
                      style={{ width: `${((qIdx + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-base font-bold text-brand-600">❓ {qIdx + 1} / {questions.length}</span>
                </div>
              </div>

              {/* Gentle feedback for the last answer (never a harsh error) */}
              <div className="mt-3 flex min-h-9 items-center justify-center">
                {feedback === null ? (
                  <p className="text-base font-semibold text-neutral-500">{t('routine.recall.hint')}</p>
                ) : feedback ? (
                  <p className="flex items-center gap-2 text-lg font-bold text-brand-600 pop">
                    <CheckCircleIcon size={20} /> {t('pattern.correct')}
                  </p>
                ) : (
                  <p className="text-lg pop text-warm-500">💛</p>
                )}
              </div>

              <h2 className="mt-2 text-2xl font-extrabold text-brand-900 sm:text-3xl">{t(questions[qIdx].promptKey)}</h2>

              <div className="mt-4 grid grid-cols-1 gap-3">
                {questions[qIdx].optionsKeys.map((ok) => { const o = t(ok); return (
                  <button key={o} onClick={() => answer(o)} className="card flex w-full items-center gap-4 text-left text-xl font-bold text-brand-900 transition hover:shadow-lift active:scale-[0.99]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">✓</span>
                    <span className="flex-1">{o}</span>
                    <ChevronRightIcon size={22} className="shrink-0 text-brand-300" />
                  </button>); })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

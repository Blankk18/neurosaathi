import { useEffect, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
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
  };

  const answer = (opt: string) => {
    const rt = (Date.now() - tick) / 1000;
    const isCorrect = opt === t(questions[qIdx].correctKey);
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
    <div>
      <PageHeader inProgress={phase !== 'done'} backTo="/games" showHome right={
        <span className="chip bg-brand-100 text-brand-700">{t('games.level')} {level}</span>
      } />

      {phase === 'done' && last && decision ? (
        <div className="mt-4">
          <GameResultScreen result={last.result} decision={decision} onPlayAgain={restart} />
        </div>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-extrabold text-brand-900">{t('games.scene')}</h1>

          {phase === 'start' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 p-6">
              <div className="card max-w-sm text-center">
                <span className="text-5xl" aria-hidden>🖼️</span>
                <h2 className="mt-2 text-2xl font-extrabold text-brand-900">{t('scene.watch')}</h2>
                <p className="mt-2 text-lg font-semibold text-brand-700">{t('scene.watch.hint')}</p>
                <p className="mt-2 text-sm font-bold text-neutral-500">⏱ {watchSecs} {t('routine.secs')}</p>
                <button onClick={() => { setPhase('watch'); setCountdown(watchSecs); }} className="btn-huge mt-5">
                  ▶ {t('scene.ready')}
                </button>
              </div>
            </div>
          )}

          {phase === 'watch' && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between text-base font-bold text-brand-600">
                <span>{t('scene.watch')}</span>
                <span>⏳ {countdown}s</span>
              </div>
              <div className="relative h-80 w-full overflow-hidden rounded-3xl border-4 border-brand-100 bg-gradient-to-b from-brand-50 via-warm-50 to-brand-100">
                {SCENE.map((it, i) => (
                  <span key={it.labelKey + i} className="absolute" style={it.style} title={t(it.labelKey)} aria-label={t(it.labelKey)}>
                    {it.emoji}
                  </span>
                ))}
                {/* ground */}
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-brand-200/60" />
              </div>
              <p className="mt-2 text-center text-base font-semibold text-neutral-500">{t('scene.watch.hint')}</p>
            </div>
          )}

          {phase === 'quiz' && (
            <div className="mt-4">
              <div className="text-base font-bold text-brand-600">
                ❓ {qIdx + 1} / {questions.length}
              </div>
              <h2 className="mt-2 text-2xl font-extrabold text-brand-900">{t(questions[qIdx].promptKey)}</h2>
              <div className="mt-4 grid grid-cols-1 gap-3">
                {questions[qIdx].optionsKeys.map((ok) => { const o = t(ok); return (
                  <button key={o} onClick={() => answer(o)} className="card flex items-center gap-3 text-left text-xl font-bold text-brand-900 hover:shadow-lift">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg">✓</span>
                    {o}
                  </button>); })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
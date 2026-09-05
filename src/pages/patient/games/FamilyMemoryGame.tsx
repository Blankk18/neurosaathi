import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { useGameSession } from './useGameSession';
import GameResultScreen from './GameResultScreen';
import { loadImage } from '@/services/storage';
import type { FamilyMemory } from '@/types';

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface Q {
  kind: 'who' | 'relationship' | 'likes';
  target: FamilyMemory;
  options: string[];
  correct: string;
}

type Tr = (key: string, params?: Record<string, string | number>) => string;

function buildQuestions(family: FamilyMemory[], tr: Tr): Q[] {
  if (family.length === 0) return [];
  const shuffled = [...family].sort(() => Math.random() - 0.5);
  const target = shuffled[0];
  const others = family.filter((f) => f.id !== target.id);
  const fallbackInfo = tr('family.info.fallback');
  const pick = (correct: string): string[] => {
    const dist = others.map((o) => o.relationship).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
    return [correct, ...dist].sort(() => Math.random() - 0.5);
  };
  return [
    { kind: 'who', target, options: shuffled.length > 1 ? shuffled.map((f) => f.name) : [target.name], correct: target.name },
    {
      kind: 'relationship',
      target,
      options: pick(target.relationship),
      correct: target.relationship,
    },
    {
      kind: 'likes',
      target,
      options: (() => {
        const info = target.info || fallbackInfo;
        const fillers = [tr('family.filler.gardening'), tr('family.filler.driving'), tr('family.filler.sleeping')];
        return [info, ...fillers.filter((f) => f !== info).slice(0, 3)].sort(() => Math.random() - 0.5);
      })(),
      correct: target.info || fallbackInfo,
    },
  ];
}

export default function FamilyMemoryGame() {
  const { t, state } = useApp();
  const { finish, last, decision } = useGameSession('family-memory');

  const family = state.familyMemories;
  const level = last?.result.nextDifficulty ?? (state.profile?.difficulty['family-memory'] ?? 1);

  const [phase, setPhase] = useState<'start' | 'quiz' | 'done'>('start');
  const [q, setQ] = useState<Q[]>(() => buildQuestions(family, t));
  const [qIdx, setQIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [tick, setTick] = useState(() => Date.now());
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    if (q[0]?.target?.id) {
      loadImage(`fam-${q[0].target.id}`).then((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => setImg(String(reader.result));
          reader.readAsDataURL(blob);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = () => {
    setQ(buildQuestions(family, t));
    setQIdx(0);
    setCorrect(0);
    setMistakes(0);
    setTimes([]);
    setPhase('quiz');
    setTick(Date.now());
  };

  const answer = (opt: string) => {
    const rt = (Date.now() - tick) / 1000;
    const isCorrect = opt === q[qIdx].correct;
    const newCorrect = isCorrect ? correct + 1 : correct;
    const newMistakes = isCorrect ? mistakes : mistakes + 1;
    const newTimes = [...times, rt];
    setCorrect(newCorrect);
    setMistakes(newMistakes);
    setTimes(newTimes);
    setTick(Date.now());
    if (qIdx < q.length - 1) {
      setQIdx((i) => i + 1);
      loadImage(`fam-${q[qIdx + 1]?.target?.id}`).then((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => setImg(String(reader.result));
          reader.readAsDataURL(blob);
        } else setImg(null);
      });
    } else {
      setPhase('done');
      finish({ correct: newCorrect, total: q.length, responseTimes: newTimes, mistakes: newMistakes });
    }
  };

  const target = q[qIdx]?.target;

  return (
    <div>
      <PageHeader inProgress={phase !== 'done'} backTo="/games" showHome right={
        <span className="chip bg-brand-100 text-brand-700">{t('games.level')} {level}</span>
      } />

      {phase === 'done' && last ? (
        <div className="mt-4">
          <GameResultScreen result={last.result} decision={decision} onPlayAgain={start} />
          <div className="mt-3 text-center text-sm font-semibold text-neutral-500">{t('family.demo.note')}</div>
        </div>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-extrabold text-brand-900">{t('games.family')}</h1>

          {family.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-lg font-semibold text-neutral-500">{t('family.empty')}</p>
              <Link to="/memories" className="btn-primary mt-4 inline-block">
                ➕ {t('family.add')}
              </Link>
            </div>
          ) : phase === 'start' ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 p-6">
              <div className="card max-w-sm text-center">
                <span className="text-5xl" aria-hidden>👨‍👩‍👧</span>
                <h2 className="mt-2 text-2xl font-extrabold text-brand-900">{t('games.family')}</h2>
                <p className="mt-2 text-lg font-semibold text-brand-700">{t('family.start.desc')}</p>
                <div className="mx-auto mt-3 flex max-w-fit gap-2">
                  {family.slice(0, 3).map((f) => (
                    <span key={f.id} className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-extrabold text-brand-700">
                      {initials(f.name)}
                    </span>
                  ))}
                </div>
                <button onClick={start} className="btn-huge mt-5">
                  ▶ {t('common.start')}
                </button>
              </div>
            </div>
          ) : (
            target && (
              <div className="mt-4">
                <div className="text-base font-bold text-brand-600">❓ {qIdx + 1} / {q.length}</div>
                {q[qIdx].kind === 'who' && (
                  <div className="mt-3 text-center">
                    {img ? (
                      <img src={img} alt={target.name} className="mx-auto h-32 w-32 rounded-full object-cover shadow-lift" />
                    ) : (
                      <span className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-brand-100 text-4xl font-extrabold text-brand-700">
                        {initials(target.name)}
                      </span>
                    )}
                  </div>
                )}
                <h2 className="mt-3 text-center text-2xl font-extrabold text-brand-900">
                  {q[qIdx].kind === 'who' && t('family.who')}
                  {q[qIdx].kind === 'relationship' && `${t('family.relationship.q').replace('their', target.name + '’s')}`}
                  {q[qIdx].kind === 'likes' && `${t('family.like.q').replace('they', target.name)}`}
                </h2>
                <div className="mt-4 space-y-3">
                  {q[qIdx].options.map((o) => (
                    <button key={o} onClick={() => answer(o)} className="card flex w-full items-center gap-3 text-left text-xl font-bold text-brand-900 hover:shadow-lift">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">✓</span>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
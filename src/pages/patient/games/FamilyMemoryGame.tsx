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
    <div className="pb-6">
      <PageHeader inProgress={phase !== 'done'} backTo="/games" showHome right={
        <span className="chip bg-brand-100 text-brand-700">{t('games.level')} {level}</span>
      } />

      {phase === 'done' && last ? (
        <div className="mt-4 fade-up">
          <GameResultScreen result={last.result} decision={decision} onPlayAgain={start} />
          <div className="mt-4 text-center text-sm font-semibold leading-relaxed text-neutral-400">{t('family.demo.note')}</div>
        </div>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-brand-900">{t('games.family')}</h1>

          {family.length === 0 ? (
            <div className="mt-6 fade-up">
              <div className="card border border-warm-100 bg-white p-8 text-center shadow-card">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warm-50 ring-1 ring-warm-100">
                  <span className="text-4xl" aria-hidden>👨‍👩‍👧</span>
                </div>
                <h2 className="mt-4 text-xl font-extrabold text-brand-900">Your family album is empty</h2>
                <p className="mx-auto mt-2 max-w-sm text-base font-semibold leading-relaxed text-neutral-500">{t('family.empty')}</p>
                <Link to="/memories" className="btn-primary mt-6 inline-flex items-center justify-center bg-brand-600 px-8 text-white hover:bg-brand-700">
                  ➕ {t('family.add')}
                </Link>
                <p className="mt-3 text-xs font-semibold text-neutral-400">Add a photo and a little note — it becomes a gentle memory game.</p>
              </div>
            </div>
          ) : phase === 'start' ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/85 p-6 backdrop-blur-md fade-in">
              <div className="card max-w-sm border border-warm-100 bg-white p-7 text-center shadow-float fade-up sm:p-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-warm-50 to-brand-50 ring-1 ring-warm-100">
                  <span className="text-5xl" aria-hidden>👨‍👩‍👧</span>
                </div>
                <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-brand-900">{t('games.family')}</h2>
                <p className="mx-auto mt-2 max-w-[28ch] text-base font-semibold leading-relaxed text-brand-700">{t('family.start.desc')}</p>
                <div className="mx-auto mt-4 flex max-w-fit items-center gap-0">
                  {family.slice(0, 3).map((f, idx) => (
                    <span
                      key={f.id}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-lg font-extrabold text-brand-700 ring-4 ring-white shadow-card"
                      style={{ marginLeft: idx === 0 ? 0 : -10, zIndex: 3 - idx }}
                    >
                      {initials(f.name)}
                    </span>
                  ))}
                  {family.length > 3 && (
                    <span className="ml-2 rounded-full bg-warm-50 px-3 py-1 text-sm font-bold text-warm-600 ring-1 ring-warm-100">
                      +{family.length - 3}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm font-semibold text-neutral-400">Photos stay on this device · Take your time</p>
                <button onClick={start} className="btn-huge mt-6 bg-accent-400 text-white shadow-lift hover:bg-accent-500">
                  ▶ {t('common.start')}
                </button>
              </div>
            </div>
          ) : (
            target && (
              <div className="mt-5 fade-up">
                {/* Calm progress — pill + dots + thin bar */}
                <div className="rounded-3xl border border-brand-100 bg-white p-3 shadow-card sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="chip bg-warm-50 text-warm-700 ring-1 ring-warm-100">❓ {qIdx + 1} / {q.length}</span>
                    <div className="flex items-center gap-1.5">
                      {q.map((_, i) => (
                        <span
                          key={i}
                          aria-hidden
                          className={`h-2.5 rounded-full transition-all ${i < qIdx ? 'w-5 bg-brand-500' : i === qIdx ? 'w-7 bg-brand-600' : 'w-2.5 bg-brand-100'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-50">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all duration-500"
                      style={{ width: `${((qIdx + 1) / q.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Album photo card — warm mat + generous frame */}
                <div className="mt-5 rounded-[28px] border border-warm-100 bg-white p-5 shadow-card sm:p-6">
                  {q[qIdx].kind === 'who' ? (
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-warm-50 via-brand-50 to-warm-50 opacity-80" aria-hidden />
                        <div className="relative rounded-full bg-white p-1.5 shadow-lift ring-1 ring-warm-100">
                          {img ? (
                            <img src={img} alt={target.name} className="h-36 w-36 rounded-full object-cover sm:h-40 sm:w-40" />
                          ) : (
                            <span className="flex h-36 w-36 items-center justify-center rounded-full bg-brand-50 text-4xl font-extrabold tracking-wide text-brand-700 sm:h-40 sm:w-40">
                              {initials(target.name)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 rounded-full bg-warm-50 px-3 py-1 text-xs font-bold tracking-wide text-warm-600 ring-1 ring-warm-100">Family photo</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 rounded-full bg-white p-1 shadow-card ring-1 ring-warm-100">
                        {img ? (
                          <img src={img} alt={target.name} className="h-14 w-14 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-lg font-extrabold text-brand-700">
                            {initials(target.name)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="text-xs font-bold tracking-widest text-warm-600">ABOUT</div>
                        <div className="truncate text-base font-extrabold text-brand-900">{target.name}</div>
                        <div className="text-sm font-semibold text-neutral-500">{target.relationship}</div>
                      </div>
                      <span className="ml-auto hidden rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 ring-1 ring-brand-100 sm:inline-flex">Take your time</span>
                    </div>
                  )}

                  <h2 className="mt-5 text-center text-2xl font-extrabold leading-tight tracking-tight text-brand-900 sm:text-[26px]">
                    {q[qIdx].kind === 'who' && t('family.who')}
                    {q[qIdx].kind === 'relationship' && `${t('family.relationship.q').replace('their', target.name + '’s')}`}
                    {q[qIdx].kind === 'likes' && `${t('family.like.q').replace('they', target.name)}`}
                  </h2>
                  <p className="mt-2 text-center text-sm font-semibold text-neutral-400">Choose the answer that feels right — there&apos;s no rush.</p>
                </div>

                <div className="mt-4 space-y-3">
                  {q[qIdx].options.map((o) => (
                    <button key={o} onClick={() => answer(o)} className="card flex w-full items-center gap-4 border border-warm-100 bg-white p-4 text-left text-lg font-bold leading-snug text-brand-900 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0 sm:p-5 sm:text-xl">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">✓</span>
                      <span className="min-w-0 flex-1">{o}</span>
                      <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-warm-50 text-warm-600 ring-1 ring-warm-100 sm:flex" aria-hidden>›</span>
                    </button>
                  ))}
                </div>

                <p className="mt-4 text-center text-xs font-semibold text-neutral-400">Tip: if you&apos;re unsure, go with the one that brings a warm memory.</p>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

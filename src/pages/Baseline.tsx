import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Button, Card, Disclaimer, ProgressRing } from '@/components/ui';
import type { CognitiveProfile } from '@/types';

type Phase = 'intro' | 'watch' | 'memory' | 'attention' | 'recall' | 'result';

interface BaseItem {
  emoji: string;
  labelKey: string;
}

const WATCH_ITEMS: BaseItem[] = [
  { emoji: '🍵', labelKey: 'baseline.watch.tea' },
  { emoji: '🌸', labelKey: 'baseline.watch.flower' },
  { emoji: '🧺', labelKey: 'baseline.watch.basket' },
  { emoji: '🚲', labelKey: 'baseline.watch.bicycle' },
];
const DISTRACTORS: BaseItem[] = [
  { emoji: '🎁', labelKey: 'baseline.distract.gift' },
  { emoji: '⚽', labelKey: 'baseline.distract.ball' },
];
const POOL: BaseItem[] = [
  ...WATCH_ITEMS,
  ...DISTRACTORS,
  { emoji: '🌿', labelKey: 'baseline.pool.plant' },
  { emoji: '🧣', labelKey: 'baseline.pool.gamusa' },
  { emoji: '🍚', labelKey: 'baseline.pool.rice' },
  { emoji: '☂️', labelKey: 'baseline.pool.umbrella' },
];

const COLORS = [
  { id: 'green', emoji: '🟢', key: 'baseline.color.green' },
  { id: 'red', emoji: '🔴', key: 'baseline.color.red' },
  { id: 'blue', emoji: '🔵', key: 'baseline.color.blue' },
  { id: 'yellow', emoji: '🟡', key: 'baseline.color.yellow' },
];
const ATT_ROUNDS = [COLORS[0], COLORS[1], COLORS[2], COLORS[3], COLORS[0]];

interface Answer {
  phase: 'memory' | 'attention' | 'recall';
  correct: boolean;
  rt: number;
}

interface MemoryQ {
  promptKey: string;
  options: BaseItem[];
  correctKey: string;
}

export default function Baseline() {
  const { t, dispatch, state, speakText } = useApp();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('intro');
  const [watchLeft, setWatchLeft] = useState(8);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [attIdx, setAttIdx] = useState(0);
  const [rIdx, setRIdx] = useState(0);
  const [promptStart, setPromptStart] = useState<number | null>(null);

  const watchKeys = WATCH_ITEMS.map((w) => w.labelKey);

  const memoryQs = useMemo<MemoryQ[]>(() => {
    return [
      { promptKey: 'baseline.q1.prompt', options: shuffle([WATCH_ITEMS[1], DISTRACTORS[0], DISTRACTORS[1], WATCH_ITEMS[3]]), correctKey: WATCH_ITEMS[1].labelKey },
      { promptKey: 'baseline.q2.prompt', options: shuffle([WATCH_ITEMS[2], DISTRACTORS[0], WATCH_ITEMS[0], DISTRACTORS[1]]), correctKey: WATCH_ITEMS[2].labelKey },
    ];
  }, []);

  const recallOptions = useMemo(() => shuffle(POOL).slice(0, 6), []);
  const [mIdx, setMIdx] = useState(0);

  useEffect(() => {
    if (phase === 'watch') {
      speakText(t('baseline.watch.speak'));
      const iv = setInterval(() => setWatchLeft((s) => s - 1), 1000);
      const tmo = setTimeout(() => setPhase('memory'), 8000);
      return () => {
        clearInterval(iv);
        clearTimeout(tmo);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const record = (phaseName: Answer['phase'], correct: boolean) => {
    const rt = promptStart ? (Date.now() - promptStart) / 1000 : 3;
    setAnswers((a) => [...a, { phase: phaseName, correct, rt }]);
    setPromptStart(Date.now());
  };

  const askMemory = (opt: BaseItem, correctKey: string) => {
    record('memory', opt.labelKey === correctKey);
    setMIdx((i) => i + 1);
  };

  const askAttention = (id: string) => {
    record('attention', id === ATT_ROUNDS[attIdx].id);
    if (attIdx < ATT_ROUNDS.length - 1) setAttIdx((i) => i + 1);
    else {
      setAttIdx(0);
      setMIdx(0);
      setRIdx(0);
      setPhase('recall');
    }
  };

  const askRecall = (opt: BaseItem) => {
    record('recall', watchKeys.includes(opt.labelKey));
    if (rIdx < 3 - 1) setRIdx((i) => i + 1);
    else finish();
  };

  const finish = () => {
    const mem = answers.filter((a) => a.phase === 'memory').concat(answers.filter((a) => a.phase === 'recall'));
    const att = answers.filter((a) => a.phase === 'attention');
    const rec = answers.filter((a) => a.phase === 'recall');
    const pct = (arr: Answer[]) => (arr.length ? Math.round((arr.filter((a) => a.correct).length / arr.length) * 100) : 70);
    const rtAvg = answers.length ? answers.reduce((s, a) => s + a.rt, 0) / answers.length : 4;
    const speed = Math.max(40, Math.round(100 - rtAvg * 9));
    const profile: CognitiveProfile = {
      patientId: state.patient?.id ?? 'patient-asha',
      baseline: {
        memory: pct([...mem, ...rec]),
        attention: pct(att),
        recall: pct(rec),
        responseSpeed: speed,
        takenAt: new Date().toISOString(),
      },
      difficulty: { 'memory-match': 1, 'scene-memory': 1, pattern: 1, routine: 1, 'family-memory': 1, region: 1 },
      engagement: 70,
      weeklyActiveDays: 1,
      lastActiveAt: new Date().toISOString(),
    };
    dispatch({ type: 'FINISH_BASELINE', profile });
    dispatch({ type: 'ENQUEUE_SYNC', kind: 'profile', label: 'Baseline profile', detail: 'Saved on device' });
    setPhase('result');
    speakText(t('baseline.result.speak'));
  };

  useEffect(() => {
    if (phase === 'result') {
      const tm = setTimeout(() => navigate('/home'), 4200);
      return () => clearTimeout(tm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const baseline = state.profile?.baseline;
  const memoryDone = mIdx >= memoryQs.length;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-8">
      <div className="w-full max-w-xl fade-up">
        {phase === 'intro' && (
          <Card className="text-center">
            <span className="text-5xl" aria-hidden>
              🌱
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-brand-900">{t('baseline.title')}</h1>
            <div className="mt-3">
              <Disclaimer>{t('baseline.disclaimer')}</Disclaimer>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-brand-50 p-3">
                <div className="text-2xl font-extrabold text-brand-800">👀</div>
                <div className="font-bold">{t('baseline.hero.watch')}</div>
              </div>
              <div className="rounded-2xl bg-brand-50 p-3">
                <div className="text-2xl font-extrabold text-brand-800">🎯</div>
                <div className="font-bold">{t('baseline.hero.tap')}</div>
              </div>
              <div className="rounded-2xl bg-brand-50 p-3">
                <div className="text-2xl font-extrabold text-brand-800">💭</div>
                <div className="font-bold">{t('baseline.hero.remember')}</div>
              </div>
              <div className="rounded-2xl bg-brand-50 p-3">
                <div className="text-2xl font-extrabold text-brand-800">🎖️</div>
                <div className="font-bold">{t('baseline.hero.start')}</div>
              </div>
            </div>
            <div className="mt-5">
              <Button variant="huge" onClick={() => { setPromptStart(Date.now()); setPhase('watch'); }}>
                ▶ {t('scene.ready')}
              </Button>
            </div>
          </Card>
        )}

        {phase === 'watch' && (
          <Card className="text-center">
            <div className="mb-2 text-sm font-bold text-brand-600">⏳ {watchLeft}s</div>
            <h2 className="text-xl font-extrabold text-brand-900">{t('scene.watch')}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {WATCH_ITEMS.map((it) => (
                <div key={it.labelKey} className="flex h-24 items-center justify-center gap-2 rounded-2xl bg-brand-50 text-2xl">{it.emoji} {t(it.labelKey)}</div>
              ))}
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-500">{t('scene.watch.hint')}</p>
          </Card>
        )}

        {phase === 'memory' && !memoryDone && (
          <Card className="text-center">
            <h2 className="text-xl font-extrabold text-brand-900">💭 {t(memoryQs[mIdx].promptKey)}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {memoryQs[mIdx].options.map((o) => (
                <button key={o.labelKey} onClick={() => askMemory(o, memoryQs[mIdx].correctKey)} className="tile flex h-24 items-center justify-center gap-2 text-2xl hover:shadow-lift">{o.emoji} {t(o.labelKey)}</button>
              ))}
            </div>
          </Card>
        )}

        {phase === 'memory' && memoryDone && (
          <Card className="text-center">
            <h2 className="text-xl font-extrabold text-brand-900">🎯 {t('baseline.attention')}</h2>
            <p className="mt-2 text-lg font-semibold text-brand-700">{t('baseline.attention.prompt', { color: t(ATT_ROUNDS[attIdx].key) })}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {COLORS.map((c) => (
                <button key={c.id} onClick={() => askAttention(c.id)} className={`tile h-24 text-5xl hover:shadow-lift ${c.id === ATT_ROUNDS[attIdx].id ? 'pulse-soft' : ''}`}>
                  {c.emoji}
                </button>
              ))}
            </div>
          </Card>
        )}

        {phase === 'recall' && (
          <Card className="text-center">
            <h2 className="text-xl font-extrabold text-brand-900">🌿 {t('baseline.recall')}</h2>
            <p className="mt-2 text-lg font-semibold text-brand-700">{t('baseline.recall.prompt')}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {recallOptions.map((o) => (
                <button key={o.labelKey} onClick={() => askRecall(o)} className="tile flex h-24 items-center justify-center gap-2 text-2xl hover:shadow-lift">{o.emoji} {t(o.labelKey)}</button>
              ))}
            </div>
          </Card>
        )}

        {phase === 'result' && baseline && (
          <Card className="text-center">
            <span className="text-5xl" aria-hidden>🎉</span>
            <h2 className="mt-2 text-2xl font-extrabold text-brand-900">{t('baseline.complete')}</h2>
            <p className="mt-1 text-base font-semibold text-neutral-600">{t('baseline.done.desc')}</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center gap-1">
                <ProgressRing value={baseline.memory} size={90} />
                <span className="font-bold text-brand-800">{t('baseline.memory')}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ProgressRing value={baseline.attention} size={90} color="#b98545" />
                <span className="font-bold text-brand-800">{t('baseline.attention')}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ProgressRing value={baseline.recall} size={90} color="#c9442a" />
                <span className="font-bold text-brand-800">{t('baseline.recall')}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ProgressRing value={baseline.responseSpeed} size={90} color="#4e7040" />
                <span className="font-bold text-brand-800">{t('baseline.speed')}</span>
              </div>
            </div>
            <div className="mt-4">
              <Disclaimer>{t('baseline.disclaimer')}</Disclaimer>
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-500">{t('baseline.takinghome')}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
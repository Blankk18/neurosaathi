import { useEffect, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { LEVEL_TO_CARDS } from '@/engine/adaptive';
import { useGameSession } from './useGameSession';
import GameResultScreen from './GameResultScreen';

interface Card {
  id: string;
  emoji: string;
  labelKey: string;
}

const BASE_DECK = [
  { emoji: '🍵', labelKey: 'memory.card.tea' },
  { emoji: '☂️', labelKey: 'memory.card.umbrella' },
  { emoji: '🍚', labelKey: 'memory.card.rice' },
  { emoji: '🧣', labelKey: 'memory.card.shawl' },
  { emoji: '🌸', labelKey: 'memory.card.flower' },
  { emoji: '🧺', labelKey: 'memory.card.basket' },
  { emoji: '🏠', labelKey: 'memory.card.house' },
  { emoji: '🚲', labelKey: 'memory.card.bicycle' },
  { emoji: '💧', labelKey: 'memory.card.water' },
  { emoji: '🌿', labelKey: 'memory.card.plant' },
  { emoji: '🎒', labelKey: 'memory.card.bag' },
  { emoji: '🍇', labelKey: 'memory.card.fruit' },
];

function buildDeck(count: number): Card[] {
  const pairs = Math.floor(count / 2);
  const chosen = BASE_DECK.slice(0, pairs);
  return [...chosen, ...chosen]
    .map((c, i) => ({ ...c, id: `${c.labelKey}-${i}` }))
    .sort(() => Math.random() - 0.5);
}

export default function MemoryMatch() {
  const { t, state } = useApp();
  const { finish, last, decision } = useGameSession('memory-match');

  const [level, setLevel] = useState(() => last?.result.nextDifficulty ?? (state.profile?.difficulty['memory-match'] ?? 1));
  const [deck, setDeck] = useState<Card[]>(() => buildDeck(LEVEL_TO_CARDS[last?.result.nextDifficulty ?? (state.profile?.difficulty['memory-match'] ?? 1)] ?? 8));
  // index of a card currently face-up, or -1
  const [open, setOpen] = useState<number | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [flipCount, setFlipCount] = useState<Record<string, number>>({});
  const [attempts, setAttempts] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [respTimes, setRespTimes] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [phase, setPhase] = useState<'start' | 'play' | 'done'>('start');

  const pairs = deck.length / 2;

  const reset = () => {
    const lvl = last?.result.nextDifficulty ?? level;
    setLevel(lvl);
    setDeck(buildDeck(LEVEL_TO_CARDS[lvl] ?? 8));
    setOpen(null);
    setMatched([]);
    setFlipCount({});
    setAttempts(0);
    setMistakes(0);
    setRespTimes([]);
    setLocked(false);
    setPhase('play');
  };

  useEffect(() => {
    if (phase === 'play') {
      const tm = setTimeout(() => setLocked(false), 400);
      return () => clearTimeout(tm);
    }
  }, [phase]);

  const tapCard = (idx: number, c: Card) => {
    if (locked || matched.includes(c.labelKey) || open === idx) return;
    const tick = Date.now();
    const prevFlip = flipCount[c.labelKey] ?? 0;
    const newFlips = { ...flipCount, [c.labelKey]: prevFlip + 1 };
    setFlipCount(newFlips);

    if (open === null) {
      setOpen(idx);
      return;
    }

    // second card -> resolve the pair
    setLocked(true);
    setAttempts((a) => a + 1);
    const first = deck[open];
    if (first.labelKey === c.labelKey) {
      const rt = (Date.now() - tick) / 1000;
      setRespTimes((r) => [...r, rt]);
      setMatched((m) => [...m, c.labelKey]);
      setOpen(null);
      setLocked(false);
    } else {
      setMistakes((m) => m + 1);
      window.setTimeout(() => {
        setOpen(null);
        setLocked(false);
      }, 700);
    }
  };

  useEffect(() => {
    if (phase === 'play' && matched.length === pairs && pairs > 0) {
      setPhase('done');
      const metrics = {
        correct: matched.length,
        total: Math.max(1, attempts),
        responseTimes: respTimes.length ? respTimes : [3],
        mistakes,
      };
      finish(metrics);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched.length, phase]);

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader
        inProgress={phase !== 'done'}
        backTo="/games"
        showHome
        right={
          <span className="chip bg-brand-100 text-brand-700">
            {t('games.level')} {level}
          </span>
        }
      />

      {phase === 'done' && last ? (
        <div className="px-4 pt-6">
          <GameResultScreen result={last.result} decision={decision} onPlayAgain={reset} />
        </div>
      ) : (
        <div className="px-4 pb-10">
          {phase === 'start' ? (
            /* ── Start screen ── */
            <div className="mx-auto mt-10 flex max-w-sm flex-col items-center text-center">
              <div className="card w-full space-y-5 py-10 px-6">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-50 ring-4 ring-brand-100">
                  <span className="text-5xl" aria-hidden>
                    🧠
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-brand-900">
                  {t('games.memory')}
                </h2>

                <p className="text-lg font-semibold leading-relaxed text-brand-700">
                  {t('memory.instructions')}
                </p>

                <div className="divider" />

                <p className="text-sm font-bold text-neutral-500">
                  {t('games.level')} {level} · {pairs} {t('memory.pairs.count')}
                </p>

                <button onClick={reset} className="btn-huge mt-2 w-full">
                  ▶ {t('common.start')}
                </button>
              </div>
            </div>
          ) : (
            /* ── Play phase ── */
            <>
              <h1 className="mt-4 text-2xl font-extrabold text-brand-900">
                {t('games.memory')}
              </h1>

              {/* gentle live progress */}
              <div className="mt-5 flex items-center gap-3">
                <span className="label text-brand-600">{t('memory.pairs')}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-100">
                  <div
                    className="h-full rounded-full bg-brand-400 transition-all duration-500 ease-out"
                    style={{ width: `${pairs > 0 ? (matched.length / pairs) * 100 : 0}%` }}
                  />
                </div>
                <span className="label tabular-nums text-brand-700">
                  {matched.length}/{pairs}
                </span>
              </div>

              {/* card grid */}
              <div
                className={`mt-6 grid gap-3 ${
                  deck.length <= 6 ? 'grid-cols-3' : 'grid-cols-4'
                }`}
              >
                {deck.map((c, i) => {
                  const isFaceUp = open === i || matched.includes(c.labelKey);
                  const isMatched = matched.includes(c.labelKey);
                  return (
                    <button
                      key={c.id}
                      onClick={() => tapCard(i, c)}
                      aria-label={isFaceUp ? t(c.labelKey) : t('memory.hidden')}
                      className={`relative flex aspect-square items-center justify-center rounded-2xl text-4xl shadow-card transition-all duration-300 ${
                        isMatched
                          ? 'bg-brand-50 ring-2 ring-brand-200'
                          : isFaceUp
                            ? 'bg-brand-50 ring-2 ring-brand-300 shadow-lg'
                            : 'bg-brand-600 text-white hover:bg-brand-500 active:scale-[0.97]'
                      }`}
                    >
                      {isFaceUp ? (
                        <span className="flip-in">{c.emoji}</span>
                      ) : (
                        <span className="text-3xl opacity-70">❓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

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

    // second card → resolve the pair
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
    <div>
      <PageHeader inProgress={phase !== 'done'} backTo="/games" showHome right={<>
        <span className="chip bg-brand-100 text-brand-700">
          {t('games.level')} {level}
        </span>
      </>} />

      {phase === 'done' && last ? (
        <div className="mt-4">
          <GameResultScreen result={last.result} decision={decision} onPlayAgain={reset} />
        </div>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-extrabold text-brand-900">{t('games.memory')}</h1>
          <p className="mt-1 text-lg font-semibold text-brand-700">{t('memory.instructions')}</p>

          {phase === 'start' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 p-6">
              <div className="card max-w-sm text-center">
                <span className="text-5xl" aria-hidden>🧠</span>
                <h2 className="mt-2 text-2xl font-extrabold text-brand-900">{t('games.memory')}</h2>
                <p className="mt-2 text-lg font-semibold text-brand-700">{t('memory.instructions')}</p>
                <p className="mt-2 text-sm font-bold text-neutral-500">{t('games.level')} {level} · {pairs} {t('memory.pairs.count')}</p>
                <button onClick={reset} className="btn-huge mt-5">
                  ▶ {t('common.start')}
                </button>
              </div>
            </div>
          )}

          {phase === 'play' && (
            <>
              <div className="mt-4 flex items-center gap-3 text-base font-bold text-brand-700">
                <span>🎴 {t('memory.pairs')}: {matched.length}/{pairs}</span>
                <span className="ml-auto">❌ {mistakes}</span>
              </div>
              <div className={`mt-4 grid gap-3 ${deck.length <= 6 ? 'grid-cols-3' : deck.length <= 8 ? 'grid-cols-4' : 'grid-cols-4'}`}>
                {deck.map((c, i) => {
                  const isFaceUp = open === i || matched.includes(c.labelKey);
                  return (
                    <button
                      key={c.id}
                      onClick={() => tapCard(i, c)}
                      aria-label={isFaceUp ? t(c.labelKey) : t('memory.hidden')}
                      className={`relative flex aspect-square items-center justify-center rounded-2xl text-4xl shadow-card transition transform ${
                        isFaceUp ? 'bg-brand-50' : 'bg-brand-600 text-white'
                      } ${matched.includes(c.labelKey) ? 'opacity-60' : ''}`}
                    >
                      {isFaceUp ? <span className="flip-in">{c.emoji}</span> : <span>❓</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
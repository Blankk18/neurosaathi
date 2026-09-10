import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { PageHeader, SpeakText } from '@/components/common';
import { useGameSession } from './useGameSession';
import GameResultScreen from './GameResultScreen';
import {
  ruleBasedGenerator,
  CONFIDENCE_META,
  FAMILY_DIFFICULTY_CONFIG,
  type Confidence,
  type MemoryQuestion,
} from '@/engine/familyMemory';
import { demoMemoriesForDifficulty, type DemoFamilyMemory } from '@/data/familyMemoryDemo';
import { bridgeFamilyMemories } from '@/engine/familyMemory';

type Phase = 'intro' | 'observe' | 'question' | 'feedback' | 'reveal' | 'done';

const CATEGORY_EMOJI: Record<string, string> = {
  childhood: '🌾',
  family: '👨‍👩‍👧',
  festival: '🏮',
  birthday: '🎂',
  school: '🏫',
  travel: '⛰️',
  home: '🏡',
  wedding: '💐',
  friends: '👫',
  place: '📍',
};

const HINT_LABELS = ['A clue', 'A little more', 'Show me', 'Give the answer'];

type Tr = (key: string, params?: Record<string, string | number>) => string;

// Result of answering one question — drives feedback + reinforcement.
type AnswerOutcome = {
  option: string;
  chosenCorrect: boolean;
  usedHints: number;
  confidence: Confidence | null;
};

export default function FamilyMemoryGame() {
  const { t, state, speakText } = useApp();
  const { finish, last, decision } = useGameSession('family-memory');
  const navigate = useNavigate();

  const baseLevel = last?.result.nextDifficulty ?? (state.profile?.difficulty['family-memory'] ?? 1);
  const level = (baseLevel >= 1 && baseLevel <= 5 ? baseLevel : 1) as 1 | 2 | 3 | 4 | 5;
  const cfg = FAMILY_DIFFICULTY_CONFIG[level];

  const [phase, setPhase] = useState<Phase>('intro');
  const [roundMemories, setRoundMemories] = useState<DemoFamilyMemory[]>([]);
  const [queue, setQueue] = useState<MemoryQuestion[]>([]);
  const [idx, setIdx] = useState(0);

  const [hintsShown, setHintsShown] = useState(0);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [enlarge, setEnlarge] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<AnswerOutcome | null>(null);
  const [revealMemory, setRevealMemory] = useState<DemoFamilyMemory | null>(null);

  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [totalHints, setTotalHints] = useState(0);
  const [confScores, setConfScores] = useState<number[]>([]);
  const [questionStart, setQuestionStart] = useState(() => Date.now());

  // Weak memories (wrong or unsure) → offered again via "Practice These Memories".
  const [weakIds, setWeakIds] = useState<Set<string>>(new Set());
  // Snapshot of weak count at completion, so the result screen stays stable.
  const [weakCount, setWeakCount] = useState(0);

  const question = queue[idx];
  const memory = question ? roundMemories.find((m) => m.id === question.memoryId) : undefined;

  const speakQ = (q: MemoryQuestion | undefined) => {
    if (q) speakText(t(q.promptKey));
  };

  const speakObserve = (m: DemoFamilyMemory | undefined) => {
    if (m) speakText(`${t('family.challenge.path.voice.take')} ${m.title}`);
  };

  const resetSession = () => {
    setCorrect(0);
    setMistakes(0);
    setTimes([]);
    setTotalHints(0);
    setConfScores([]);
    setWeakIds(new Set());
    setWeakCount(0);
  };

  const startRound = (practiceWeak = false) => {
    // Source the challenge from the caregiver-added family memories when any
    // exist, otherwise fall back to the bundled demo memories. For "practice
    // weak" we reuse the same round's memories and the weak ids.
    const caregiver = state.familyMemories.length ? bridgeFamilyMemories(state.familyMemories) : [];
    const pool = caregiver.length ? caregiver : demoMemoriesForDifficulty(level);
    const sessionWeak = practiceWeak && weakIds.size;
    const chosen = sessionWeak ? roundMemories.filter((m) => weakIds.has(m.id)) : pool;
    const source = chosen.length ? chosen : pool;
    const finalSet = source.slice(0, Math.max(2, cfg.count));
    const qs = ruleBasedGenerator.generate(finalSet, { difficulty: level, count: finalSet.length });
    resetSession();
    setRoundMemories(finalSet);
    setQueue(qs);
    setIdx(0);
    setHintsShown(0);
    setConfidence(null);
    speakObserve(finalSet[0]);
    setPhase('observe');
  };

  const goReveal = (m: DemoFamilyMemory) => {
    setRevealMemory(m);
    setPhase('reveal');
  };

  const advance = () => {
    setHintsShown(0);
    setConfidence(null);
    setLastOutcome(null);
    setRevealMemory(null);
    setQuestionStart(Date.now());

    const nextIdx = idx + 1;
    if (nextIdx < queue.length) {
      setIdx(nextIdx);
      speakQ(queue[nextIdx]);
      setPhase('observe');
      return;
    }
    // Round complete — capture weak snapshot for the result screen.
    setWeakCount(weakIds.size);
    setPhase('done');
    finish({
      correct,
      total: times.length,
      responseTimes: times,
      mistakes,
    });
  };

  const answer = (optValue: string) => {
    if (!question) return;
    const rt = (Date.now() - questionStart) / 1000;
    const chosenCorrect = optValue === question.correctValue;
    const usedHints = hintsShown > 3 ? 4 : hintsShown; // the final hint reveals the answer
    setTimes((a) => [...a, rt]);
    setTotalHints((h) => h + usedHints);
    if (chosenCorrect) setCorrect((c) => c + 1);
    else setMistakes((m) => m + 1);
    if (confidence) setConfScores((s) => [...s, CONFIDENCE_META[confidence].score]);
    // Weak recall = a wrong option, or uncertainty even when the option was right.
    if (!chosenCorrect || confidence === 'unsure') {
      setWeakIds((prev) => {
        if (prev.has(question.memoryId)) return prev;
        const next = new Set(prev);
        next.add(question.memoryId);
        return next;
      });
    }
    setLastOutcome({ option: optValue, chosenCorrect, usedHints, confidence });
    setPhase('feedback');
  };

  const totalInRound = queue.length;

  // ==========================================================================
  return (
    <div className="pb-8">
      <PageHeader
        inProgress={phase !== 'intro' && phase !== 'done'}
        backTo="/games"
        right={<span className="chip bg-brand-100 text-brand-700">{t('games.level')} {level}</span>}
      />

      {phase === 'intro' && <Intro t={t} onStart={() => startRound()} />}

      {(phase === 'observe' || phase === 'question') && question && memory && (
        <>
          <ObservePhase
            t={t}
            memory={memory}
            progressIndex={idx + 1}
            total={totalInRound}
            onReady={() => {
              setPhase('question');
              speakQ(question);
            }}
            onEnlarge={() => setEnlarge(true)}
          />
          {phase === 'question' && (
            <QuestionPhase
              t={t}
              question={question}
              memory={memory}
              hintsShown={hintsShown}
              onHint={() => setHintsShown((n) => Math.min(5, n + 1))}
              confidence={confidence}
              onConfidence={setConfidence}
              onAnswer={answer}
              onSpeak={() => speakQ(question)}
            />
          )}
        </>
      )}

      {phase === 'feedback' && question && lastOutcome && (
        <FeedbackPhase
          t={t}
          outcome={lastOutcome}
          isWeak={!lastOutcome.chosenCorrect || lastOutcome.confidence === 'unsure'}
          onReveal={() => memory && goReveal(memory)}
        />
      )}

      {phase === 'reveal' && revealMemory && question && (
        <RevealPhase t={t} memory={revealMemory} onNext={advance} isLast={idx + 1 >= totalInRound} />
      )}

      {enlarge && memory && <EnlargeModal t={t} memory={memory} onClose={() => setEnlarge(false)} />}

      {phase === 'done' && last && (
        <ResultView
          t={t}
          result={last.result}
          decision={decision}
          correct={correct}
          times={times}
          totalHints={totalHints}
          confScores={confScores}
          weakCount={weakCount}
          level={level}
          onPlayAgain={() => startRound()}
          onPractice={() => startRound(true)}
          onReview={() => navigate('/memories')}
          onActivities={() => navigate('/games')}
        />
      )}
    </div>
  );
}

// ============================================================================
// Screens
// ============================================================================

function Intro({ t, onStart }: { t: Tr; onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-brand-50/80 via-canvas to-canvas px-6 fade-in">
      <div className="card max-w-sm w-full border border-warm-100 bg-white p-7 text-center shadow-float fade-up sm:p-9">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-warm-50 via-brand-50 to-warm-50 ring-1 ring-warm-100">
          <span className="text-5xl" aria-hidden>📖</span>
        </div>
        <p className="mt-6 text-sm font-extrabold uppercase tracking-widest text-warm-500">
          {t('family.challenge.eyebrow')}
        </p>
        <h1 className="mt-1 text-[32px] font-extrabold leading-tight tracking-tight text-brand-900">
          {t('family.challenge.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-[32ch] text-lg font-bold leading-relaxed text-brand-700">
          {t('family.challenge.subtitle')}
        </p>

        <div className="mx-auto mt-4 flex max-w-fit items-center gap-2">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-extrabold text-brand-700 ring-1 ring-brand-100">✨ {t('family.challenge.tag.personalized')}</span>
          <span className="rounded-full bg-warm-50 px-3 py-1 text-sm font-extrabold text-warm-700 ring-1 ring-warm-100">🧩 {t('family.challenge.tag.adaptive')}</span>
        </div>

        <button onClick={onStart} className="btn-huge mt-8 w-full bg-accent-400 text-white shadow-lift transition hover:bg-accent-500">
          🧭 {t('family.challenge.cta')}
        </button>

        <details className="mt-5 rounded-2xl border border-warm-100 bg-warm-50/60 px-4 py-3 text-left">
          <summary className="cursor-pointer text-base font-extrabold text-brand-800">
            💬 {t('family.challenge.how')}
          </summary>
          <div className="mt-2 space-y-1.5 text-sm font-semibold leading-relaxed text-brand-700/90">
            <p>👀 {t('family.challenge.how.step1')}</p>
            <p>💭 {t('family.challenge.how.step2')}</p>
            <p>❤️ {t('family.challenge.how.step3')}</p>
            <p className="mt-2 text-brand-800">— {t('family.challenge.how.point.demand')}</p>
            <p>— {t('family.challenge.how.point.sure')}</p>
            <p>— {t('family.challenge.how.point.hints')}</p>
          </div>
        </details>

        <p className="mt-5 text-xs font-semibold leading-relaxed text-neutral-400">
          {t('family.challenge.note.consent')}
        </p>
      </div>
    </div>
  );
}

function ObservePhase({
  t,
  memory,
  progressIndex,
  total,
  onReady,
  onEnlarge,
}: {
  t: Tr;
  memory: DemoFamilyMemory;
  progressIndex: number;
  total: number;
  onReady: () => void;
  onEnlarge: () => void;
}) {
  const pct = Math.min(100, Math.max(5, (progressIndex / Math.max(1, total)) * 100));
  return (
    <div className="mt-4 fade-up">
      {/* Progress — calm "Memory n of m" pill + hearts bar */}
      <div className="rounded-3xl border border-brand-100 bg-white p-3 shadow-card sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="chip bg-warm-50 text-warm-700 ring-1 ring-warm-100">
            ❤️ {t('family.challenge.memoryOf', { n: progressIndex, total: total })}
          </span>
          <span className="text-sm font-extrabold tracking-wide text-brand-600">{t('family.challenge.memories')}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Hero photo — framed, tappable to enlarge */}
      <div className="mt-5 rounded-[30px] border border-warm-100 bg-white p-4 shadow-card sm:p-6">
        <button
          onClick={onEnlarge}
          className="group relative block w-full overflow-hidden rounded-3xl border-8 border-white shadow-inner ring-4 ring-warm-100"
          aria-label={t('family.challenge.enlarge')}
        >
          <img src={memory.image} alt={memory.title} className="h-64 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-80" />
          <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-brand-800 shadow-card">
            🔍 {t('family.challenge.tap.enlarge')}
          </span>
        </button>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-extrabold uppercase tracking-widest text-warm-500">{t('family.challenge.observe')}</div>
            <div className="truncate text-xl font-extrabold text-brand-900">{memory.title}</div>
          </div>
          <span className="ml-auto shrink-0 text-3xl" aria-hidden>{CATEGORY_EMOJI[memory.category]}</span>
        </div>
        <p className="mt-1 text-base font-semibold text-neutral-500">{t('family.challenge.observe.sub')}</p>

        <button onClick={onReady} className="btn-huge mt-5 w-full bg-brand-600 text-white shadow-lift transition hover:bg-brand-700">
          ✅ {t('family.challenge.ready')}
        </button>
      </div>
      <SpeakText text={`${t('family.challenge.observe')}. ${memory.title}.`} />
    </div>
  );
}

function QuestionPhase({
  t,
  question,
  memory,
  hintsShown,
  onHint,
  confidence,
  onConfidence,
  onAnswer,
  onSpeak,
}: {
  t: Tr;
  question: MemoryQuestion;
  memory: DemoFamilyMemory;
  hintsShown: number;
  onHint: () => void;
  confidence: Confidence | null;
  onConfidence: (c: Confidence | null) => void;
  onAnswer: (v: string) => void;
  onSpeak: () => void;
}) {
  const visibleHints = question.hintLevels.slice(0, hintsShown);
  const revealStage = hintsShown === 4; // 4 hints seen → next press reveals the answer
  return (
    <div className="mt-4 fade-up">
      {/* Thumbnail + question */}
      <div className="rounded-3xl border border-warm-100 bg-white p-4 shadow-card">
        <div className="flex items-center gap-4">
          <img src={memory.image} alt={memory.title} className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-warm-100" />
          <div className="min-w-0">
            <div className="text-xs font-extrabold uppercase tracking-widest text-brand-400">{t('family.challenge.ask')}</div>
            <h2 className="mt-0.5 text-xl font-extrabold leading-tight text-brand-900 sm:text-2xl">{t(question.promptKey)}</h2>
          </div>
          <button
            onClick={onSpeak}
            aria-label={t('a11y.voiceAssist')}
            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-400 text-white shadow-card hover:bg-accent-500"
          >
            🔊
          </button>
        </div>
      </div>

      {/* Progressive hints — never harsh, always an invitation */}
      <div className="mt-4 rounded-3xl border border-brand-100 bg-brand-50/50 p-4">
        {visibleHints.map((h, i) => (
          <p key={i} className="mb-3 rounded-xl bg-white px-4 py-2.5 text-sm font-bold leading-relaxed text-brand-800 ring-1 ring-brand-100 fade-up">
            💡 {h}
          </p>
        ))}
        {hintsShown < 4 && (
          <button
            onClick={onHint}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3.5 text-base font-bold transition ${
              hintsShown === 0 ? 'border-brand-300 bg-white text-brand-800' : 'border-warm-300 bg-white text-warm-700'
            }`}
          >
            💡 {hintsShown === 0 ? HINT_LABELS[0] : HINT_LABELS[hintsShown]}
          </button>
        )}
        {revealStage && (
          <button
            onClick={onHint}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-accent-200 bg-white px-4 py-3.5 text-base font-bold text-accent-700 transition"
          >
            💡 {t('family.challenge.hint.reveal')}
          </button>
        )}
        {hintsShown > 4 && (
          <p className="rounded-xl bg-white/60 px-4 py-2.5 text-center text-sm font-bold text-brand-700 ring-1 ring-warm-100">
            ✅ {question.correctValue}
          </p>
        )}
      </div>

      {/* Options — big, icon+text+colour, never colour-only */}
      <div className="mt-4 space-y-3">
        {question.options.map((o, i) => {
          const tone =
            i % 4 === 0
              ? 'border-brand-200 bg-brand-50/40'
              : i % 4 === 1
                ? 'border-warm-200 bg-warm-50/50'
                : i % 4 === 2
                  ? 'border-info-200 bg-info-50/40'
                  : 'border-neutral-200 bg-white';
          const prefix = ['🅰', '🅱', '🅲', '🅳'][i] ?? '•';
          return (
            <button
              key={o.value}
              onClick={() => onAnswer(o.value)}
              className={`card flex w-full items-center gap-4 border-2 p-4 text-left text-lg font-bold leading-snug text-brand-900 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0 sm:p-5 sm:text-xl ${tone}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-base font-extrabold text-brand-700 ring-1 ring-brand-100" aria-hidden>
                {o.icon ?? prefix}
              </span>
              <span className="min-w-0 flex-1">{o.label}</span>
              <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-white text-warm-600 ring-1 ring-warm-100 sm:flex" aria-hidden>›</span>
            </button>
          );
        })}
      </div>

      {/* Confidence — optional */}
      <div className="mt-5 rounded-3xl border border-neutral-100 bg-white p-4">
        <p className="text-center text-base font-extrabold text-brand-800">{t('family.challenge.sure.title')}</p>
        <p className="mt-0.5 text-center text-xs font-semibold text-neutral-400">{t('family.challenge.sure.sub')}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(Object.keys(CONFIDENCE_META) as Confidence[]).map((key) => {
            const meta = CONFIDENCE_META[key];
            const active = confidence === key;
            return (
              <button
                key={key}
                onClick={() => onConfidence(active ? null : key)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-sm font-bold transition ${
                  active ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-neutral-200 bg-neutral-50/60 text-neutral-600'
                }`}
              >
                <span className="text-3xl" aria-hidden>{meta.emoji}</span>
                {t(`family.challenge.sure.${key}`)}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-center text-sm font-semibold text-neutral-400">{t('family.challenge.opt.none')}</p>
    </div>
  );
}

function FeedbackPhase({
  t,
  outcome,
  isWeak,
  onReveal,
}: {
  t: Tr;
  outcome: AnswerOutcome;
  isWeak: boolean;
  onReveal: () => void;
}) {
  const warm = outcome.chosenCorrect;
  return (
    <div className="mt-4 fade-up">
      <div
        className={`rounded-3xl border-2 p-6 text-center shadow-card ${
          warm ? 'border-brand-200 bg-brand-50/50' : 'border-warm-200 bg-warm-50/60'
        }`}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-4xl shadow-card" aria-hidden>
          {warm ? '🌤️' : '💗'}
        </div>
        <h2 className="mt-3 text-2xl font-extrabold text-brand-900">
          {warm ? t('family.challenge.feedback.correct.warm') : t('family.challenge.feedback.wrong.soft')}
        </h2>
        <p className="mt-1 text-base font-semibold leading-relaxed text-brand-700">
          {warm ? t('family.challenge.feedback.warm') : t('family.challenge.reveal.title')}
        </p>

        {isWeak && (
          <div className="mx-auto mt-4 max-w-sm rounded-2xl bg-white/70 p-4 text-sm font-bold text-brand-800 ring-1 ring-warm-100">
            ❤️ {t('family.challenge.reinforce.title')}
            <p className="mt-1 text-xs font-semibold text-neutral-500">{t('family.challenge.reinforce.sub')}</p>
          </div>
        )}

        <button onClick={onReveal} className="mt-6 w-full rounded-3xl bg-brand-600 px-6 py-5 text-lg font-extrabold text-white shadow-lift transition hover:bg-brand-700">
          🔎 {t('family.challenge.reveal.context')}
        </button>
      </div>
    </div>
  );
}

function RevealPhase({
  t,
  memory,
  onNext,
  isLast,
}: {
  t: Tr;
  memory: DemoFamilyMemory;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <div className="mt-4 fade-up">
      <div className="rounded-[30px] border border-warm-100 bg-white p-5 shadow-card sm:p-6">
        <img src={memory.image} alt={memory.title} className="h-48 w-full rounded-3xl object-cover ring-4 ring-warm-50 sm:h-56" />
        <div className="mt-4 text-center">
          <p className="text-xs font-extrabold uppercase tracking-widest text-warm-500">{t('family.challenge.reveal.context')}</p>
          <h2 className="mt-1 text-2xl font-extrabold text-brand-900">{memory.title}</h2>
          <p className="mx-auto mt-2 max-w-[30ch] text-base font-semibold leading-relaxed text-brand-700">{memory.description}</p>

          <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-2 text-left text-sm font-bold text-brand-800">
            <div className="rounded-xl bg-brand-50 px-3 py-2">📅 {t('family.challenge.reveal.when', { year: memory.year })}</div>
            <div className="rounded-xl bg-brand-50 px-3 py-2">📍 {t('family.challenge.reveal.where', { place: memory.place })}</div>
            <div className="rounded-xl bg-brand-50 px-3 py-2">👨‍👩‍👧 {t('family.challenge.reveal.who', { people: memory.people.join(', ') })}</div>
            <div className="rounded-xl bg-brand-50 px-3 py-2">{CATEGORY_EMOJI[memory.category]} {t('family.challenge.reveal.category', { category: memory.category })}</div>
          </div>
        </div>

        <button onClick={onNext} className="btn-huge mt-6 w-full bg-accent-400 text-white shadow-lift transition hover:bg-accent-500">
          {isLast ? '🏁 ' : '➡️ '}{isLast ? t('family.challenge.result.title') : t('family.challenge.next')}
        </button>
      </div>
    </div>
  );
}

function EnlargeModal({ t, memory, onClose }: { t: Tr; memory: DemoFamilyMemory; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <img src={memory.image} alt={memory.title} className="max-h-[78vh] w-full rounded-3xl object-contain shadow-float pop" />
        <div className="mt-4 flex justify-center">
          <button onClick={onClose} className="rounded-full bg-white px-6 py-3 text-base font-extrabold text-brand-900 shadow-lift hover:bg-brand-50">
            ✕ {t('family.challenge.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Result — reuses GameResultScreen, adds premium journey stats + buttons.
// ============================================================================

function ResultView({
  t,
  result,
  decision,
  correct,
  times,
  totalHints,
  confScores,
  weakCount,
  level,
  onPlayAgain,
  onPractice,
  onReview,
  onActivities,
}: {
  t: Tr;
  result: import('@/types').GameResult;
  decision: ReturnType<typeof useGameSession>['decision'];
  correct: number;
  times: number[];
  totalHints: number;
  confScores: number[];
  weakCount: number;
  level: number;
  onPlayAgain: () => void;
  onPractice: () => void;
  onReview: () => void;
  onActivities: () => void;
}) {
  const explored = times.length;
  const remembered = correct;
  const avgTime = times.length ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10 : 0;
  const avgConf = confScores.length ? Math.round((confScores.reduce((a, b) => a + b, 0) / confScores.length) * 10) / 10 : 0;

  return (
    <div className="mt-4 fade-up">
      <h1 className="text-center text-[30px] font-extrabold tracking-tight text-brand-900">{t('family.challenge.result.title')}</h1>
      <p className="mt-1 text-center text-base font-semibold text-neutral-500">{t('family.challenge.result.encourage')}</p>

      {/* Journey stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat name={t('family.challenge.result.explored')} value={explored} icon="🖼️" />
        <Stat name={t('family.challenge.result.remembered')} value={remembered} icon="❤️" />
        <Stat name={t('family.challenge.result.withHints')} value={totalHints} icon="💡" />
        <Stat name={t('family.challenge.result.needsReinforcement')} value={weakCount} icon="🔁" />
        <Stat name={t('family.challenge.result.avgTime')} value={`${avgTime}s`} icon="⏱️" />
        <Stat name={t('family.challenge.result.confidence')} value={`${avgConf}/3`} icon="🙂" />
      </div>

      <div className="mt-4 rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-3 text-center text-sm font-bold text-brand-700">
        {t('family.challenge.result.next', { level: `${level}` })}
      </div>

      {/* Reuse the standard metric ring + adaptation verdict */}
      <GameResultScreen result={result} decision={decision} onPlayAgain={onPlayAgain} />

      {/* Extra journey actions + honest labelling */}
      <div className="mt-4 flex flex-col gap-3">
        <button onClick={onPractice} className="card w-full border border-warm-200 bg-warm-50/60 p-4 text-lg font-extrabold text-brand-800 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
          🎯 {t('family.challenge.result.cta.practice')}
        </button>
        <button onClick={onReview} className="card w-full border border-brand-100 bg-brand-50/60 p-4 text-lg font-extrabold text-brand-800 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
          📖 {t('family.challenge.result.cta.review')}
        </button>
        <button onClick={onActivities} className="btn-secondary w-full px-6 py-4 text-lg font-extrabold">
          🏠 {t('family.challenge.result.cta.activities')}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-warm-200 bg-warm-50 px-4 py-3 text-center text-sm font-semibold text-neutral-600">
        {t('family.challenge.result.aux')}
      </div>
      <div className="mt-2 text-center text-xs font-semibold text-neutral-400">{t('family.demo.note')}</div>
    </div>
  );
}

function Stat({ name, value, icon }: { name: string; value: string | number; icon: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-neutral-100 bg-white px-3 py-3.5 shadow-card">
      <span className="text-2xl" aria-hidden>{icon}</span>
      <div className="mt-1 text-2xl font-extrabold text-brand-900">{value}</div>
      <div className="text-center text-xs font-bold uppercase tracking-wide text-neutral-500">{name}</div>
    </div>
  );
}
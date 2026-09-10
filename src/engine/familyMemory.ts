import type { Difficulty } from '@/types';
import type { FamilyMemory } from '@/types';
import type { DemoFamilyMemory } from '@/data/familyMemoryDemo';

// ============================================================================
// Family Memory Challenge — question / hint / confidence / reinforcement engine
//
// Pure, deterministic, side-effect-free. A future AI question generator can
// replace `buildMemoryQuestions` by conforming to `QuestionGenerator` without
// touching the game screen.
// ============================================================================

export type QuestionKind =
  | 'who'
  | 'relationship'
  | 'where'
  | 'when'
  | 'event'
  | 'companion'
  | 'visual-location'
  | 'sequence'
  | 'then-now';

export type Confidence = 'sure' | 'maybe' | 'unsure';

export interface MemoryQuestion {
  id: string;
  kind: QuestionKind;
  memoryId: string;
  /** Optional second memory for comparison kinds (sequence / then-now). */
  memoryIdB?: string;
  promptKey: string;
  promptFallback: string;
  options: { label: string; value: string; icon?: string }[];
  correctValue: string;
  /** 4 progressive hints, empty string means no hint at that level. */
  hintLevels: string[];
  /** Human label for analytics (e.g. "Who is in this photo?"). */
  kindLabel: string;
}

export interface RoundConfig {
  /** How many memories (questions) in this round. */
  count: number;
  /** Preferred question kinds for this difficulty — sampled without replacement. */
  kinds: QuestionKind[];
  /** How many options per question. */
  optionsCount: number;
  /** Description for docs / result screen. */
  label: string;
}

export const CONFIDENCE_META: Record<Confidence, { emoji: string; label: string; score: number }> = {
  sure: { emoji: '😊', label: 'Very sure', score: 3 },
  maybe: { emoji: '🙂', label: 'Somewhat sure', score: 2 },
  unsure: { emoji: '🤔', label: 'Not very sure', score: 1 },
};

// Difficulty → round shape. Higher difficulty = more memories, broader kinds,
// tighter distractors and slightly fewer forgiving hints.
export const FAMILY_DIFFICULTY_CONFIG: Record<Difficulty, RoundConfig> = {
  1: { count: 3, kinds: ['who', 'where', 'event'], optionsCount: 3, label: 'Gentle — fewer choices, familiar places' },
  2: { count: 4, kinds: ['who', 'relationship', 'where', 'event'], optionsCount: 3, label: 'Warm-up — a little more variety' },
  3: { count: 5, kinds: ['who', 'relationship', 'where', 'when', 'event', 'companion'], optionsCount: 4, label: 'Steady — a fuller album' },
  4: { count: 5, kinds: ['relationship', 'where', 'when', 'event', 'companion', 'visual-location', 'sequence'], optionsCount: 4, label: 'Focused — trickier time & place' },
  5: { count: 6, kinds: ['where', 'when', 'event', 'companion', 'visual-location', 'sequence', 'then-now'], optionsCount: 4, label: 'Challenge — sequencing & detail' },
};

// ----------------------------------------------------------------------------
// Hints (4 progressive levels).
// ----------------------------------------------------------------------------

/** Produce 4 hints for a question. Empty strings are filtered by the UI. */
function hintsFor(q: MemoryQuestion, mem: DemoFamilyMemory): string[] {
  // Level 1 — relationship clue (skip the "you" role, which is not a relationship to name)
  const rel = mem.relationships.find((r) => r !== 'you' && r.toLowerCase() !== 'you');
  const h1 = rel ? `Someone close to you is in this memory — your ${rel}.` : '';
  // Level 2 — context clue
  const h2 = `This was ${mem.event.toLowerCase()} at ${mem.place}.`;
  // Level 3 — visual / category clue
  const h3map: Record<string, string> = {
    birthday: 'Look for the cake and balloons.',
    school: 'Look for the school building.',
    festival: 'Look for the lamps.',
    travel: 'Look for the hills.',
    wedding: 'Look for the garlands.',
    childhood: 'This is from a much earlier time.',
    family: 'Many familiar faces together.',
    friends: 'A day out together.',
    place: 'A place you used to visit often.',
    home: 'Close to home.',
  };
  const h3 = h3map[mem.category] ?? `Think about ${mem.category}.`;
  // Level 4 — reveal (last resort)
  const h4 = `The answer is: ${q.correctValue}. Take a breath — remembering is a journey.`;
  return [h1, h2, h3, h4];
}

// ----------------------------------------------------------------------------
// Distractor pools — small, hand-curated, enough to make plausible wrong answers.
// ----------------------------------------------------------------------------

const PLACE_DISTRACTORS = ['Family home', 'School', 'Park', 'Hill station', 'Wedding hall', 'Village temple', 'Childhood village home', 'Home garden'];
const EVENT_DISTRACTORS = ['Birthday celebration', 'Family holiday', 'Festival of lights', 'Wedding celebration', 'A school day', 'A weekend picnic', 'Morning gardening', "Om's new motorbike"];
function yearLabel(y: number): string {
  // Rough bucket for WHEN questions — tolerant, never claims false precision.
  return String(y);
}
function yearDistractors(correct: number): string[] {
  // +/- 3 and 6 years — plausible, not obviously wrong.
  return [String(correct - 5), String(correct + 4), String(correct - 10)].filter((v) => v !== String(correct));
}
const PERSON_POOL = ['Asha', 'Ravi', 'Anita', 'Om', 'Priya', 'Kavita', 'Meena'];

const VISUAL_LOCATION_OPTIONS: { label: string; icon: string; categories: string[] }[] = [
  { label: 'Home', icon: '🏠', categories: ['home', 'birthday', 'festival'] },
  { label: 'School', icon: '🏫', categories: ['school'] },
  { label: 'Park', icon: '🌳', categories: ['friends', 'travel', 'place'] },
  { label: 'Temple', icon: '🛕', categories: ['festival', 'place'] },
  { label: 'Hills', icon: '⛰️', categories: ['travel'] },
  { label: 'Courtyard', icon: '🏡', categories: ['childhood', 'place'] },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(correct: string, pool: string[], n: number): string[] {
  return shuffle(pool.filter((p) => p !== correct)).slice(0, n);
}

// ----------------------------------------------------------------------------
// Per-kind question builders.
// ----------------------------------------------------------------------------

function buildWho(mem: DemoFamilyMemory, _all: DemoFamilyMemory[], opts: number): MemoryQuestion {
  const correct = mem.people[0] ?? mem.title;
  // Distractors: other recognisable names not in this memory.
  const others = shuffle(PERSON_POOL.filter((p) => !mem.people.includes(p))).slice(0, opts - 1);
  const options = shuffle([correct, ...others].slice(0, opts)).map((v) => ({ label: v, value: v }));
  const q: MemoryQuestion = {
    id: `${mem.id}-who`,
    kind: 'who',
    memoryId: mem.id,
    promptKey: 'family.challenge.q.who',
    promptFallback: 'Who is in this photo?',
    options,
    correctValue: correct,
    hintLevels: [],
    kindLabel: 'Who',
  };
  q.hintLevels = hintsFor(q, mem);
  return q;
}

function buildRelationship(mem: DemoFamilyMemory, _all: DemoFamilyMemory[], opts: number): MemoryQuestion {
  const correct = mem.relationships[0] ?? 'family';
  const pool = ['granddaughter', 'daughter', 'son', 'husband', 'sister', 'daughter-in-law', 'you', 'family'];
  const distractors = pickDistractors(correct, pool, opts - 1);
  const options = shuffle([correct, ...distractors].slice(0, opts)).map((v) => ({ label: v, value: v }));
  const q: MemoryQuestion = {
    id: `${mem.id}-relationship`,
    kind: 'relationship',
    memoryId: mem.id,
    promptKey: 'family.challenge.q.relationship',
    promptFallback: 'What is their relationship to you?',
    options,
    correctValue: correct,
    hintLevels: [],
    kindLabel: 'Relationship',
  };
  q.hintLevels = hintsFor(q, mem);
  return q;
}

function buildWhere(mem: DemoFamilyMemory, _all: DemoFamilyMemory[], opts: number): MemoryQuestion {
  const correct = mem.place;
  const distractors = pickDistractors(correct, PLACE_DISTRACTORS, opts - 1);
  const options = shuffle([correct, ...distractors].slice(0, opts)).map((v) => ({ label: v, value: v }));
  const q: MemoryQuestion = {
    id: `${mem.id}-where`,
    kind: 'where',
    memoryId: mem.id,
    promptKey: 'family.challenge.q.where',
    promptFallback: 'Where was this?',
    options,
    correctValue: correct,
    hintLevels: [],
    kindLabel: 'Where',
  };
  q.hintLevels = hintsFor(q, mem);
  return q;
}

function buildWhen(mem: DemoFamilyMemory, _all: DemoFamilyMemory[], opts: number): MemoryQuestion {
  const correct = yearLabel(mem.year);
  const distractors = yearDistractors(mem.year).slice(0, opts - 1);
  // pad if needed
  while (distractors.length < opts - 1) distractors.push(String(mem.year + distractors.length * 3 + 2));
  const options = shuffle([correct, ...distractors.slice(0, opts - 1)]).map((v) => ({ label: `Around ${v}`, value: v }));
  const q: MemoryQuestion = {
    id: `${mem.id}-when`,
    kind: 'when',
    memoryId: mem.id,
    promptKey: 'family.challenge.q.when',
    promptFallback: 'Around when was this?',
    options,
    correctValue: correct,
    hintLevels: [],
    kindLabel: 'When',
  };
  q.hintLevels = hintsFor(q, mem);
  return q;
}

function buildEvent(mem: DemoFamilyMemory, _all: DemoFamilyMemory[], opts: number): MemoryQuestion {
  const correct = mem.event;
  const distractors = pickDistractors(correct, EVENT_DISTRACTORS, opts - 1);
  const options = shuffle([correct, ...distractors].slice(0, opts)).map((v) => ({ label: v, value: v }));
  const q: MemoryQuestion = {
    id: `${mem.id}-event`,
    kind: 'event',
    memoryId: mem.id,
    promptKey: 'family.challenge.q.event',
    promptFallback: 'What was happening here?',
    options,
    correctValue: correct,
    hintLevels: [],
    kindLabel: 'Event',
  };
  q.hintLevels = hintsFor(q, mem);
  return q;
}

function buildCompanion(mem: DemoFamilyMemory, _all: DemoFamilyMemory[], opts: number): MemoryQuestion | null {
  // "Who was with you?" only makes sense when someone else is in the memory.
  if (mem.people.length < 2) return null;
  const correct = mem.people[1];
  const distractors = shuffle(PERSON_POOL.filter((p) => p !== correct && !mem.people.includes(p))).slice(0, opts - 1);
  const options = shuffle([correct, ...distractors].slice(0, opts)).map((v) => ({ label: v, value: v }));
  const q: MemoryQuestion = {
    id: `${mem.id}-companion`,
    kind: 'companion',
    memoryId: mem.id,
    promptKey: 'family.challenge.q.companion',
    promptFallback: 'Who was with you?',
    options,
    correctValue: correct,
    hintLevels: [],
    kindLabel: 'Who was with you',
  };
  q.hintLevels = hintsFor(q, mem);
  return q;
}

function buildVisualLocation(mem: DemoFamilyMemory, _all: DemoFamilyMemory[], _opts: number): MemoryQuestion {
  // Map memory category → visual card, then mix 4 cards.
  const correctCat = VISUAL_LOCATION_OPTIONS.find((o) => o.categories.includes(mem.category)) ?? VISUAL_LOCATION_OPTIONS[0];
  const others = shuffle(VISUAL_LOCATION_OPTIONS.filter((o) => o.label !== correctCat.label)).slice(0, 3);
  const options = shuffle([correctCat, ...others]).map((o) => ({ label: o.label, value: o.label, icon: o.icon }));
  const q: MemoryQuestion = {
    id: `${mem.id}-visual-location`,
    kind: 'visual-location',
    memoryId: mem.id,
    promptKey: 'family.challenge.q.visualLocation',
    promptFallback: 'Where does this look like?',
    options,
    correctValue: correctCat.label,
    hintLevels: [],
    kindLabel: 'Where does this look like',
  };
  q.hintLevels = hintsFor(q, mem);
  return q;
}

function buildSequence(mem: DemoFamilyMemory, all: DemoFamilyMemory[], _opts: number): MemoryQuestion | null {
  const other = shuffle(all.filter((m) => m.id !== mem.id))[0];
  if (!other) return null;
  const earlier = mem.year <= other.year ? mem : other;
  const later = mem.year <= other.year ? other : mem;
  const options = shuffle([
    { label: earlier.title, value: earlier.id },
    { label: later.title, value: later.id },
  ]);
  const q: MemoryQuestion = {
    id: `${mem.id}-sequence-${other.id}`,
    kind: 'sequence',
    memoryId: mem.id,
    memoryIdB: other.id,
    promptKey: 'family.challenge.q.sequence',
    promptFallback: 'What happened first?',
    options,
    correctValue: earlier.id,
    hintLevels: [],
    kindLabel: 'What happened first',
  };
  // Sequence hints reference both memories' years loosely.
  q.hintLevels = [
    `One of these was around ${earlier.year}.`,
    `${earlier.title} came before ${later.title}. Think about the years.`,
    `Look at the scenes — one feels earlier.`,
    `The earlier one was: ${earlier.title}.`,
  ];
  return q;
}

function buildThenNow(mem: DemoFamilyMemory, _all: DemoFamilyMemory[], opts: number): MemoryQuestion {
  // Younger vs today — a gentle time-perception question.
  const correct = mem.year < 2010 ? 'Younger' : 'More recent';
  const distractors = [correct === 'Younger' ? 'More recent' : 'Younger'];
  // Pad to opts for UI consistency, but this kind is binary at its core.
  const extraPool = ['Much earlier', 'About the same time'];
  const extra = shuffle(extraPool.filter((p) => p !== correct)).slice(0, Math.max(0, opts - 2));
  const options = shuffle([correct, ...distractors, ...extra].slice(0, opts)).map((v) => ({ label: v, value: v }));
  const q: MemoryQuestion = {
    id: `${mem.id}-then-now`,
    kind: 'then-now',
    memoryId: mem.id,
    promptKey: 'family.challenge.q.thenNow',
    promptFallback: 'Was this when you were younger, or more recently?',
    options,
    correctValue: correct,
    hintLevels: [],
    kindLabel: 'Then vs now',
  };
  q.hintLevels = [
    `This was around ${mem.year}.`,
    mem.year < 2010 ? 'This was quite a while ago.' : 'This was more recent.',
    `Think about how everyone looks in the photo.`,
    `The answer is: ${correct}.`,
  ];
  return q;
}

const BUILDERS: Record<QuestionKind, (mem: DemoFamilyMemory, all: DemoFamilyMemory[], opts: number) => MemoryQuestion | null> = {
  who: buildWho,
  relationship: buildRelationship,
  where: buildWhere,
  when: buildWhen,
  event: buildEvent,
  companion: buildCompanion,
  'visual-location': buildVisualLocation,
  sequence: buildSequence,
  'then-now': buildThenNow,
};

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export interface BuildOptions {
  difficulty: Difficulty;
  /** Optional override for how many memories to include. */
  count?: number;
}

/**
 * Build a round of questions from `memories`.
 *
 * - Samples `count` memories appropriate to `difficulty`.
 * - For each memory, picks one `QuestionKind` from the difficulty's allowed kinds,
 *   avoiding repeating the same kind back-to-back when possible.
 * - Falls back gracefully when a kind cannot be built (e.g. sequence with 1 memory).
 */
export function buildMemoryQuestions(
  memories: DemoFamilyMemory[],
  { difficulty, count }: BuildOptions,
): MemoryQuestion[] {
  const cfg = FAMILY_DIFFICULTY_CONFIG[difficulty];
  const n = count ?? cfg.count;
  const pool = shuffle([...memories]).slice(0, Math.min(n, memories.length));
  const kinds = [...cfg.kinds];
  const out: MemoryQuestion[] = [];
  let lastKind: QuestionKind | null = null;

  for (let i = 0; i < pool.length; i += 1) {
    const mem = pool[i];
    // Prefer a kind different from lastKind.
    const candidates = shuffle(kinds.filter((k) => k !== lastKind));
    const ordered = candidates.length ? candidates : shuffle(kinds);
    let built: MemoryQuestion | null = null;
    for (const kind of ordered) {
      const b = BUILDERS[kind];
      const q = b(mem, memories, cfg.optionsCount);
      if (q) {
        built = q;
        lastKind = kind;
        break;
      }
    }
    // Ultimate fallback: who (always buildable).
    if (!built) {
      built = buildWho(mem, memories, cfg.optionsCount);
      lastKind = 'who';
    }
    out.push(built);
  }
  return out;
}

/** Lightweight spaced-reinforcement helper: which memories to revisit next round. */
export interface ReinforcementItem {
  memoryId: string;
  failedKind: QuestionKind;
  attempts: number;
}

export function nextReinforcementQueue(
  prev: ReinforcementItem[],
  results: { memoryId: string; kind: QuestionKind; correct: boolean }[],
): ReinforcementItem[] {
  const map = new Map<string, ReinforcementItem>();
  for (const r of prev) map.set(r.memoryId, { ...r });
  for (const r of results) {
    if (!r.correct) {
      const cur = map.get(r.memoryId);
      if (cur) cur.attempts += 1;
      else map.set(r.memoryId, { memoryId: r.memoryId, failedKind: r.kind, attempts: 1 });
    } else {
      // Strong recall — drop from queue (no immediate repeat).
      const cur = map.get(r.memoryId);
      if (cur && cur.attempts <= 1) map.delete(r.memoryId);
      else if (cur) cur.attempts -= 1;
    }
  }
  // Cap: repeated failure (3+) stays but won't grow unbounded.
  for (const v of map.values()) if (v.attempts > 3) v.attempts = 3;
  return [...map.values()];
}

/** Swap-friendly interface for a future AI generator. */
export interface QuestionGenerator {
  generate(memories: DemoFamilyMemory[], opts: BuildOptions): MemoryQuestion[];
}

export const ruleBasedGenerator: QuestionGenerator = {
  generate: (memories, opts) => buildMemoryQuestions(memories, opts),
};

// ----------------------------------------------------------------------------
// Bridge: caregiver-managed FamilyMemory → challenge DemoFamilyMemory.
// Lets the Family Memory Challenge be generated from the memories the caregiver
// adds (spec: recognized elder's challenge sources caregiver-managed memories),
// falling back to the bundled demo set when none exist.
// ----------------------------------------------------------------------------

/** Warm placeholder illustration (SVG data URI) for a caregiver memory photo. */
function initialsCardImage(name: string): string {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="#f4e6d0"/><circle cx="240" cy="128" r="56" fill="#e7c9a8"/><rect x="150" y="196" width="180" height="120" rx="24" fill="#bfd8d0"/><text x="240" y="150" font-family="sans-serif" font-size="54" font-weight="700" fill="#7a5548" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function bridgeFamilyMemory(f: FamilyMemory): DemoFamilyMemory {
  const people = f.people && f.people.length ? f.people : [f.name];
  const relationships = f.relationships && f.relationships.length ? f.relationships : [f.relationship];
  const year = f.year ?? new Date().getFullYear();
  return {
    id: f.id,
    image: f.photo && f.photo.startsWith('data:') ? f.photo : initialsCardImage(f.name),
    title: f.name,
    people,
    relationships,
    place: f.place ?? 'our family home',
    year,
    event: f.event ?? 'a happy memory together',
    description: f.description ?? (f.info || 'A cherished family memory.'),
    category: f.category ?? 'family',
    difficulty: f.difficulty ?? 2,
    recognisable: f.people?.length ? f.people : [f.name],
  };
}

/** Bridge a list of caregiver memories into challenge memories (empty when none). */
export function bridgeFamilyMemories(list: FamilyMemory[]): DemoFamilyMemory[] {
  return list.map(bridgeFamilyMemory);
}

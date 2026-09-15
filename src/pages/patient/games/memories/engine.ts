import type { FamilyMemory } from '@/types';
import type { ActivityChoice, ActivityMode, ActivityRound } from './types';

/** Fallback distractor places if the elder profile has fewer than 2 distinct places. */
const REGIONAL_PLACES = ['Pune', 'Guwahati', 'Mumbai', 'Kolkata', 'Shillong', 'Jaipur'];

/** Fallback general companion roles if the elder profile has only 1 memory person. */
const GENERAL_COMPANIONS = ['A dear friend', 'A kind neighbour', 'A beloved teacher'];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Extract an identifiable person name from a memory record.
 */
export function getPersonName(m: FamilyMemory): string | null {
  if (m.name && m.name.trim().length > 0 && m.name !== 'Unknown') return m.name.trim();
  if (m.people && m.people.length > 0 && m.people[0].trim().length > 0) return m.people[0].trim();
  return null;
}

/**
 * Extract a place from a memory record.
 */
export function getPlaceName(m: FamilyMemory): string | null {
  if (m.place && m.place.trim().length > 0) return m.place.trim();
  return null;
}

/**
 * Pure, deterministic builder that inspects real elder memories and generates
 * gentle activity rounds. Never hallucinates family relatives or facts.
 */
export function buildMemoriesFromHomeRounds(
  memories: FamilyMemory[],
  photos: Record<string, string | null>,
  targetRoundCount = 5
): ActivityRound[] {
  if (!memories || memories.length === 0) return [];

  // Collect all known real people from the elder's memories
  const allKnownPeople = Array.from(
    new Set(
      memories
        .flatMap((m) => [getPersonName(m), ...(m.people || [])])
        .filter((p): p is string => Boolean(p && p.trim().length > 0))
    )
  );

  // Collect all known real places from the elder's memories
  const allKnownPlaces = Array.from(
    new Set(
      memories
        .map((m) => getPlaceName(m))
        .filter((p): p is string => Boolean(p && p.trim().length > 0))
    )
  );

  // Determine how many rounds to run based on available content
  const totalRounds = Math.max(1, Math.min(targetRoundCount, Math.max(memories.length, 3)));
  const shuffledMemories = shuffle(memories);
  const rounds: ActivityRound[] = [];

  for (let i = 0; i < totalRounds; i++) {
    const memory = shuffledMemories[i % shuffledMemories.length];
    const photoUrl = photos[memory.id] || memory.photo || null;
    const person = getPersonName(memory);
    const place = getPlaceName(memory);
    const maxChoices = i < 2 ? 2 : 3;

    // Decide which mode to use based on available data for this memory
    const candidateModes: ActivityMode[] = [];

    if (person) {
      candidateModes.push('who');
      candidateModes.push('match');
    }
    if (place) {
      candidateModes.push('where');
    }
    if (memories.length >= 2 && photoUrl) {
      candidateModes.push('which');
    }
    if (memory.info && memory.info.trim().length > 10) {
      candidateModes.push('complete');
    }
    // 'remember' is always valid as a gentle fallback
    candidateModes.push('remember');

    // Pick mode (avoid repeating the immediately previous mode if possible)
    const prevMode = rounds.length > 0 ? rounds[rounds.length - 1].mode : null;
    const filteredModes = candidateModes.filter((m) => m !== prevMode);
    const chosenMode: ActivityMode =
      filteredModes.length > 0
        ? filteredModes[i % filteredModes.length]
        : candidateModes[0];

    const round = createRoundForMode(
      `round-${i + 1}-${memory.id}`,
      chosenMode,
      memory,
      photoUrl,
      allKnownPeople,
      allKnownPlaces,
      memories,
      photos,
      maxChoices
    );

    rounds.push(round);
  }

  return rounds;
}

function createRoundForMode(
  roundId: string,
  mode: ActivityMode,
  memory: FamilyMemory,
  photoUrl: string | null,
  allKnownPeople: string[],
  allKnownPlaces: string[],
  allMemories: FamilyMemory[],
  photos: Record<string, string | null>,
  maxChoices: number
): ActivityRound {
  const person = getPersonName(memory) || 'our loved one';
  const place = getPlaceName(memory) || 'a familiar place';

  // -------------------------------------------------------------------------
  // MODE 1: WHO IS THIS?
  // -------------------------------------------------------------------------
  if (mode === 'who') {
    const otherPeople = allKnownPeople.filter((p) => p.toLowerCase() !== person.toLowerCase());
    const distractors = shuffle(otherPeople.length > 0 ? otherPeople : GENERAL_COMPANIONS).slice(
      0,
      maxChoices - 1
    );

    const choices: ActivityChoice[] = shuffle([
      { id: 'correct', text: person, isCorrect: true },
      ...distractors.map((d, idx) => ({ id: `dist-${idx}`, text: d, isCorrect: false })),
    ]);

    return {
      id: roundId,
      mode: 'who',
      memory,
      photoUrl,
      prompt: 'Who is this?',
      subtitle: memory.relationship ? `Your ${memory.relationship}` : 'From your family album',
      choices,
      correctFeedback: `Yes! That’s ${person} 😊`,
      gentleFeedback: `That’s okay. This is ${person}.`,
    };
  }

  // -------------------------------------------------------------------------
  // MODE 2: WHERE WAS THIS?
  // -------------------------------------------------------------------------
  if (mode === 'where') {
    const otherPlaces = allKnownPlaces.filter((p) => p.toLowerCase() !== place.toLowerCase());
    const pool = otherPlaces.length > 0 ? otherPlaces : REGIONAL_PLACES.filter((p) => p !== place);
    const distractors = shuffle(pool).slice(0, maxChoices - 1);

    const choices: ActivityChoice[] = shuffle([
      { id: 'correct', text: place, isCorrect: true },
      ...distractors.map((d, idx) => ({ id: `dist-${idx}`, text: d, isCorrect: false })),
    ]);

    return {
      id: roundId,
      mode: 'where',
      memory,
      photoUrl,
      prompt: 'Where was this?',
      subtitle: 'A memorable location with loved ones',
      choices,
      correctFeedback: `Yes! It was in ${place} 😊`,
      gentleFeedback: `That’s okay. This was in ${place}.`,
    };
  }

  // -------------------------------------------------------------------------
  // MODE 4: MEMORY MATCH / WHO BELONGS?
  // -------------------------------------------------------------------------
  if (mode === 'match') {
    const role = memory.relationship ? `${person} (${memory.relationship})` : person;
    const otherMemories = allMemories.filter((m) => m.id !== memory.id);
    const distractors = otherMemories
      .map((m) => {
        const p = getPersonName(m);
        return p && m.relationship ? `${p} (${m.relationship})` : p;
      })
      .filter((text): text is string => Boolean(text && text !== role))
      .slice(0, maxChoices - 1);

    if (distractors.length === 0) {
      distractors.push('A cherished friend');
    }

    const choices: ActivityChoice[] = shuffle([
      { id: 'correct', text: role, isCorrect: true },
      ...distractors.map((d, idx) => ({ id: `dist-${idx}`, text: d, isCorrect: false })),
    ]);

    return {
      id: roundId,
      mode: 'match',
      memory,
      photoUrl,
      prompt: 'Who belongs with this memory?',
      subtitle: memory.info ? memory.info.slice(0, 60) : 'A moment from home',
      choices,
      correctFeedback: `Yes! This memory is with ${person} 😊`,
      gentleFeedback: `That’s okay. This memory belongs with ${person}.`,
    };
  }

  // -------------------------------------------------------------------------
  // MODE 5: WHICH MEMORY IS THIS? (Multi-photo choice)
  // -------------------------------------------------------------------------
  if (mode === 'which' && allMemories.length >= 2) {
    const otherMemoriesWithPhotos = allMemories.filter(
      (m) => m.id !== memory.id && (photos[m.id] || m.photo)
    );

    if (otherMemoriesWithPhotos.length >= 1) {
      const chosenOthers = shuffle(otherMemoriesWithPhotos).slice(0, maxChoices - 1);
      const choices: ActivityChoice[] = shuffle([
        {
          id: `photo-${memory.id}`,
          text: person ? `With ${person}` : memory.name,
          image: photoUrl,
          isCorrect: true,
        },
        ...chosenOthers.map((m) => ({
          id: `photo-${m.id}`,
          text: getPersonName(m) ? `With ${getPersonName(m)}` : m.name,
          image: photos[m.id] || m.photo,
          isCorrect: false,
        })),
      ]);

      const promptTarget = person ? `With ${person}` : place;
      return {
        id: roundId,
        mode: 'which',
        memory,
        photoUrl: null, // this mode shows multiple photos in the choices area!
        prompt: `Which photo is ${promptTarget}?`,
        subtitle: 'Tap the photo that feels familiar',
        choices,
        correctFeedback: 'Yes! You found the right photo 😊',
        gentleFeedback: 'That’s okay. It was this lovely moment here.',
      };
    }
  }

  // -------------------------------------------------------------------------
  // MODE 6: COMPLETE THE MEMORY (From existing facts)
  // -------------------------------------------------------------------------
  if (mode === 'complete' && memory.info) {
    const infoLower = memory.info.toLowerCase();
    let prompt = `What do we know about ${person}?`;
    let correct = memory.info;
    let distractor1 = 'Loves quiet afternoon walks';
    let distractor2 = 'Enjoys listening to the radio';

    if (infoLower.includes('drawing')) {
      prompt = `${person} loves to...`;
      correct = 'Make lovely drawings';
      distractor1 = 'Play football';
      distractor2 = 'Bake bread';
    } else if (infoLower.includes('cricket')) {
      prompt = `${person} enjoys...`;
      correct = 'Cricket and music';
      distractor1 = 'Swimming in the river';
      distractor2 = 'Reading astronomy';
    } else if (infoLower.includes('guwahati') || infoLower.includes('works')) {
      prompt = `${person} comes home for...`;
      correct = 'Family celebrations';
      distractor1 = 'Winter holidays';
      distractor2 = 'The harvest fair';
    } else if (memory.info.length <= 40) {
      prompt = `A special detail about ${person}:`;
      correct = memory.info;
      distractor1 = 'Always shares warm smiles';
      distractor2 = 'Brings sweet treats';
    }

    const pool = maxChoices === 2 ? [distractor1] : [distractor1, distractor2];
    const choices: ActivityChoice[] = shuffle([
      { id: 'correct', text: correct, isCorrect: true },
      ...pool.map((d, idx) => ({ id: `dist-${idx}`, text: d, isCorrect: false })),
    ]);

    return {
      id: roundId,
      mode: 'complete',
      memory,
      photoUrl,
      prompt,
      subtitle: `Remembering ${person}`,
      choices,
      correctFeedback: 'Yes! That’s exactly how the memory goes 😊',
      gentleFeedback: `That’s okay. The memory goes: ${correct}.`,
    };
  }

  // -------------------------------------------------------------------------
  // MODE 3: WHAT DO YOU REMEMBER ABOUT THIS? (Gentle reflection / recognition)
  // -------------------------------------------------------------------------
  const desc = memory.info || memory.notes || 'A happy moment together';
  const choices: ActivityChoice[] = [
    { id: 'c1', text: 'A happy celebration with family', isCorrect: true },
    { id: 'c2', text: 'A quiet peaceful day at home', isCorrect: true },
  ];
  if (maxChoices > 2) {
    choices.push({ id: 'c3', text: 'A warm visit from loved ones', isCorrect: true });
  }

  return {
    id: roundId,
    mode: 'remember',
    memory,
    photoUrl,
    prompt: 'What do you remember about this?',
    subtitle: desc.length > 50 ? `${desc.slice(0, 50)}…` : desc,
    choices,
    correctFeedback: 'What a wonderful memory to hold close ❤️',
    gentleFeedback: 'Every little moment with family is precious 💛',
  };
}

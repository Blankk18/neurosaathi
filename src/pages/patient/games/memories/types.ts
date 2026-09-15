import type { FamilyMemory } from '@/types';

export type ActivityMode =
  | 'who' // Mode 1: Who is this?
  | 'where' // Mode 2: Where was this?
  | 'remember' // Mode 3: What do you remember about this?
  | 'match' // Mode 4: Memory Match / Who belongs with this memory?
  | 'which' // Mode 5: Which memory is this? (Multi-photo choice)
  | 'complete'; // Mode 6: Complete the memory (phrase fill-in from actual facts)

export interface ActivityChoice {
  id: string;
  text: string;
  image?: string | null;
  isCorrect: boolean;
}

export interface ActivityRound {
  id: string;
  mode: ActivityMode;
  memory: FamilyMemory;
  photoUrl: string | null;
  /** Primary question prompt, e.g. "Who is this?" or "Where was this?" */
  prompt: string;
  /** Contextual subtitle, e.g. "From a cherished celebration" */
  subtitle?: string;
  /** 2 to 3 large, accessible choices */
  choices: ActivityChoice[];
  /** Warm affirmative feedback when chosen correctly */
  correctFeedback: string;
  /** Reassuring, gentle feedback when chosen differently */
  gentleFeedback: string;
}

export type GameState =
  | 'intro'
  | 'loading'
  | 'playing'
  | 'feedback'
  | 'complete'
  | 'empty'
  | 'error';

export interface VisitedMemorySummary {
  id: string;
  title: string;
  photoUrl?: string | null;
  detail?: string;
}

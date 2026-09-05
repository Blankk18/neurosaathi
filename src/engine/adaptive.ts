import type { Difficulty, GameKind, GameResult } from '@/types';
import { isResponseTimeGood } from './scoring';

// ============================================================================
// Adaptive difficulty engine.
//
// Rule (per spec): use a short window of recent sessions (last 3–5), not one
// question.
//   • accuracy >= 85% AND good response time  →  increase difficulty
//   • accuracy 60–85%                          →  maintain
//   • accuracy < 60% OR repeated mistakes      →  decrease + offer assistance
//
// This is a mock engine written to be swapped for a real ML model later. It
// returns a decision object that the UI can display verbatim.
// ============================================================================

export interface AdaptationDecision {
  previousDifficulty: Difficulty;
  nextDifficulty: Difficulty;
  action: 'increase' | 'maintain' | 'decrease';
  reason: string;
  evidence: {
    accuracy: number;
    responseTimeSec: number;
    mistakes: number;
    recentSessions: number;
  };
}

const LEVEL_NAMES = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];

export function difficultyLabel(d: Difficulty): string {
  return LEVEL_NAMES[d - 1];
}

export function clampDifficulty(d: number): Difficulty {
  return Math.max(1, Math.min(5, Math.round(d))) as Difficulty;
}

/**
 * Decide the next difficulty for `game` given the patient's recent history.
 * `windowSize` defaults to the last 5 sessions; only counts completed sessions
 * for the same game kind.
 */
export function adaptDifficulty(
  previousDifficulty: Difficulty,
  recent: GameResult[],
  windowSize = 5,
): AdaptationDecision {
  const tail = recent.slice(-windowSize);
  const n = tail.length;

  if (n === 0) {
    return {
      previousDifficulty,
      nextDifficulty: previousDifficulty,
      action: 'maintain',
      reason: 'No recent sessions yet — keeping the current level.',
      evidence: { accuracy: 0, responseTimeSec: 0, mistakes: 0, recentSessions: 0 },
    };
  }

  const weightedAccuracy =
    tail.reduce((sum, r, i) => sum + r.accuracy * (i + 1), 0) /
    tail.reduce((sum, _r, i) => sum + (i + 1), 0);
  const avgRt = tail.reduce((sum, r) => sum + r.responseTimeSec, 0) / n;
  const totalMistakes = tail.reduce((sum, r) => sum + r.mistakes, 0);

  const goodRt = isResponseTimeGood(previousDifficulty, avgRt);

  const highConsistent = weightedAccuracy >= 85;
  const mid = weightedAccuracy >= 60;
  const low = weightedAccuracy < 60;
  const repeatedMistakes = totalMistakes >= Math.max(4, n * 2);
  const improve = highConsistent && goodRt;
  const decline = (low || repeatedMistakes || weightedAccuracy < 62) && n >= 3;

  let action: AdaptationDecision['action'];
  let reason: string;
  let next: Difficulty;

  if (improve) {
    action = 'increase';
    next = clampDifficulty(previousDifficulty + 1);
    reason = 'Consistent high accuracy over recent activities.';
  } else if (decline) {
    action = 'decrease';
    next = clampDifficulty(previousDifficulty - 1);
    reason = 'Recent accuracy dipped or repeated mistakes appeared — offering a gentler level with more assistance.';
  } else {
    action = 'maintain';
    next = previousDifficulty;
    reason = mid
      ? 'Accuracy is steady — keeping the same level to build confidence.'
      : 'Settling in at the current level.';
  }

  return {
    previousDifficulty,
    nextDifficulty: next,
    action,
    reason,
    evidence: {
      accuracy: Math.round(weightedAccuracy),
      responseTimeSec: +avgRt.toFixed(1),
      mistakes: totalMistakes,
      recentSessions: n,
    },
  };
}

export const LEVEL_TO_CARDS: Record<Difficulty, number> = { 1: 4, 2: 6, 3: 8, 4: 10, 5: 12 };
export const LEVEL_TO_PATTERN_LEN: Record<Difficulty, number> = { 1: 3, 2: 4, 3: 5, 4: 6, 5: 7 };
export const LEVEL_TO_SCENE_SECS: Record<Difficulty, number> = { 1: 16, 2: 13, 3: 10, 4: 8, 5: 6 };

export function recentForGame(all: GameResult[], game: GameKind): GameResult[] {
  return all.filter((r) => r.game === game).sort((a, b) => a.playedAt.localeCompare(b.playedAt));
}

export function currentDifficulty(all: GameResult[], game: GameKind, fallback: Difficulty): Difficulty {
  const forGame = all.filter((r) => r.game === game);
  if (forGame.length === 0) return fallback;
  return (forGame[forGame.length - 1].nextDifficulty ?? fallback) as Difficulty;
}

// Shared, game-agnostic summary used by the "How NeuroSaathi Adapts" panel.
export function summarizeAdaptation(all: GameResult[], game: GameKind, fallback: Difficulty) {
  const recent = recentForGame(all, game);
  const prev = currentDifficulty(all, game, fallback);
  const decision = adaptDifficulty(prev, recent);
  return { recent, decision };
}

/**
 * Decision that includes the just-finished current session. The current metrics
 * are appended to recent history before the rule is applied, so difficulty
 * never jumps off a single attempt — the window still smooths over past play.
 */
export function decideFromCurrent(
  game: GameKind,
  recent: GameResult[],
  current: { accuracy: number; responseTimeSec: number; mistakes: number },
  windowSize = 5,
): AdaptationDecision {
  const previous = recent.length ? (recent[recent.length - 1].nextDifficulty as Difficulty) : 1;
  const pseudo: GameResult = {
    id: 'current',
    patientId: 'current',
    game,
    playedAt: new Date().toISOString(),
    accuracy: current.accuracy,
    responseTimeSec: current.responseTimeSec,
    mistakes: current.mistakes,
    attempts: 1,
    difficulty: previous,
    nextDifficulty: previous,
  };
  return adaptDifficulty(previous, [...recent, pseudo], windowSize);
}
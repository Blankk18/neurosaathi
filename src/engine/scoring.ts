import type { GameResult, Difficulty, GameKind } from '@/types';

// ============================================================================
// Game scoring — turns raw gameplay interactions into a GameResult.
// ============================================================================

export interface SessionMetrics {
  correct: number;
  total: number;
  responseTimes: number[];
  mistakes: number;
}

export function accuracyOf(metrics: SessionMetrics): number {
  if (metrics.total === 0) return 0;
  return Math.round((metrics.correct / metrics.total) * 100);
}

export function averageResponseTime(responseTimes: number[]): number {
  if (responseTimes.length === 0) return 0;
  return +(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1);
}

/** Good response time is relative to difficulty — harder levels allow more time. */
export function isResponseTimeGood(difficulty: Difficulty, avgSec: number): boolean {
  const threshold = [2.5, 3, 4, 5, 6.5]; // level 1..5
  return avgSec <= threshold[difficulty - 1];
}

export function buildGameResult(
  patientId: string,
  game: GameKind,
  metrics: SessionMetrics,
  difficulty: Difficulty,
  nextDifficulty: Difficulty,
  adaptationNote?: string,
  region?: GameResult['region'],
): GameResult {
  return {
    id: `game-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    patientId,
    game,
    playedAt: new Date().toISOString(),
    accuracy: accuracyOf(metrics),
    responseTimeSec: averageResponseTime(metrics.responseTimes),
    mistakes: metrics.mistakes,
    attempts: metrics.total,
    difficulty,
    nextDifficulty,
    adaptationNote,
    region,
  };
}
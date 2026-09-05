import { useState } from 'react';
import { useApp } from '@/state/AppContext';
import { buildGameResult, type SessionMetrics } from '@/engine/scoring';
import { decideFromCurrent, recentForGame, currentDifficulty, type AdaptationDecision } from '@/engine/adaptive';
import type { GameKind, GameResult } from '@/types';

export function useGameSession(game: GameKind) {
  const { state, dispatch } = useApp();
  const [last, setLast] = useState<{ result: GameResult; decision: AdaptationDecision } | null>(null);

  const recent = recentForGame(state.gameResults, game);
  const prev = currentDifficulty(state.gameResults, game, state.profile?.difficulty[game] ?? 1);

  const finish = (metrics: SessionMetrics, aux?: { region?: GameResult['region'] }) => {
    const decision = decideFromCurrent(game, recent, {
      accuracy: Math.round((metrics.correct / Math.max(1, metrics.total)) * 100),
      responseTimeSec: metrics.responseTimes.length
        ? +(
            metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
          ).toFixed(1)
        : 3,
      mistakes: metrics.mistakes,
    });
    const result = buildGameResult(
      state.patient?.id ?? 'patient-asha',
      game,
      metrics,
      decision.previousDifficulty,
      decision.nextDifficulty,
      decision.action !== 'maintain' ? decision.reason : undefined,
      aux?.region,
    );
    dispatch({ type: 'ADD_GAME_RESULT', result });
    setLast({ result, decision });
    return { result, decision };
  };

  // `decision` mirrors the latest finished session so pages can show the
  // adaptation verdict (Level X → Level Y) exactly like the AI panel does.
  return { finish, last, decision: last?.decision, recent, prev };
}
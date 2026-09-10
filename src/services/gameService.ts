// ============================================================================
// GAME SERVICE — Supabase Cognitive Game Sessions & Question Attempts
// Records gameplay metrics and attempts for longitudinal performance tracking.
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type { GameResult } from '@/types';
import type { DbGameSession, DbGameAttempt } from '@/types/database';

export const gameService = {
  /**
   * Save a completed game session and individual question attempts to Supabase
   */
  async recordSession(
    elderId: string,
    result: GameResult,
    attempts?: Omit<DbGameAttempt, 'id' | 'session_id' | 'elder_id' | 'created_at'>[]
  ): Promise<DbGameSession | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const now = new Date().toISOString();
      const startedAt = new Date(Date.now() - result.responseTimeSec * 1000 * Math.max(1, result.attempts)).toISOString();

      const { data: session, error } = await supabase
        .from('game_sessions')
        .insert({
          elder_id: elderId,
          game_type: result.game,
          difficulty: result.difficulty,
          score: Math.round(result.accuracy),
          accuracy: Number(result.accuracy.toFixed(2)),
          average_response_time: Number(result.responseTimeSec.toFixed(2)),
          mistakes: result.mistakes,
          attempts: result.attempts,
          adaptation_note: result.adaptationNote || null,
          started_at: startedAt,
          completed_at: result.playedAt || now,
        })
        .select()
        .single();

      if (error || !session) {
        // eslint-disable-next-line no-console
        console.warn('[gameService] Error inserting session:', error?.message);
        return null;
      }

      // Record question-level attempts if provided
      if (attempts && attempts.length > 0) {
        const attemptRows = attempts.map((att) => ({
          session_id: session.id,
          elder_id: elderId,
          question_type: att.question_type,
          question: att.question,
          answer: att.answer,
          correct: att.correct,
          response_time: att.response_time,
        }));

        await supabase.from('game_attempts').insert(attemptRows);
      }

      return session as DbGameSession;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn('[gameService] Network error recording session:', err.message);
      return null;
    }
  },

  /**
   * Fetch recent game sessions for an elder
   */
  async getSessions(elderId: string, limit = 50): Promise<DbGameSession[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('elder_id', elderId)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[gameService] Error fetching sessions:', error.message);
        return [];
      }

      return (data || []) as DbGameSession[];
    } catch {
      return [];
    }
  },
};

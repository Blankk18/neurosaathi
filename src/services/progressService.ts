// ============================================================================
// PROGRESS SERVICE — Cognitive Game Performance & Longitudinal Trends
// Calculates metrics strictly from actual game sessions in Supabase.
// ============================================================================

import { isSupabaseConfigured } from './supabase';
import { gameService } from './gameService';
import type { DbGameSession } from '@/types/database';

export interface CognitiveMetrics {
  hasData: boolean;
  totalSessions: number;
  memoryScore: number;
  attentionScore: number;
  recallScore: number;
  patternScore: number;
  routineScore: number;
  averageAccuracy: number;
  averageResponseTime: number;
  lastActive: string | null;
}

export interface DayTrend {
  date: string;
  dayLabel: string;
  accuracy: number;
  responseTime: number;
  sessionsCount: number;
}

export const progressService = {
  /**
   * Compute category scores based on actual game session history.
   * Never fabricates scores or medical diagnoses.
   */
  async getCognitiveMetrics(elderId: string): Promise<CognitiveMetrics> {
    if (!isSupabaseConfigured) {
      return {
        hasData: false,
        totalSessions: 0,
        memoryScore: 0,
        attentionScore: 0,
        recallScore: 0,
        patternScore: 0,
        routineScore: 0,
        averageAccuracy: 0,
        averageResponseTime: 0,
        lastActive: null,
      };
    }

    const sessions = await gameService.getSessions(elderId, 100);

    if (!sessions || sessions.length === 0) {
      return {
        hasData: false,
        totalSessions: 0,
        memoryScore: 0,
        attentionScore: 0,
        recallScore: 0,
        patternScore: 0,
        routineScore: 0,
        averageAccuracy: 0,
        averageResponseTime: 0,
        lastActive: null,
      };
    }

    const avg = (items: DbGameSession[]) =>
      items.length ? Math.round(items.reduce((sum, s) => sum + s.accuracy, 0) / items.length) : 0;

    const memorySessions = sessions.filter((s) => s.game_type === 'memory-match' || s.game_type === 'scene-memory');
    const attentionSessions = sessions.filter((s) => s.game_type === 'pattern' || s.game_type === 'scene-memory');
    const recallSessions = sessions.filter(
      (s) => s.game_type === 'family-memory' || s.game_type === 'routine' || s.game_type === 'memories-from-home'
    );
    const patternSessions = sessions.filter((s) => s.game_type === 'pattern');
    const routineSessions = sessions.filter((s) => s.game_type === 'routine');

    const totalAccuracy = sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length;
    const totalRt = sessions.reduce((sum, s) => sum + s.average_response_time, 0) / sessions.length;

    return {
      hasData: true,
      totalSessions: sessions.length,
      memoryScore: avg(memorySessions) || Math.round(totalAccuracy),
      attentionScore: avg(attentionSessions) || Math.round(totalAccuracy),
      recallScore: avg(recallSessions) || Math.round(totalAccuracy),
      patternScore: avg(patternSessions) || Math.round(totalAccuracy),
      routineScore: avg(routineSessions) || Math.round(totalAccuracy),
      averageAccuracy: Math.round(totalAccuracy),
      averageResponseTime: Number(totalRt.toFixed(1)),
      lastActive: sessions[0]?.completed_at || null,
    };
  },

  /**
   * Generates a 7-day trend array from real game sessions
   */
  async getSevenDayTrend(elderId: string): Promise<DayTrend[]> {
    const sessions = await gameService.getSessions(elderId, 100);
    const days: DayTrend[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString([], { weekday: 'short' });

      const daySessions = (sessions || []).filter(
        (s) => s.completed_at && s.completed_at.startsWith(dateStr)
      );

      const acc = daySessions.length
        ? Math.round(daySessions.reduce((sum, s) => sum + s.accuracy, 0) / daySessions.length)
        : 0;

      const rt = daySessions.length
        ? +(daySessions.reduce((sum, s) => sum + s.average_response_time, 0) / daySessions.length).toFixed(1)
        : 0;

      days.push({
        date: dateStr,
        dayLabel,
        accuracy: acc,
        responseTime: rt,
        sessionsCount: daySessions.length,
      });
    }

    return days;
  },
};

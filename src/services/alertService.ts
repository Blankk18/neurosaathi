// ============================================================================
// ALERT SERVICE — Supabase Centralized Alerts & Notifications
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type { DbAlert } from '@/types/database';

export const alertService = {
  /**
   * Fetch all alerts for a specific elder (ordered by newest first)
   */
  async getAlerts(elderId: string, limit = 50): Promise<DbAlert[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('elder_id', elderId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[alertService] Error fetching alerts:', error.message);
        return [];
      }

      return (data || []) as DbAlert[];
    } catch {
      return [];
    }
  },

  /**
   * Mark an alert as reviewed
   */
  async markReviewed(alertId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'reviewed' })
        .eq('id', alertId);

      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Create an authoritative alert record in Supabase
   */
  async createAlert(alert: {
    elderId: string;
    type: 'LOCATION' | 'FACE_RECOGNITION' | 'COGNITIVE_ACTIVITY' | 'SYSTEM';
    severity: 'info' | 'attention' | 'critical';
    message: string;
    reasons?: string[];
    photo?: string | null;
  }): Promise<DbAlert | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert({
          elder_id: alert.elderId,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          reasons: alert.reasons || [],
          photo: alert.photo || null,
          status: 'unread',
        })
        .select()
        .single();

      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[alertService] Error creating alert:', error.message);
        return null;
      }

      return data as DbAlert;
    } catch {
      return null;
    }
  },
};

// ============================================================================
// ELDER SERVICE — Centralized Supabase operations for Elder profiles
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type { DbElderProfile } from '@/types/database';

export const elderService = {
  /**
   * Retrieve a specific elder profile by id
   */
  async getElderProfile(elderId: string): Promise<DbElderProfile | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('elder_profiles')
        .select('*')
        .eq('id', elderId)
        .single();

      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[elderService] getElderProfile error:', error.message);
        return null;
      }
      return data as DbElderProfile;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn('[elderService] Network error:', err.message);
      return null;
    }
  },

  /**
   * Fetch all elders assigned to the active caregiver
   * If no specific caregiver_id provided or unauthenticated, loads all registered elders
   */
  async getAssignedElders(caregiverId?: string): Promise<DbElderProfile[]> {
    if (!isSupabaseConfigured) return [];
    try {
      if (caregiverId) {
        const { data: assignments, error: relError } = await supabase
          .from('caregiver_elder')
          .select('elder_id')
          .eq('caregiver_id', caregiverId);

        if (!relError && assignments && assignments.length > 0) {
          const elderIds = assignments.map((a: { elder_id: string }) => a.elder_id);
          const { data: elders } = await supabase
            .from('elder_profiles')
            .select('*')
            .in('id', elderIds)
            .order('name');
          if (elders && elders.length > 0) return elders as DbElderProfile[];
        }
      }

      // Fallback: list all available elder profiles
      const { data: allElders, error } = await supabase
        .from('elder_profiles')
        .select('*')
        .order('name');

      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[elderService] getAssignedElders error:', error.message);
        return [];
      }
      return (allElders || []) as DbElderProfile[];
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn('[elderService] Network error fetching assigned elders:', err.message);
      return [];
    }
  },

  /**
   * Update an elder's profile attributes
   */
  async updateElderProfile(elderId: string, updates: Partial<DbElderProfile>): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('elder_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', elderId);

      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[elderService] updateElderProfile error:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },
};

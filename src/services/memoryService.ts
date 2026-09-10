// ============================================================================
// MEMORY SERVICE — Supabase Family Memories & Media Storage Integration
// Handles CRUD, Supabase Storage uploads, and Realtime sync for memories.
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type { FamilyMemory } from '@/types';
import type { DbFamilyMemory, DbMemoryMedia } from '@/types/database';

export const memoryService = {
  /**
   * Retrieve all family memories for a specific elder, including media URLs
   */
  async getMemories(elderId: string): Promise<FamilyMemory[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data: memories, error } = await supabase
        .from('family_memories')
        .select(`
          *,
          memory_media (*)
        `)
        .eq('elder_id', elderId)
        .order('created_at', { ascending: false });

      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[memoryService] Error fetching memories:', error.message);
        return [];
      }

      if (!memories) return [];

      return memories.map((m: any) => {
        // Get media url if present
        let photoUrl: string | undefined = undefined;
        if (m.memory_media && m.memory_media.length > 0) {
          const firstMedia = m.memory_media[0] as DbMemoryMedia;
          const { data: pubData } = supabase.storage
            .from('family-memories')
            .getPublicUrl(firstMedia.storage_path);
          photoUrl = pubData?.publicUrl;
        }

        return {
          id: m.id,
          patientId: m.elder_id,
          name: m.person || m.title,
          relationship: m.relationship || '',
          photo: photoUrl,
          info: m.description || m.notes || '',
          notes: m.notes || '',
          createdAt: m.created_at,
          people: m.person ? [m.person] : [],
          relationships: m.relationship ? [m.relationship] : [],
          place: m.place || undefined,
          year: m.memory_year || undefined,
          event: m.event || undefined,
          description: m.description || undefined,
          category: (m.category as any) || 'family',
          difficulty: m.difficulty || 1,
          tags: m.tags || [],
        };
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn('[memoryService] Network error fetching memories:', err.message);
      return [];
    }
  },

  /**
   * Upload a memory media file to Supabase Storage ('family-memories' bucket)
   */
  async uploadMedia(
    elderId: string,
    memoryId: string,
    file: File
  ): Promise<{ path: string; publicUrl: string } | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${elderId}/${memoryId}/${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('family-memories')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        // eslint-disable-next-line no-console
        console.warn('[memoryService] Media upload error:', uploadError.message);
        return null;
      }

      const { data } = supabase.storage.from('family-memories').getPublicUrl(filePath);
      return { path: filePath, publicUrl: data.publicUrl };
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn('[memoryService] Exception during media upload:', err.message);
      return null;
    }
  },

  /**
   * Add a new family memory with optional photo/video attachment (Caregiver only)
   */
  async addMemory(
    elderId: string,
    memoryData: {
      title: string;
      person?: string;
      relationship?: string;
      place?: string;
      event?: string;
      memoryYear?: number;
      description?: string;
      notes?: string;
      category?: string;
    },
    mediaFile?: File | null
  ): Promise<FamilyMemory | null> {
    if (!isSupabaseConfigured) return null;
    try {
      // 1. Insert memory record
      const { data: mem, error } = await supabase
        .from('family_memories')
        .insert({
          elder_id: elderId,
          title: memoryData.title,
          person: memoryData.person || null,
          relationship: memoryData.relationship || null,
          place: memoryData.place || null,
          event: memoryData.event || null,
          memory_year: memoryData.memoryYear || null,
          description: memoryData.description || null,
          notes: memoryData.notes || null,
          category: memoryData.category || 'family',
        })
        .select()
        .single();

      if (error || !mem) {
        // eslint-disable-next-line no-console
        console.warn('[memoryService] Error creating memory:', error?.message);
        throw new Error(error?.message || 'Failed to create memory');
      }

      let photoUrl: string | undefined = undefined;

      // 2. Upload media file to Supabase Storage if provided
      if (mediaFile) {
        const uploaded = await this.uploadMedia(elderId, mem.id, mediaFile);
        if (uploaded) {
          photoUrl = uploaded.publicUrl;
          const mediaType = mediaFile.type.startsWith('video') ? 'video' : 'image';
          await supabase.from('memory_media').insert({
            memory_id: mem.id,
            elder_id: elderId,
            storage_path: uploaded.path,
            media_type: mediaType,
            file_name: mediaFile.name,
          });
        }
      }

      return {
        id: mem.id,
        patientId: mem.elder_id,
        name: mem.person || mem.title,
        relationship: mem.relationship || '',
        photo: photoUrl,
        info: mem.description || mem.notes || '',
        notes: mem.notes || '',
        createdAt: mem.created_at,
        people: mem.person ? [mem.person] : [],
        relationships: mem.relationship ? [mem.relationship] : [],
        place: mem.place || undefined,
        year: mem.memory_year || undefined,
        event: mem.event || undefined,
        description: mem.description || undefined,
        category: (mem.category as any) || 'family',
        difficulty: mem.difficulty || 1,
        tags: mem.tags || [],
      };
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn('[memoryService] addMemory error:', err.message);
      return null;
    }
  },

  /**
   * Update an existing family memory (Caregiver only)
   */
  async updateMemory(
    memoryId: string,
    elderId: string,
    updates: Partial<DbFamilyMemory>,
    newMediaFile?: File | null
  ): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('family_memories')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoryId);

      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[memoryService] updateMemory error:', error.message);
        return false;
      }

      if (newMediaFile) {
        const uploaded = await this.uploadMedia(elderId, memoryId, newMediaFile);
        if (uploaded) {
          const mediaType = newMediaFile.type.startsWith('video') ? 'video' : 'image';
          await supabase.from('memory_media').insert({
            memory_id: memoryId,
            elder_id: elderId,
            storage_path: uploaded.path,
            media_type: mediaType,
            file_name: newMediaFile.name,
          });
        }
      }

      return true;
    } catch {
      return false;
    }
  },

  /**
   * Delete a family memory and associated media (Caregiver only)
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('family_memories')
        .delete()
        .eq('id', memoryId);

      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Subscribe to Realtime memory updates for an elder.
   * Enables immediate refresh when a caregiver adds/edits a memory.
   */
  subscribeToMemories(elderId: string, onUpdate: () => void): () => void {
    if (!isSupabaseConfigured) return () => {};

    const channel = supabase
      .channel(`memories-channel-${elderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_memories',
          filter: `elder_id=eq.${elderId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

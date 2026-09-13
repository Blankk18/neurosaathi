// ============================================================================
// FACE MATCHING RPC HELPER — Cross-device face identification
//
// Calls the server-side match-face-descriptor RPC to identify an elder by
// their 128-dimensional face descriptor, independent of auth session.
//
// This enables cross-device login: any device can match the captured face
// against ALL active enrollments in the database.
// ============================================================================

import { supabase } from './supabase';

export interface FaceMatchResult {
  matched: boolean;
  elderId?: string;
  name?: string;
  age?: number;
  language?: string;
  region?: string;
  error?: string;
}

/**
 * Call the match-face-descriptor RPC to identify an elder by face descriptor.
 *
 * @param descriptor - 128-dimensional face descriptor (array of floats)
 * @returns { matched: true, elderId, ... } or { matched: false }
 */
export async function matchFaceDescriptorGlobally(descriptor: number[]): Promise<FaceMatchResult> {
  if (!descriptor || descriptor.length !== 128) {
    console.error('[faceMatch] Invalid descriptor — must be 128-dimensional array');
    return { matched: false, error: 'Invalid descriptor' };
  }

  try {
    console.info('[faceMatch] Calling match-face-descriptor RPC…');

    const { data, error } = await supabase.functions.invoke('match-face-descriptor', {
      body: { descriptor },
    });

    if (error) {
      console.error('[faceMatch] RPC error:', error);
      return { matched: false, error: error.message };
    }

    if (!data) {
      console.error('[faceMatch] RPC returned empty response');
      return { matched: false, error: 'Empty RPC response' };
    }

    if (data.matched) {
      console.info('[faceMatch] Match found:', {
        elderId: data.elderId,
        name: data.name,
        distance: data.distance,
      });
    } else {
      console.info('[faceMatch] No match found — face not recognized');
    }

    return data as FaceMatchResult;
  } catch (err) {
    console.error('[faceMatch] Exception:', err);
    return { matched: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

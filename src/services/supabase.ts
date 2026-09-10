// ============================================================================
// SUPABASE CLIENT SERVICE
// Authenticated connection layer to Supabase PostgreSQL & Storage.
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseKey.length > 10
);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] Missing or invalid VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Operating in resilient offline fallback mode.'
  );
}

// Client initialization with session persistence and auto-refresh
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://cljsjxwkztspuxaazgbx.supabase.co',
  supabaseKey || 'placeholder-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/**
 * Check if Supabase connection is healthy and responsive
 */
export async function checkSupabaseHealth(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
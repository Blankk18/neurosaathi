// ============================================================================
// AUTH SERVICE — Face-First Elder Auth via Supabase Anonymous Sign-In
//
// Elder registration flow:
//   1. supabase.auth.signInAnonymously() — no email, no password
//   2. Insert profiles row (auth_user_id = anon uid)
//   3. Onboarding form (name, age, language, etc.)
//   4. saveElderProfile() → elder_profiles row → elderId UUID
//   5. FaceEnrollment → faceDatabaseService.saveFaceEnrollment(elderId, samples)
//
// Elder login flow:
//   → FaceLogin modal only — Supabase session is anonymous and long-lived
//
// SECURITY:
//   - Uses only VITE_SUPABASE_PUBLISHABLE_KEY (anon key)
//   - No passwords are ever stored anywhere
//   - Supabase Auth owns the anonymous session token
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type { LanguageCode, Region } from '@/types';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface AuthResult {
  success: boolean;
  error?: string;
  detail?: string;
}

export interface AnonSignInResult extends AuthResult {
  authUserId?: string;
  profileId?: string;
}

export interface ElderProfileResult extends AuthResult {
  authUserId?: string;
  profileId?: string;
  /** The elder_profiles.id — becomes the authoritative patient.id in app state */
  elderId?: string;
  name?: string;
  age?: number;
  language?: LanguageCode;
  region?: Region;
  interests?: string[];
}

// ---------------------------------------------------------------------------
// Step 1: Anonymous sign-in + profile row creation
// ---------------------------------------------------------------------------

/**
 * Signs in anonymously via Supabase Auth.
 * Returns the anonymous auth user ID and immediately creates a profiles row.
 *
 * Called once when the elder starts onboarding. No email or password required.
 *
 * Supabase Dashboard requirement:
 *   Authentication → Providers → Anonymous → "Enable anonymous sign-ins" ON
 */
export async function signInAnonymouslyAndCreateProfile(name: string): Promise<AnonSignInResult> {
  if (!isSupabaseConfigured) {
    // eslint-disable-next-line no-console
    console.error('[authService] Supabase not configured — check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
    return { success: false, error: 'Registration service unavailable. Please check your connection.' };
  }

  // ── Step A: Anonymous sign-in ────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.info('[authService] Step A — calling supabase.auth.signInAnonymously()…');
  const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

  if (authError) {
    // eslint-disable-next-line no-console
    console.error('[authService] Step A FAILED — signInAnonymously error:', authError);
    const msg = authError.message.toLowerCase();
    if (msg.includes('anonymous') || msg.includes('not enabled') || msg.includes('provider')) {
      return {
        success: false,
        error: 'Anonymous sign-in is not enabled. Enable it in Supabase Dashboard → Authentication → Providers → Anonymous.',
        detail: authError.message,
      };
    }
    return { success: false, error: `Auth failed: ${authError.message}`, detail: authError.message };
  }

  if (!authData.user) {
    // eslint-disable-next-line no-console
    console.error('[authService] Step A FAILED — signInAnonymously returned no user');
    return { success: false, error: 'Account setup failed — no user returned. Please try again.' };
  }

  const authUserId = authData.user.id;
  // eslint-disable-next-line no-console
  console.info(`[authService] Step A OK — anonymous user created. authUserId: ${authUserId}`);

  // ── Step B: Check for existing profiles row ──────────────────────────────
  // eslint-disable-next-line no-console
  console.info(`[authService] Step B — checking for existing profiles row for authUserId: ${authUserId}`);
  const { data: existingProfile, error: selectErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (selectErr) {
    // eslint-disable-next-line no-console
    console.error('[authService] Step B FAILED — profiles SELECT error:', selectErr);
    // Non-fatal: fall through and attempt insert
  }

  if (existingProfile) {
    const profileId = (existingProfile as { id: string }).id;
    // eslint-disable-next-line no-console
    console.info(`[authService] Step B — reusing existing profiles row. profileId: ${profileId}`);
    return { success: true, authUserId, profileId };
  }

  // ── Step C: Insert new profiles row ─────────────────────────────────────
  // NOTE: email is explicitly set to null — anonymous users have no email.
  // The profiles.email column MUST be nullable (run 20260912_fix_anonymous_registration.sql).
  // The INSERT RLS policy "Users can insert own profile" MUST exist (same migration).
  // eslint-disable-next-line no-console
  console.info(`[authService] Step C — inserting profiles row. auth_user_id: ${authUserId}, name: "${name.trim() || 'Elder'}", role: ELDER, email: null`);

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .insert({
      auth_user_id: authUserId,
      name: name.trim() || 'Elder',
      role: 'ELDER',
      email: null,          // explicit null — anonymous users have no email
    })
    .select('id')
    .single();

  if (profileError || !profileData) {
    // eslint-disable-next-line no-console
    console.error('[authService] Step C FAILED — profiles INSERT error:', {
      code: profileError?.code,
      message: profileError?.message,
      hint: profileError?.hint,
      details: profileError?.details,
    });

    // Surface a meaningful message for common errors:
    const errMsg = profileError?.message ?? 'Unknown error';
    const errCode = profileError?.code ?? '';

    if (errCode === '42501' || errMsg.includes('policy') || errMsg.includes('permission')) {
      return {
        success: false,
        error: 'Profile INSERT was blocked by RLS. Run migration 20260912_fix_anonymous_registration.sql in Supabase SQL editor.',
        detail: errMsg,
      };
    }
    if (errCode === '23502' || errMsg.includes('not-null') || errMsg.includes('NOT NULL')) {
      return {
        success: false,
        error: 'profiles.email column has NOT NULL constraint. Run migration 20260912_fix_anonymous_registration.sql to make it nullable.',
        detail: errMsg,
      };
    }
    if (errCode === '23505' || errMsg.includes('unique') || errMsg.includes('duplicate')) {
      return {
        success: false,
        error: 'A profile for this account already exists. Try refreshing the page.',
        detail: errMsg,
      };
    }
    return {
      success: false,
      error: `Profile save failed: ${errMsg}`,
      detail: errMsg,
    };
  }

  const profileId = (profileData as { id: string }).id;
  // eslint-disable-next-line no-console
  console.info(`[authService] Step C OK — profiles row created. profileId: ${profileId}`);

  return { success: true, authUserId, profileId };
}

// ---------------------------------------------------------------------------
// Step 2: Save / upsert elder_profiles
// ---------------------------------------------------------------------------

/**
 * Upserts the elder_profiles row after onboarding form is complete.
 * Returns the elder_profiles.id (UUID) to use as the authoritative patient.id.
 *
 * Called from Onboarding.tsx at step 5 completion.
 */
export async function saveElderProfile(params: {
  authUserId?: string;
  name: string;
  email?: string;
  age: number;
  language: LanguageCode;
  region: Region;
  interests: string[];
}): Promise<ElderProfileResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Not connected to database' };
  }

  const { name, age, language, region, interests } = params;

  try {
    // 1. Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // eslint-disable-next-line no-console
      console.error('[authService] saveElderProfile failed — no authenticated user:', authError);
      return {
        success: false,
        error: 'No authenticated Supabase user found. Please restart registration.',
        detail: authError?.message,
      };
    }

    const currentAuthUserId = user.id;
    // eslint-disable-next-line no-console
    console.info(`[authService] saveElderProfile — authenticated user: ${currentAuthUserId}`);

    // 2. Obtain the correct profiles row using: profiles.auth_user_id = user.id
    let profileId: string;
    const { data: existingProfile, error: profileSelectErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', currentAuthUserId)
      .maybeSingle();

    if (profileSelectErr) {
      // eslint-disable-next-line no-console
      console.warn('[authService] profiles SELECT error:', profileSelectErr);
    }

    // 3. If it does not exist, create it.
    if (existingProfile) {
      profileId = (existingProfile as { id: string }).id;
      // eslint-disable-next-line no-console
      console.info(`[authService] Existing profiles row found: ${profileId}`);
      await supabase
        .from('profiles')
        .update({ name: name.trim() || 'Elder', updated_at: new Date().toISOString() })
        .eq('id', profileId);
    } else {
      // eslint-disable-next-line no-console
      console.info(`[authService] Inserting new profiles row for auth_user_id: ${currentAuthUserId}`);
      const { data: newProfile, error: insertErr } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: currentAuthUserId,
          name: name.trim() || 'Elder',
          role: 'ELDER',
          email: null,
        })
        .select('id')
        .single();

      if (insertErr || !newProfile) {
        // eslint-disable-next-line no-console
        console.error('[authService] profiles INSERT error:', insertErr);
        return {
          success: false,
          error: `Could not create your profile: ${insertErr?.message ?? 'unknown error'}`,
          detail: insertErr?.message,
        };
      }
      profileId = (newProfile as { id: string }).id;
      // eslint-disable-next-line no-console
      console.info(`[authService] Created new profile: ${profileId}`);
    }

    // 4. Use THAT profiles.id as elder_profiles.profile_id.
    // 5. Insert/update elder_profiles with:
    //    profile_id = profiles.id, name, age, preferred_language, region, interests, onboarded, baseline_done
    // eslint-disable-next-line no-console
    console.info(`[authService] Ensuring elder_profiles row for profile_id: ${profileId}`);

    const { data: existingElder, error: elderSelectErr } = await getElderProfileByProfileId(profileId);

    if (elderSelectErr) {
      // eslint-disable-next-line no-console
      console.warn('[authService] elder_profiles SELECT warning:', elderSelectErr);
    }

    let elderId: string;

    if (existingElder) {
      elderId = (existingElder as { id: string }).id;
      // eslint-disable-next-line no-console
      console.info(`[authService] Updating existing elder_profiles: ${elderId}`);
      const { data: updatedElder, error: epUpdateErr } = await supabase
        .from('elder_profiles')
        .update({
          name: name.trim(),
          age,
          preferred_language: language,
          region,
          interests,
          onboarded: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', elderId)
        .select('id')
        .single();

      if (epUpdateErr || !updatedElder) {
        // eslint-disable-next-line no-console
        console.error('[authService] elder_profiles UPDATE failed:', epUpdateErr);
        return {
          success: false,
          error: `Could not update elder profile: ${epUpdateErr?.message ?? 'unknown error'}`,
          detail: epUpdateErr?.message,
        };
      }
      elderId = (updatedElder as { id: string }).id;
    } else {
      // eslint-disable-next-line no-console
      console.info(`[authService] Inserting new elder_profiles for profile_id: ${profileId}`);
      const { data: newElder, error: elderInsertErr } = await supabase
        .from('elder_profiles')
        .insert({
          profile_id: profileId,
          name: name.trim(),
          age,
          preferred_language: language,
          region,
          interests,
          onboarded: true,
          baseline_done: false,
        })
        .select('id')
        .single();

      if (elderInsertErr || !newElder) {
        // eslint-disable-next-line no-console
        console.error('[authService] elder_profiles INSERT failed:', elderInsertErr);
        const errMsg = elderInsertErr?.message ?? 'unknown error';
        const errCode = elderInsertErr?.code ?? '';
        if (errCode === '42501' || errMsg.includes('policy') || errMsg.includes('permission')) {
          return {
            success: false,
            error: 'elder_profiles INSERT blocked by RLS. Run migration 20260912_fix_anonymous_registration.sql.',
            detail: errMsg,
          };
        }
        return {
          success: false,
          error: `Could not save your elder profile: ${errMsg}`,
          detail: errMsg,
        };
      }
      elderId = (newElder as { id: string }).id;
    }

    // 6. Return the actual elder_profiles.id.
    // 7. DO NOT return a local UID.
    // 8. DO NOT silently fall back to a local elder ID if Supabase fails.
    // eslint-disable-next-line no-console
    console.info(`[authService] saveElderProfile SUCCESS — profileId: ${profileId}, elderId: ${elderId}`);
    return {
      success: true,
      authUserId: currentAuthUserId,
      profileId,
      elderId,
      name: name.trim(),
      age,
      language,
      region,
      interests,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    // eslint-disable-next-line no-console
    console.error('[authService] saveElderProfile unexpected exception:', err);
    return { success: false, error: `An unexpected error occurred: ${msg}`, detail: msg };
  }
}

// ---------------------------------------------------------------------------
// Authoritative elder profile lookups
// ---------------------------------------------------------------------------

/**
 * Authoritative lookup for an elder profile by elder_profiles.id.
 */
export async function getElderProfileById(elderId: string) {
  return supabase
    .from('elder_profiles')
    .select('*')
    .eq('id', elderId)
    .maybeSingle();
}

/**
 * Authoritative lookup for an elder profile by profiles.id.
 */
export async function getElderProfileByProfileId(profileId: string) {
  return supabase
    .from('elder_profiles')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
}

// ---------------------------------------------------------------------------
// Session recovery — load elder data for returning user
// ---------------------------------------------------------------------------

/**
 * Loads elder profile data from Supabase given an elderId.
 * Used to restore state after a page refresh.
 */
export async function restoreElderSession(elderId: string): Promise<ElderProfileResult> {
  if (!isSupabaseConfigured || !elderId) return { success: false, error: 'Not configured' };

  try {
    const { data, error } = await getElderProfileById(elderId);

    if (error || !data) {
      return { success: false, error: 'Profile not found' };
    }

    const ep = data as {
      id: string;
      name: string;
      age: number;
      preferred_language: string;
      region: string;
      interests: string[];
      profile_id: string;
    };

    return {
      success: true,
      elderId: ep.id,
      name: ep.name,
      age: ep.age,
      language: (ep.preferred_language || 'en') as LanguageCode,
      region: (ep.region || 'assam') as Region,
      interests: ep.interests || [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Current session helpers
// ---------------------------------------------------------------------------

/** Returns the current Supabase auth user, or null if not signed in. */
export async function getCurrentUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

/** Sign out from Supabase Auth. */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[authService] signOut error:', err);
  }
}

// ---------------------------------------------------------------------------
// Session recovery — recover elder_profiles.id from live Supabase session
// ---------------------------------------------------------------------------

/**
 * Attempts to recover the elder_profiles.id (UUID) from the currently active
 * Supabase Auth session WITHOUT requiring email or password.
 *
 * Called by FaceLogin when state.patient?.id is missing or is not a valid
 * Supabase UUID (e.g. still contains the demo 'patient-asha' ID).
 *
 * Chain: auth.users.id → profiles.auth_user_id → profiles.id
 *        → elder_profiles.profile_id → elder_profiles.id
 *
 * Returns null if:
 *   - No Supabase session is active
 *   - The user has no profiles row (not registered yet)
 *   - The user has no elder_profiles row (registration incomplete)
 */
export async function recoverElderIdFromSession(): Promise<ElderProfileResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }

  // 1. Get current Supabase Auth user (works for anonymous sessions too)
  let authUserId: string;
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return { success: false, error: 'No active Supabase session' };
    }
    authUserId = data.user.id;
  } catch {
    return { success: false, error: 'Could not read Supabase session' };
  }

  // 2. Find profiles row by auth_user_id
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('role', 'ELDER')
    .maybeSingle();

  if (profileErr || !profile) {
    return { success: false, error: 'No elder profile found for current session' };
  }

  const profileId = (profile as { id: string }).id;

  // 3. Find elder_profiles row by profile_id
  const { data: elder, error: elderErr } = await getElderProfileByProfileId(profileId);

  if (elderErr || !elder) {
    return { success: false, error: 'No elder_profiles row found' };
  }

  const ep = elder as {
    id: string;
    name: string;
    age: number;
    preferred_language: string;
    region: string;
    interests: string[];
  };

  // eslint-disable-next-line no-console
  console.info(`[authService] Recovered elder session — elderId: ${ep.id}`);

  return {
    success: true,
    authUserId,
    profileId,
    elderId: ep.id,
    name: ep.name,
    age: ep.age,
    language: (ep.preferred_language || 'en') as LanguageCode,
    region: (ep.region || 'assam') as Region,
    interests: ep.interests || [],
  };
}


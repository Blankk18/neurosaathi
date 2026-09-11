// ============================================================================
// ONBOARDING — Face-First Elder Registration
//
// Flow when arriving via /onboarding?register=1 (from Login "Register" button):
//   1. Mount: supabase.auth.signInAnonymously() → authUserId
//             Insert profiles row immediately (no email, no password)
//   2. Steps 1-5: name, age, language, caregiver, voice preference
//   3. Step 5 complete: saveElderProfile() → elderId (Supabase UUID)
//                       dispatch COMPLETE_ONBOARDING(patient.id = elderId)
//                       showFaceEnrollment = true (mandatory)
//   4. FaceEnrollment modal: real camera, 10 samples → Supabase face_enrollments
//   5. On enrolled: navigate to /home — registration complete ✅
//
// No email. No password. Anywhere.
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Button } from '@/components/ui';
import { languageNames } from '@/i18n';
import { speak } from '@/services/voice';
import type { LanguageCode, Region, ReminderType } from '@/types';
import { uid } from '@/data/demoData';
import { ShieldIcon, CheckIcon, SpeakerIcon, HeartIcon } from '@/components/Icons';
import { signInAnonymouslyAndCreateProfile, saveElderProfile, getElderProfileById } from '@/services/authService';
import { supabase } from '@/services/supabase';
import { FaceEnrollment } from '@/face/FaceEnrollment';

const REMINDER_OPTIONS: { key: ReminderType; emoji: string }[] = [
  { key: 'medicine', emoji: '💊' },
  { key: 'water', emoji: '💧' },
  { key: 'meal', emoji: '🍚' },
  { key: 'walk', emoji: '🚶' },
  { key: 'appointment', emoji: '📅' },
  { key: 'sleep', emoji: '😴' },
];

const INTERESTS = ['🫖 Tea', '🌸 Flowers', '🎶 Music', '📿 Worship', '👨‍👩‍👧 Family', '🧶 Crafts', '🌾 Cooking', '🎣 Fishing'];

export default function Onboarding() {
  const { t, dispatch, state } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRegistering = searchParams.get('register') === '1';

  // Steps 1-5 (no step 0 — anonymous signIn happens on mount)
  const [step, setStep] = useState(1);
  const [name, setName] = useState(state.patient?.name ?? '');
  const [age, setAge] = useState(state.patient?.age ? String(state.patient.age) : '');
  const [language, setLanguage] = useState<LanguageCode>(state.patient?.language ?? 'en');
  const [caregiver, setCaregiver] = useState(state.patient?.caregiverName ?? '');
  const [relationship, setRelationship] = useState(state.patient?.caregiverRelationship ?? '');
  const [reminders, setReminders] = useState<ReminderType[]>(['medicine', 'water', 'walk']);
  const [interests, setInterests] = useState<string[]>(state.patient?.interests ?? []);
  const [speakSel, setSpeakSel] = useState<'yes' | 'no' | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Anonymous auth state (only relevant when isRegistering)
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(isRegistering);
  const [authError, setAuthError] = useState('');

  // Face enrollment gate
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false);
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [verifiedElderId, setVerifiedElderId] = useState<string | null>(null);

  // ── On mount: anonymous sign-in (registration path only) ──────────────────
  // Checks for an existing active Supabase session first to avoid creating
  // duplicate anonymous identities on remount or page navigation.
  useEffect(() => {
    if (!isRegistering) return;

    let cancelled = false;
    const doSignIn = async () => {
      setAuthLoading(true);
      setAuthError('');

      // Check for an already-authenticated session (anonymous or otherwise)
      // before creating a new one. This handles the case where the user
      // navigated away and came back, or HMR caused a remount.
      try {
        const { data: sessionData } = await supabase.auth.getUser();
        if (sessionData?.user && !cancelled) {
          // Re-use the existing anonymous session
          // eslint-disable-next-line no-console
          console.info('[Onboarding] Reusing existing Supabase session:', sessionData.user.id);
          setAuthUserId(sessionData.user.id);
          setAuthLoading(false);
          return;
        }
      } catch {
        // Session check failed — fall through to signInAnonymously
      }

      const result = await signInAnonymouslyAndCreateProfile(name.trim() || 'Elder');

      if (cancelled) return;

      if (!result.success) {
        setAuthError(result.error ?? 'Could not set up your account. Please try again.');
        setAuthLoading(false);
        return;
      }

      setAuthUserId(result.authUserId ?? null);
      setAuthLoading(false);
    };

    void doSignIn();
    return () => { cancelled = true; };
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── helpers ───────────────────────────────────────────────────────────────

  const speakStep = (msg: string) => {
    if (state.settings.voiceOn) speak(msg, language);
  };

  useEffect(() => {
    const msgs: Record<number, string> = {
      1: t('onboard.name'),
      2: t('onboard.language'),
      3: t('onboard.caregiver'),
      4: t('onboard.reminders.pref'),
      5: t('onboard.speak'),
    };
    if (msgs[step]) speakStep(msgs[step]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const toggle = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // ── Step advancement ──────────────────────────────────────────────────────

  const next = async () => {
    setError('');
    if (step === 1) {
      if (!name.trim() || !age.trim() || Number(age) < 50) {
        setError(t('err.missing'));
        return;
      }
    }
    if (step === 3) {
      if (!caregiver.trim()) {
        setError(t('err.missing'));
        return;
      }
    }
    if (step === 5) {
      if (!speakSel) {
        setError(t('err.missing'));
        return;
      }

      dispatch({ type: 'UPDATE_SETTINGS', settings: { speakInstructions: speakSel === 'yes', voiceOn: true } });

      // HARD REQUIREMENT: authUserId MUST exist (set during mount sign-in).
      // If it doesn't, registration cannot proceed — do NOT fall back to a local ID.
      if (!authUserId) {
        setError(
          'Account setup is not complete. Anonymous authentication did not succeed. Please go back and try again.'
        );
        setSaving(false);
        return;
      }

      // Persist to Supabase and get the authoritative elderId (elder_profiles.id)
      setSaving(true);

      const result = await saveElderProfile({
        authUserId,
        name: name.trim(),
        age: Number(age),
        language,
        region: 'assam' as Region,
        interests,
      });

      if (!result.success || !result.elderId) {
        setSaving(false);
        // HARD STOP — do not open FaceEnrollment with a fake local ID
        setError(
          result.error ??
            'Could not save your profile to the server. Please check your connection and try again.'
        );
        return;
      }

      const elderId = result.elderId;
      // eslint-disable-next-line no-console
      console.info('[Onboarding] Elder profile saved to Supabase — elderId:', elderId);

      // ── VERIFY ELDER PROFILE BEFORE FACE ENROLLMENT ───────────────────────
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        // eslint-disable-next-line no-console
        console.error('[Onboarding] Verification failed — no active Supabase session:', userErr);
        setSaving(false);
        setError('Elder profile was not created correctly.');
        return;
      }

      const { data: currentProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', userData.user.id)
        .maybeSingle();

      if (profileErr || !currentProfile) {
        // eslint-disable-next-line no-console
        console.error('[Onboarding] Verification failed — profiles row not found:', profileErr);
        setSaving(false);
        setError('Elder profile was not created correctly.');
        return;
      }

      const { data: verifiedElder, error: verifyErr } = await getElderProfileById(elderId);

      if (verifyErr || !verifiedElder) {
        // eslint-disable-next-line no-console
        console.error('[Onboarding] Verification failed — elder_profiles row not found for elderId:', verifyErr);
        setSaving(false);
        setError('Elder profile was not created correctly.');
        return;
      }

      if (verifiedElder.profile_id !== currentProfile.id) {
        // eslint-disable-next-line no-console
        console.error(
          `[Onboarding] Verification failed — profile_id mismatch: elder_profiles.profile_id (${verifiedElder.profile_id}) !== profiles.id (${currentProfile.id})`
        );
        setSaving(false);
        setError('Elder profile was not created correctly.');
        return;
      }

      // eslint-disable-next-line no-console
      console.info('[Onboarding] Elder profile verified successfully — proceeding to Face Enrollment');
      setVerifiedElderId(elderId);
      setSaving(false);

      // Commit to app state with the REAL Supabase elder_profiles UUID
      dispatch({
        type: 'COMPLETE_ONBOARDING',
        patient: {
          id: elderId,          // ← authoritative Supabase UUID, never a local uid()
          name: name.trim(),
          age: Number(age),
          language,
          region: 'assam',
          caregiverName: caregiver.trim(),
          caregiverRelationship: relationship.trim() || t('common.familyMember'),
          interests,
          onboarded: true,
          baselineDone: false,
        },
        caregiver: {
          id: uid('caregiver'),
          name: caregiver.trim(),
          relationship: relationship.trim() || t('common.familyMember'),
        },
      });

      // Open mandatory face enrollment ONLY after the real elderId is verified
      setShowFaceEnrollment(true);
      return;
    }

    setStep((s) => s + 1);
  };

  // ── Layout helpers ────────────────────────────────────────────────────────

  const stepTitle = (n: number) => {
    if (n === 1) return `👋 ${t('onboard.name')}`;
    if (n === 2) return `🌐 ${t('onboard.language')}`;
    if (n === 3) return `🛟 ${t('onboard.caregiver')}`;
    if (n === 4) return `🔔 ${t('onboard.reminders.pref')}`;
    return `🔊 ${t('onboard.speak')}`;
  };

  const stepHint: Record<number, string> = {
    1: "We'll use this to make NeuroSaathi feel like yours \u2014 warm, familiar and personal.",
    2: 'Choose the language you are most comfortable in. You can change it anytime.',
    3: "Someone you trust \u2014 we'll keep them gently in the loop, with your permission.",
    4: 'Pick what helps your day feel steady. Reminders are gentle and easy to snooze.',
    5: 'Almost done \u2014 would you like a calm voice to read instructions aloud?',
  };

  const pct = (step / 5) * 100;

  // ── Anonymous auth loading / error state ──────────────────────────────────

  if (isRegistering && authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas px-4">
        <img src="/neurosaathi-header.png" alt="NeuroSaathi" className="h-12 w-auto" />
        <div className="flex flex-col items-center gap-4 rounded-[28px] bg-white px-8 py-10 shadow-card border border-brand-100 text-center max-w-sm w-full">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-lg font-extrabold text-brand-900">Setting up your account…</p>
          <p className="text-sm font-semibold text-neutral-500">No email or password needed — your face will be your key.</p>
        </div>
      </div>
    );
  }

  if (isRegistering && authError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas px-4">
        <img src="/neurosaathi-header.png" alt="NeuroSaathi" className="h-12 w-auto" />
        <div className="flex flex-col items-center gap-4 rounded-[28px] bg-white px-8 py-10 shadow-card border border-danger-200 text-center max-w-sm w-full">
          <div className="text-4xl">⚠️</div>
          <p className="text-lg font-extrabold text-brand-900">Account setup failed</p>
          <p className="text-sm font-semibold leading-relaxed text-neutral-500">{authError}</p>
          <button
            onClick={() => { setAuthError(''); setAuthLoading(true); void signInAnonymouslyAndCreateProfile(name || 'Elder').then((r) => { setAuthLoading(false); if (r.success) setAuthUserId(r.authUserId ?? null); else setAuthError(r.error ?? 'Failed'); }); }}
            className="rounded-2xl bg-brand-700 px-6 py-3 text-sm font-extrabold text-white hover:bg-brand-800 transition"
          >
            Try Again
          </button>
          <button onClick={() => navigate('/login')} className="text-sm font-semibold text-neutral-400 hover:text-brand-700">
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Face enrollment gate (shown after step 5) ─────────────────────────────

  if (showFaceEnrollment && !faceEnrolled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas px-4 py-8">
        {/* ambient */}
        <div className="pointer-events-none fixed inset-0" aria-hidden>
          <div className="absolute -top-28 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-brand-50 opacity-70 blur-2xl" />
          <div className="absolute -bottom-24 -right-24 h-[420px] w-[520px] rounded-full bg-warm-50 opacity-60 blur-2xl" />
        </div>
        <div className="relative w-full max-w-[500px] fade-up">
          <img src="/neurosaathi-header.png" alt="NeuroSaathi" className="mx-auto mb-5 h-11 w-auto" />

          <div className="relative overflow-hidden rounded-[32px] bg-white shadow-[0_24px_64px_-20px_rgba(64,107,94,0.28)] border border-brand-100/60 px-6 pb-8 pt-7 sm:px-9 sm:pt-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-200/60 to-transparent" aria-hidden />

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 border border-brand-100 text-[2.5rem] shadow-soft">
                📷
              </div>
              <h1 className="font-display text-[26px] font-extrabold tracking-tight text-brand-900">
                One last step — your face key 🛡️
              </h1>
              <p className="mx-auto mt-3 max-w-[380px] text-[15px] font-semibold leading-relaxed text-neutral-500">
                NeuroSaathi uses your face to recognise you — no passwords, ever.
                This takes about 30 seconds. Look naturally at the camera.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3">
                <span className="text-xl shrink-0">🔒</span>
                <p className="text-sm font-semibold text-brand-800">
                  Only the <strong>derived face descriptors</strong> (128 numbers per sample) are stored — never raw photos or video.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3">
                <span className="text-xl shrink-0">☁️</span>
                <p className="text-sm font-semibold text-brand-800">
                  Your face profile is saved securely to your personal Supabase account.
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-xs font-extrabold uppercase tracking-widest text-danger-600">
              ⚠️ Face enrollment is required to complete registration
            </p>
          </div>
        </div>

        {/* FaceEnrollment modal — open=true, cannot be dismissed (onClose shows warning) */}
        <FaceEnrollment
          open={true}
          elderId={verifiedElderId ?? undefined}
          onClose={() => {
            // Cannot skip — show a gentle reminder but keep modal available
            setError('Face recognition is required to complete your registration. Please look at the camera.');
          }}
          onEnrolled={() => {
            setFaceEnrolled(true);
            setShowFaceEnrollment(false);
            // Navigate to home — registration fully complete
            navigate('/home');
          }}
        />

        {error && (
          <div className="relative w-full max-w-[500px]">
            <div className="rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-center text-sm font-bold text-accent-700">
              ⚠️ {error}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main onboarding form (steps 1-5) ──────────────────────────────────────

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-8 md:py-10">
      {/* soft ambient washes — calm healthcare atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-28 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-brand-50 opacity-70 blur-2xl" />
        <div className="absolute -bottom-24 -right-24 h-[420px] w-[520px] rounded-full bg-warm-50 opacity-60 blur-2xl" />
        <div className="absolute -bottom-10 -left-20 h-[380px] w-[460px] rounded-full bg-white opacity-70 blur-2xl" />
      </div>

      <div className="relative w-full max-w-[640px] fade-up">
        {/* top brand bar */}
        <div className="mb-5 flex items-center justify-between">
          <img src="/neurosaathi-header.png" alt="NeuroSaathi" className="h-[42px] w-auto object-contain drop-shadow-sm sm:h-12" />
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 shadow-card border border-brand-100">
            <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500 animate-pulse" aria-hidden />
            <span className="text-[13px] font-extrabold tracking-wide text-brand-700">Step {step} of 5</span>
          </div>
        </div>

        {/* Anonymous auth indicator */}
        {isRegistering && authUserId && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <span className="text-base shrink-0">✅</span>
            <p className="text-xs font-extrabold text-emerald-800">Account created — no password needed. Your face will be your key.</p>
          </div>
        )}

        <div className="relative overflow-hidden rounded-[32px] bg-white shadow-[0_24px_64px_-20px_rgba(64,107,94,0.28),0_8px_24px_-8px_rgba(64,107,94,0.12)] border border-brand-100/60">
          {/* subtle top highlight line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-200/60 to-transparent" aria-hidden />

          <div className="px-6 pb-7 pt-7 sm:px-9 sm:pt-8">
            {/* progress */}
            <div className="mx-auto max-w-[360px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold tracking-widest text-brand-600/70 uppercase">Getting started</span>
                <span className="text-xs font-bold text-brand-600">{Math.round(pct)}% complete</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-brand-100 p-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500 transition-all duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-1.5" aria-hidden>
                {[1, 2, 3, 4, 5].map((s) => {
                  const isDone = s < step;
                  const isActive = s === step;
                  return (
                    <div key={s} className="flex flex-1 items-center gap-1.5">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold transition-all duration-300 ${
                          isDone
                            ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                            : isActive
                              ? 'border-brand-500 bg-white text-brand-700 shadow-card ring-4 ring-brand-100'
                              : 'border-brand-100 bg-white text-brand-300'
                        }`}
                      >
                        {isDone ? <CheckIcon size={16} /> : s}
                      </span>
                      {s < 5 && (
                        <span
                          className={`h-0.5 flex-1 rounded-full transition-colors duration-500 ${s < step ? 'bg-brand-300' : 'bg-brand-100'}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* title */}
            <div className="mt-8 text-center">
              <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-tight text-brand-900 sm:text-[30px]">{stepTitle(step)}</h1>
              <p className="mx-auto mt-2 max-w-[420px] text-[15px] font-semibold leading-relaxed text-neutral-500">{stepHint[step]}</p>
              <button
                onClick={() => speakStep(t(`${['onboard.name', 'onboard.language', 'onboard.caregiver', 'onboard.reminders.pref', 'onboard.speak'][step - 1]}`))}
                className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/80 px-4 py-2 text-[13px] font-extrabold tracking-wide text-brand-700 shadow-sm transition hover:bg-white hover:shadow-card"
              >
                <SpeakerIcon size={16} /> {t('voice.listen')}
              </button>
            </div>

            {/* content */}
            <div className="mt-7 min-h-[272px]">
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="label text-[15px] tracking-wide">{t('onboard.name')}</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-60" aria-hidden>
                        👤
                      </span>
                      <input
                        className="input !rounded-[20px] !border-brand-200 !bg-white !py-4 !pl-11 !pr-4 !text-[18px] font-bold placeholder:text-neutral-400 shadow-[0_1px_2px_rgba(64,107,94,0.06)] focus:!border-brand-400 focus:!ring-4 focus:!ring-brand-100"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Asha Sharma"
                        autoFocus
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-neutral-400">As you'd like us to call you — first name is perfect.</p>
                  </div>
                  <div>
                    <label className="label text-[15px] tracking-wide">{t('onboard.age')}</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-60" aria-hidden>
                        🎂
                      </span>
                      <input
                        className="input !rounded-[20px] !border-brand-200 !bg-white !py-4 !pl-11 !pr-4 !text-[18px] font-bold placeholder:text-neutral-400 focus:!border-brand-400 focus:!ring-4 focus:!ring-brand-100"
                        type="number"
                        min="50"
                        max="110"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="68"
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
                      <ShieldIcon size={16} />
                    </span>
                    <p className="text-[13px] font-semibold leading-relaxed text-brand-800">This stays on your device in the prototype — calm, private and only used to personalise your day.</p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {Object.entries(languageNames).map(([code, label]) => {
                      const active = language === code;
                      return (
                        <button
                          key={code}
                          onClick={() => {
                            setLanguage(code as LanguageCode);
                            speak(`Hello! I will use ${label} from now.`, code);
                          }}
                          className={`group flex items-center justify-between rounded-[20px] border-2 px-5 py-4 text-left transition-all duration-200 ${
                            active
                              ? 'border-brand-500 bg-brand-600 text-white shadow-lift'
                              : 'border-brand-100 bg-white text-brand-900 hover:border-brand-200 hover:bg-brand-50/70 hover:shadow-card'
                          }`}
                        >
                          <span className={`text-[17px] font-extrabold tracking-tight ${active ? 'text-white' : 'text-brand-900'}`}>{label}</span>
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm transition ${
                              active ? 'border-white/30 bg-white text-brand-700' : 'border-brand-100 bg-brand-50 text-brand-500 group-hover:bg-white'
                            }`}
                            aria-hidden
                          >
                            {active ? <CheckIcon size={16} /> : '›'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-center text-xs font-semibold text-neutral-400">Tap a language to hear how it sounds — you can change this anytime in settings.</p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="label text-[15px] tracking-wide">{t('onboard.caregiver')}</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-60" aria-hidden>
                        🛟
                      </span>
                      <input
                        className="input !rounded-[20px] !border-brand-200 !bg-white !py-4 !pl-11 !pr-4 !text-[18px] font-bold placeholder:text-neutral-400 focus:!border-brand-400 focus:!ring-4 focus:!ring-brand-100"
                        value={caregiver}
                        onChange={(e) => setCaregiver(e.target.value)}
                        placeholder="e.g. Rohan Sharma"
                        autoFocus
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-neutral-400">A gentle check-in contact — not shared outside this device.</p>
                  </div>
                  <div>
                    <label className="label text-[15px] tracking-wide">{t('onboard.relationship')}</label>
                    <input
                      className="input !rounded-[20px] !border-brand-200 !bg-white !py-4 !text-[17px] font-bold placeholder:text-neutral-400 focus:!border-brand-400 focus:!ring-4 focus:!ring-brand-100"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      placeholder={t('cg.relationship')}
                    />
                  </div>
                  <div className="rounded-2xl bg-warm-50 px-4 py-3.5 border border-warm-200">
                    <p className="text-[13px] font-bold leading-relaxed text-warm-600">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-warm-500 shadow-sm mr-2 align-middle">💛</span>
                      If left blank we'll use "{t('common.familyMember')}" — always respectful, never clinical.
                    </p>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <p className="mb-3 text-sm font-extrabold tracking-wide text-brand-700">Daily support — tap to choose</p>
                    <div className="flex flex-wrap gap-2.5">
                      {REMINDER_OPTIONS.map(({ key, emoji }) => {
                        const active = reminders.includes(key);
                        return (
                          <button
                            key={key}
                            onClick={() => setReminders((r) => toggle(r, key))}
                            aria-pressed={active}
                            className={`inline-flex items-center gap-2 rounded-full border-2 px-5 py-3 text-[15px] font-extrabold transition-all duration-200 ${
                              active
                                ? 'border-brand-500 bg-brand-600 text-white shadow-lift'
                                : 'border-brand-100 bg-white text-brand-700 hover:border-brand-200 hover:bg-brand-50 hover:shadow-sm'
                            }`}
                          >
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${active ? 'bg-white/15' : 'bg-brand-50'}`} aria-hidden>
                              {emoji}
                            </span>
                            {t(`reminders.${key}`)}
                            {active && <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-brand-600"><CheckIcon size={12} /></span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2.5 text-xs font-semibold text-neutral-400">You can adjust these later — reminders are quiet, snoozable and never pushy.</p>
                  </div>

                  <div className="divider" aria-hidden />

                  <div>
                    <label className="label text-[15px] tracking-wide">{t('onboard.interests')}</label>
                    <p className="mb-3 text-xs font-semibold text-neutral-400">Pick a few things that make your day feel familiar.</p>
                    <div className="flex flex-wrap gap-2">
                      {INTERESTS.map((i) => {
                        const active = interests.includes(i);
                        return (
                          <button
                            key={i}
                            onClick={() => setInterests((arr) => toggle(arr, i))}
                            aria-pressed={active}
                            className={`rounded-full border-2 px-4 py-2.5 text-[15px] font-bold transition-all ${
                              active ? 'border-warm-300 bg-warm-500 text-white shadow-sm' : 'border-brand-100 bg-white text-neutral-600 hover:border-warm-200 hover:bg-warm-50 hover:text-warm-600'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-3">
                  <button
                    onClick={() => setSpeakSel('yes')}
                    aria-pressed={speakSel === 'yes'}
                    className={`group relative flex w-full items-center gap-4 rounded-[24px] border-2 px-5 py-5 text-left transition-all duration-200 sm:px-6 sm:py-6 ${
                      speakSel === 'yes' ? 'border-brand-500 bg-brand-600 text-white shadow-lift' : 'border-brand-100 bg-white text-brand-900 hover:border-brand-200 hover:bg-brand-50/60 hover:shadow-card'
                    }`}
                  >
                    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl transition ${speakSel === 'yes' ? 'bg-white text-brand-600' : 'bg-brand-50 text-brand-700 group-hover:bg-white'}`} aria-hidden>
                      🔊
                    </span>
                    <span className="flex-1">
                      <span className={`block text-[18px] font-extrabold leading-tight ${speakSel === 'yes' ? 'text-white' : 'text-brand-900'}`}>{t('onboard.speak.yes')}</span>
                      <span className={`mt-0.5 block text-[13px] font-semibold leading-snug ${speakSel === 'yes' ? 'text-brand-100' : 'text-neutral-500'}`}>A warm voice reads steps aloud — calm and clear.</span>
                    </span>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${speakSel === 'yes' ? 'border-white bg-white text-brand-600' : 'border-brand-200 bg-white text-brand-300'}`} aria-hidden>
                      {speakSel === 'yes' ? <CheckIcon size={16} /> : null}
                    </span>
                  </button>

                  <button
                    onClick={() => setSpeakSel('no')}
                    aria-pressed={speakSel === 'no'}
                    className={`group flex w-full items-center gap-4 rounded-[24px] border-2 px-5 py-5 text-left transition-all duration-200 sm:px-6 sm:py-6 ${
                      speakSel === 'no' ? 'border-brand-500 bg-brand-900 text-white shadow-lift' : 'border-brand-100 bg-white text-brand-900 hover:border-brand-200 hover:bg-brand-50/60 hover:shadow-card'
                    }`}
                  >
                    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl transition ${speakSel === 'no' ? 'bg-white text-brand-900' : 'bg-neutral-100 text-neutral-600 group-hover:bg-white'}`} aria-hidden>
                      🤫
                    </span>
                    <span className="flex-1">
                      <span className={`block text-[18px] font-extrabold leading-tight ${speakSel === 'no' ? 'text-white' : 'text-brand-900'}`}>{t('onboard.speak.no')}</span>
                      <span className={`mt-0.5 block text-[13px] font-semibold leading-snug ${speakSel === 'no' ? 'text-white/70' : 'text-neutral-500'}`}>Quiet mode — text only, no voice.</span>
                    </span>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${speakSel === 'no' ? 'border-white bg-white text-brand-900' : 'border-brand-200 bg-white text-brand-300'}`} aria-hidden>
                      {speakSel === 'no' ? <CheckIcon size={16} /> : null}
                    </span>
                  </button>

                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-accent-500 shadow-sm">
                      <HeartIcon size={16} />
                    </span>
                    <p className="text-xs font-semibold leading-relaxed text-brand-700">
                      Almost there — after this, you'll set up face recognition (takes ~30 seconds).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-center text-sm font-bold text-accent-600" role="alert">
                <span aria-hidden>⚠️</span> {error}
              </div>
            )}

            <div className="mt-7 flex items-center justify-between gap-3 border-t border-brand-100 pt-6">
              {step > 1 ? (
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)} className="!rounded-full !px-6 !py-3.5 !text-base !font-extrabold">
                  ← {t('common.back')}
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => navigate('/login')} className="!rounded-full !px-6 !py-3.5 !text-base !font-extrabold">
                  ← {t('common.back')}
                </Button>
              )}
              <Button
                onClick={next}
                variant="primary"
                disabled={saving}
                className={`!rounded-full !px-8 !py-4 !text-[17px] !font-extrabold shadow-lift transition hover:shadow-float ${step === 5 ? '!bg-accent-500 hover:!bg-accent-600 !text-white !shadow-[0_12px_28px_-8px_rgba(240,134,65,0.45)]' : '!bg-brand-700 hover:!bg-brand-800'} disabled:opacity-60`}
              >
                {saving && step === 5 ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving…
                  </span>
                ) : step === 5 ? `📷 Set Up Face Recognition →` : `${t('common.next')} →`}
              </Button>
            </div>
          </div>
        </div>

        {/* reassurance footer */}
        <p className="mx-auto mt-5 flex max-w-[520px] items-center justify-center gap-2 text-center text-xs font-semibold leading-relaxed text-brand-700/60">
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            <ShieldIcon size={12} />
          </span>
          No password. No email. Your face is your key — private by design.
        </p>
      </div>
    </div>
  );
}

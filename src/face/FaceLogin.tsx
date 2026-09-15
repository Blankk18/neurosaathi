// ============================================================================
// FACE LOGIN — Live Biometric Scan Authentication via Camera
//
// TWO MODES:
//
// MODE A — KNOWN ELDER (same device, existing session):
//   1. state.patient?.id is a real Supabase elder UUID
//   2. Load elder's face profile from face_enrollments
//   3. Use local profile matching (existing behavior)
//
// MODE B — CROSS-DEVICE FACE IDENTIFICATION (unknown device, no session):
//   1. No known elder UUID
//   2. Camera opens anyway (globalMatch mode)
//   3. Generate face descriptor
//   4. Call matchFaceDescriptorGlobally(descriptor)
//   5. RPC searches all active face_enrollments
//   6. If matched: dispatch RESTORE_ELDER_SESSION, login
//   7. If no match: show "Face not recognized", offer PIN fallback
//
// SECURITY:
//   - Face descriptors never downloaded to browser
//   - Global matching RPC runs server-side with service role
//   - No device-specific state for identity
//   - Never falls back to demo IDs or localStorage
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '@/state/AppContext';
import { Modal } from '@/components/ui';
import { LiveFaceScanner } from './LiveFaceScanner';
import { useFaceRecognition } from './useFaceRecognition';
import { loadFaceProfile, saveFaceProfile } from './faceRecognition.service';
import { loadFaceEnrollment } from '@/services/faceDatabaseService';
import { matchFaceDescriptorGlobally } from '@/services/faceMatchingService';
import { recoverElderIdFromSession } from '@/services/authService';
import { FaceEnrollment } from './FaceEnrollment';
import { DEMO_PATIENT_ID } from '@/data/demoData';
import type { FaceProfile } from './types';
import type { Patient } from '@/types';

/** Returns true only when id is a real Supabase UUID (not a demo/local ID). */
function isRealSupabaseUuid(id: string | undefined): boolean {
  if (!id) return false;
  if (id === DEMO_PATIENT_ID) return false;
  if (id.startsWith('patient-') || id.startsWith('caregiver-')) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function FaceLogin({
  open,
  onClose,
  onSuccess,
  onUsePin,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (photo?: string) => void;
  onUsePin: () => void;
}) {
  const { state, dispatch, t, speakText } = useApp();
  const [profile, setProfile] = useState<FaceProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [verified, setVerified] = useState(false);
  const [globalMatchFailed, setGlobalMatchFailed] = useState(false);
  const [globalMatchError, setGlobalMatchError] = useState('');
  const [matchedElderName, setMatchedElderName] = useState('');
  const [globalMatchMode, setGlobalMatchMode] = useState(false);

  /** Guard: prevents handleMatch firing more than once per open session. */
  const hasLoggedRef = useRef(false);
  /** Lock: prevents parallel / high-frequency calls to the global face matcher RPC. */
  const globalMatchingInProgressRef = useRef(false);
  /** The resolved authoritative elder ID for this session. */
  const elderIdRef = useRef<string | null>(null);
  /** Whether we're in global matching mode (unknown device). */
  const globalMatchModeRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Step 1: Resolve authoritative elder ID for MODE A (known device)
  // ---------------------------------------------------------------------------
  const resolveElderId = useCallback(async (): Promise<string | null> => {
    // Fast path: state already has a real Supabase UUID
    if (isRealSupabaseUuid(state.patient?.id)) {
      return state.patient!.id;
    }

    // eslint-disable-next-line no-console
    console.info('[FaceLogin] No real elder UUID in state — attempting session recovery…');

    // FALLBACK: Recover from active Supabase anonymous session (same-device)
    const recovered = await recoverElderIdFromSession();

    if (!recovered.success || !recovered.elderId) {
      // eslint-disable-next-line no-console
      console.info('[FaceLogin] No active Supabase elder session found.');
      return null;
    }

    // Patch app state with the recovered elder identity
    const restoredPatient: Patient = {
      id: recovered.elderId,
      name: recovered.name ?? state.patient?.name ?? 'Elder',
      age: recovered.age ?? state.patient?.age ?? 0,
      language: recovered.language ?? state.patient?.language ?? 'en',
      region: recovered.region ?? state.patient?.region ?? 'assam',
      caregiverName: state.patient?.caregiverName ?? '',
      caregiverRelationship: state.patient?.caregiverRelationship ?? '',
      interests: recovered.interests ?? state.patient?.interests ?? [],
      onboarded: true,
      baselineDone: state.patient?.baselineDone ?? false,
    };
    dispatch({ type: 'RESTORE_ELDER_SESSION', patient: restoredPatient });

    // eslint-disable-next-line no-console
    console.info('[FaceLogin] Elder session recovered — elderId:', recovered.elderId);
    return recovered.elderId;
  }, [state.patient, dispatch]);

  // ---------------------------------------------------------------------------
  // Step 2: Fetch enrolled face profile for resolved elder ID (MODE A)
  // ---------------------------------------------------------------------------
  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    setGlobalMatchFailed(false);
    setGlobalMatchError('');
    setMatchedElderName('');

    try {
      const elderId = await resolveElderId();

      if (!elderId) {
        // No recovered elder found — enter MODE B (global matching)
        // eslint-disable-next-line no-console
        console.info('[FaceLogin] Global face identification mode');
        elderIdRef.current = null;
        globalMatchModeRef.current = true;
        setGlobalMatchMode(true);
        setProfile(null);
        setLoadingProfile(false);
        return;
      }

      // MODE A: Known elder — load their face profile
      elderIdRef.current = elderId;
      globalMatchModeRef.current = false;
      setGlobalMatchMode(false);

      // Fast path: IndexedDB cache (keyed by elderId, NOT global)
      let prof = await loadFaceProfile(elderId);

      if (!prof || !prof.enrolled || prof.samples.length === 0) {
        // Authoritative path: Supabase face_enrollments
        const supabaseProf = await loadFaceEnrollment(elderId);
        if (supabaseProf?.enrolled && supabaseProf.samples.length > 0) {
          prof = supabaseProf;
          // Cache to IndexedDB (scoped by elderId) for faster next load
          await saveFaceProfile(prof, elderId).catch(() => null);
        }
      }

      if (!prof || !prof.enrolled || prof.samples.length === 0) {
        // If the recovered session elder has no face enrolled, switch to global mode
        // so ANY registered elder can still log in with their face!
        // eslint-disable-next-line no-console
        console.info('[FaceLogin] No local enrollment found for session elder — switching to global identification');
        globalMatchModeRef.current = true;
        setGlobalMatchMode(true);
        setProfile(null);
      } else {
        setProfile(prof);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[FaceLogin] Error loading face profile — falling back to global match:', err);
      globalMatchModeRef.current = true;
      setGlobalMatchMode(true);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [resolveElderId]);

  // Capture a snapshot frame for local caregiver notification display
  const captureFrame = (): string => {
    const video = face.videoRef.current;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      try {
        const canvas = document.createElement('canvas');
        const targetW = 320;
        const targetH = Math.round((targetW / video.videoWidth) * video.videoHeight);
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetW, targetH);
          return canvas.toDataURL('image/jpeg', 0.8);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[FaceLogin] Frame capture error:', e);
      }
    }
    return '';
  };

  // ---------------------------------------------------------------------------
  // Handle face match callback (both MODE A and MODE B)
  // ---------------------------------------------------------------------------
  const handleMatch = useCallback(
    async (descriptor?: number[]) => {
      if (hasLoggedRef.current) return;
      if (globalMatchingInProgressRef.current) return;
      globalMatchingInProgressRef.current = true;

      const photo = captureFrame();

      // MODE B: Global face matching (unknown device or cross-device)
      if ((globalMatchModeRef.current || !profile?.enrolled) && descriptor && descriptor.length === 128) {
        // eslint-disable-next-line no-console
        console.info('[FaceLogin] Calling global matcher');

        const faceMatch = await matchFaceDescriptorGlobally(descriptor);

        if (faceMatch.matched && faceMatch.elderId) {
          // eslint-disable-next-line no-console
          console.info(`[FaceLogin] Global match successful: elderId=${faceMatch.elderId}`);
          hasLoggedRef.current = true;
          const finalName = faceMatch.name || 'Elder';
          setMatchedElderName(finalName);
          // CRITICAL: set verified ONLY after confirmed server match
          setVerified(true);

          // Patch app state with matched elder identity
          const matchedPatient: Patient = {
            id: faceMatch.elderId,
            name: finalName,
            age: faceMatch.age ?? state.patient?.age ?? 0,
            language: (faceMatch.language as any) ?? state.patient?.language ?? 'en',
            region: (faceMatch.region as any) ?? state.patient?.region ?? 'assam',
            caregiverName: state.patient?.caregiverName ?? '',
            caregiverRelationship: state.patient?.caregiverRelationship ?? '',
            interests: state.patient?.interests ?? [],
            onboarded: true,
            baselineDone: state.patient?.baselineDone ?? false,
          };
          dispatch({ type: 'RESTORE_ELDER_SESSION', patient: matchedPatient });
          elderIdRef.current = faceMatch.elderId;

          if (state.settings.voiceOn) {
            speakText(`Welcome back, ${finalName.split(' ')[0]}. ${t('login.success.elder')}`);
          }

          setTimeout(() => {
            onSuccess(photo);
          }, 500);
          return;
        } else {
          // eslint-disable-next-line no-console
          console.warn('[FaceLogin] Global match failed');
          setVerified(false);
          setGlobalMatchFailed(true);
          setGlobalMatchError('Face not recognized. Please try again or use PIN.');
          hasLoggedRef.current = false;
          globalMatchingInProgressRef.current = false;
          return;
        }
      }

      // MODE A: Local profile matching verified
      const currentName = state.patient?.name?.split(' ')[0] || 'Elder';
      setMatchedElderName(currentName);
      setVerified(true);
      hasLoggedRef.current = true;

      if (state.settings.voiceOn) {
        speakText(`Welcome back, ${currentName}. ${t('login.success.elder')}`);
      }

      setTimeout(() => {
        onSuccess(photo);
      }, 500);
    },
    [profile, state.settings.voiceOn, speakText, t, onSuccess, state.patient, dispatch]
  );

  const face = useFaceRecognition({
    profile,
    // MODE B: Use global matching when there's no known elder or switched to global
    globalMatch: globalMatchMode || globalMatchModeRef.current,
    onMatch: handleMatch,
  });

  // Log scan failure if max attempts reached
  useEffect(() => {
    if (!open) return;
    if (face.state === 'failure' && face.status.key === 'face.tooMany') {
      // eslint-disable-next-line no-console
      console.warn('[FaceLogin] Max attempts reached — face not recognized.');
    }
  }, [face.state, face.status.key, open]);

  // Lifecycle: open/close handling
  useEffect(() => {
    if (!open) {
      face.cancel();
      setVerified(false);
      setGlobalMatchFailed(false);
      return;
    }

    hasLoggedRef.current = false;
    setVerified(false);
    setGlobalMatchFailed(false);

    void fetchProfile();

    return () => {
      face.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Start face recognition once profile is loaded (MODE A) or immediately (MODE B)
  useEffect(() => {
    if (!open || loadingProfile || verified) return;

    const shouldStart = globalMatchMode || globalMatchModeRef.current || (profile?.enrolled);
    if (shouldStart) {
      face.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile, loadingProfile, verified, globalMatchMode]);

  const handleClose = () => {
    face.cancel();
    onClose();
  };

  const handleUsePin = () => {
    face.cancel();
    onUsePin();
  };

  const isEnrolled = !!profile?.enrolled && profile.samples.length > 0;

  return (
    <>
      <Modal open={open && !showEnrollment} title={t('face.title')} onClose={handleClose}>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-xl font-extrabold text-brand-900">🛡️ {t('face.title')}</div>
            <div className="mt-1 text-sm font-semibold text-neutral-500">
              {verified && matchedElderName
                ? `Welcome back, ${matchedElderName}!`
                : 'Look at the camera to identify yourself.'}
            </div>
          </div>

          {loadingProfile ? (
            <div className="flex h-56 w-full flex-col items-center justify-center rounded-2xl bg-neutral-50 p-6 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              <p className="mt-3 text-sm font-bold text-neutral-600">Getting camera ready…</p>
            </div>
          ) : globalMatchFailed ? (
            /* Global matching failed — offer PIN fallback */
            <div className="space-y-4 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
              <div className="text-4xl">❌</div>
              <div className="text-lg font-extrabold text-brand-900">Face Not Recognized</div>
              <p className="text-sm font-semibold text-neutral-600">
                {globalMatchError || 'The face could not be identified. Please try again or use PIN login.'}
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setGlobalMatchFailed(false);
                    setGlobalMatchError('');
                    setVerified(false);
                    hasLoggedRef.current = false;
                    globalMatchingInProgressRef.current = false;
                    face.start();
                  }}
                  className="w-full rounded-2xl bg-brand-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-700"
                >
                  🔄 Try Again
                </button>
                <button
                  type="button"
                  onClick={handleUsePin}
                  className="w-full rounded-2xl border border-brand-200 bg-white px-5 py-3 text-sm font-extrabold text-brand-800 hover:bg-brand-50 transition"
                >
                  🔐 {t('face.usePin')}
                </button>
              </div>
            </div>
          ) : (globalMatchMode || globalMatchModeRef.current) && !isEnrolled ? (
            /* MODE B: Global matching in progress */
            <div className="flex flex-col items-center">
              <LiveFaceScanner
                videoRef={face.videoRef}
                status={face.status}
                alignment={face.alignment}
                faceBox={face.faceBox}
                debug={{
                  lastFaceCount: face.lastFaceCount,
                  lastScore: face.lastScore,
                  lastDistance: face.lastDistance,
                  confidence: face.confidence,
                  matchProgress: face.matchProgress,
                  attemptCount: face.attemptCount,
                  modelsReady: face.modelsReady,
                }}
              >
                {/* 3-Match Progress Indicator for global matching */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2" role="progressbar" aria-valuenow={face.matchProgress} aria-valuemin={0} aria-valuemax={3}>
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`h-3 w-12 rounded-full transition-all duration-200 ${
                          verified || face.matchProgress >= step
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                            : 'bg-neutral-200'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="text-xs font-bold text-brand-700">
                    {verified
                      ? `✓ Face Identified — Welcome ${matchedElderName || ''}`
                      : globalMatchingInProgressRef.current
                      ? 'Identifying you…'
                      : face.matchProgress > 0
                      ? 'Hold still…'
                      : 'Looking for face…'}
                  </div>

                  {face.state === 'failure' && (
                    <div className="flex w-full flex-col gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGlobalMatchFailed(false);
                          setGlobalMatchError('');
                          setVerified(false);
                          hasLoggedRef.current = false;
                          globalMatchingInProgressRef.current = false;
                          face.start();
                        }}
                        className="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-brand-700"
                      >
                        🔄 Try Scan Again
                      </button>
                    </div>
                  )}
                </div>
              </LiveFaceScanner>

              {/* PIN Fallback button */}
              <div className="mt-4 w-full max-w-md">
                <button
                  type="button"
                  onClick={handleUsePin}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand-100 bg-white px-4 py-3 text-sm font-extrabold text-brand-700 shadow-sm transition hover:bg-brand-50 hover:shadow-card"
                >
                  🔐 {t('face.usePin')}
                </button>
              </div>
            </div>
          ) : !isEnrolled ? (
            /* MODE A: Elder account exists but no face enrolled yet */
            <div className="space-y-4 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
              <div className="text-4xl">📸</div>
              <div className="text-lg font-extrabold text-brand-900">No Face Enrolled Yet</div>
              <p className="text-sm font-semibold text-neutral-600">
                A face profile has not been set up for this elder yet. Set it up now.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollment(true)}
                  className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-700"
                >
                  📷 Set Up Face Recognition
                </button>
                <button
                  type="button"
                  onClick={handleUsePin}
                  className="rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-extrabold text-neutral-700 transition hover:bg-neutral-100"
                >
                  🔐 {t('face.usePin')}
                </button>
              </div>
            </div>
          ) : (
            /* MODE A: Known elder with enrolled face profile */
            <div className="flex flex-col items-center">
              <LiveFaceScanner
                videoRef={face.videoRef}
                status={face.status}
                alignment={face.alignment}
                faceBox={face.faceBox}
                debug={{
                  lastFaceCount: face.lastFaceCount,
                  lastScore: face.lastScore,
                  lastDistance: face.lastDistance,
                  confidence: face.confidence,
                  matchProgress: face.matchProgress,
                  attemptCount: face.attemptCount,
                  modelsReady: face.modelsReady,
                }}
              >
                {/* 3-Match Progress Indicator */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2" role="progressbar" aria-valuenow={face.matchProgress} aria-valuemin={0} aria-valuemax={3}>
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`h-3 w-12 rounded-full transition-all duration-200 ${
                          verified || face.matchProgress >= step
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                            : 'bg-neutral-200'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="text-xs font-bold text-brand-700">
                    {verified
                      ? `✓ Face Identified — Welcome ${matchedElderName || ''}`
                      : face.matchProgress > 0
                      ? 'Hold still…'
                      : 'Looking for face…'}
                  </div>

                  {face.state === 'failure' && (
                    <div className="flex w-full flex-col gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          hasLoggedRef.current = false;
                          face.start();
                        }}
                        className="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-brand-700"
                      >
                        🔄 Try Scan Again
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          globalMatchModeRef.current = true;
                          setGlobalMatchMode(true);
                          setProfile(null);
                          hasLoggedRef.current = false;
                          globalMatchingInProgressRef.current = false;
                          setVerified(false);
                          face.start();
                        }}
                        className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-xs font-bold text-brand-800 shadow-sm hover:bg-brand-50 transition"
                      >
                        🌐 Not {state.patient?.name?.split(' ')[0] || 'this elder'}? Switch to Global Face Search
                      </button>
                    </div>
                  )}
                </div>
              </LiveFaceScanner>

              {/* PIN Fallback button */}
              <div className="mt-4 w-full max-w-md">
                <button
                  type="button"
                  onClick={handleUsePin}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand-100 bg-white px-4 py-3 text-sm font-extrabold text-brand-700 shadow-sm transition hover:bg-brand-50 hover:shadow-card"
                >
                  🔐 {t('face.usePin')}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Face Enrollment Modal if triggered from login */}
      <FaceEnrollment
        open={showEnrollment}
        elderId={elderIdRef.current ?? state.patient?.id}
        onClose={() => setShowEnrollment(false)}
        onEnrolled={() => {
          setShowEnrollment(false);
          void fetchProfile();
        }}
      />
    </>
  );
}

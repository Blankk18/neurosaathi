// ============================================================================
// FACE LOGIN — Live Biometric Scan Authentication via Camera
//
// Automatically connects to live camera, analyzes facial landmarks & 128-dim
// descriptors using @vladmandic/face-api, computes Euclidean distance against
// enrolled profile, gates on 3 consecutive matches, and logs authoritative
// scan events to the backend.
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '@/state/AppContext';
import { Modal } from '@/components/ui';
import { LiveFaceScanner } from './LiveFaceScanner';
import { useFaceRecognition } from './useFaceRecognition';
import { loadFaceProfile, saveFaceProfile } from './faceRecognition.service';
import { faceApi } from '@/services/faceApi';
import { FaceEnrollment } from './FaceEnrollment';
import type { FaceProfile } from './types';

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
  const { state, t, speakText } = useApp();
  const [profile, setProfile] = useState<FaceProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [verified, setVerified] = useState(false);

  const sessionIdRef = useRef<string>('');
  const hasLoggedRef = useRef(false);

  const userId = state.patient?.id || 'patient-1';
  const name = state.patient?.name?.split(' ')[0] ?? 'Asha';

  // Fetch enrolled face profile (first check local IndexedDB, fallback to server)
  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      let prof = await loadFaceProfile();
      if (!prof || !prof.enrolled || prof.samples.length === 0) {
        const serverProf = await faceApi.getProfileForLogin(userId);
        if (serverProf && serverProf.enrolled && serverProf.samples.length > 0) {
          prof = {
            version: 1,
            enrolled: true,
            samples: serverProf.samples.map((s) => ({
              descriptor: s,
              capturedAt: Date.now(),
            })),
            enrolledAt: Date.now(),
            patientId: userId,
          };
          await saveFaceProfile(prof);
        }
      }
      setProfile(prof);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[FaceLogin] Error loading face profile:', err);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [userId]);

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

  // Called when 3 consecutive matches are verified by useFaceRecognition
  const handleMatch = useCallback(async () => {
    if (hasLoggedRef.current) return;
    hasLoggedRef.current = true;
    setVerified(true);

    const photo = captureFrame();

    // Log authoritative MATCHED scan event to the backend
    try {
      await faceApi.recordScan({
        userId,
        result: 'MATCHED',
        faceDistance: face.lastDistance ?? 0.35,
        deviceSessionId: sessionIdRef.current,
        photo: photo || null,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[FaceLogin] Server scan record notice:', err);
    }

    if (state.settings.voiceOn) {
      speakText(`${name}. ${t('login.success.elder')}`);
    }

    // Short transition before redirect
    setTimeout(() => {
      onSuccess(photo);
    }, 400);
  }, [userId, name, state.settings.voiceOn, speakText, t, onSuccess]);

  const face = useFaceRecognition({
    profile,
    onMatch: handleMatch,
  });

  // Log scan failure if max attempts reached or explicitly not recognized
  useEffect(() => {
    if (!open || hasLoggedRef.current) return;
    if (face.state === 'failure' && face.status.key === 'face.tooMany') {
      hasLoggedRef.current = true;
      faceApi.recordScan({
        userId,
        result: 'NOT_RECOGNIZED',
        faceDistance: face.lastDistance ?? null,
        deviceSessionId: sessionIdRef.current,
      }).catch(() => null);
    }
  }, [face.state, face.status.key, face.lastDistance, open, userId]);

  // Lifecycle: open/close handling
  useEffect(() => {
    if (!open) {
      face.cancel();
      setVerified(false);
      return;
    }

    sessionIdRef.current = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    hasLoggedRef.current = false;
    setVerified(false);

    void fetchProfile();

    return () => {
      face.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Start face recognition once profile is loaded and verified
  useEffect(() => {
    if (open && profile?.enrolled && !loadingProfile && !verified) {
      face.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile, loadingProfile]);

  const handleClose = () => {
    if (!hasLoggedRef.current && face.live) {
      hasLoggedRef.current = true;
      faceApi.recordScan({
        userId,
        result: 'NO_FACE',
        faceDistance: null,
        deviceSessionId: sessionIdRef.current,
      }).catch(() => null);
    }
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
              {t('face.welcome', { name })}
            </div>
          </div>

          {loadingProfile ? (
            <div className="flex h-56 w-full flex-col items-center justify-center rounded-2xl bg-neutral-50 p-6 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              <p className="mt-3 text-sm font-bold text-neutral-600">Checking biometric security profile…</p>
            </div>
          ) : !isEnrolled ? (
            <div className="space-y-4 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
              <div className="text-4xl">📸</div>
              <div className="text-lg font-extrabold text-brand-900">No Face Enrolled Yet</div>
              <p className="text-sm font-semibold text-neutral-600">
                A face profile has not been set up for this elder yet. You can set it up now or sign in with your PIN.
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
                      ? '✓ Biometric Match Confirmed'
                      : face.matchProgress > 0
                      ? `Verifying… ${face.matchProgress}/3 matches`
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
        onClose={() => setShowEnrollment(false)}
        onEnrolled={() => {
          setShowEnrollment(false);
          void fetchProfile();
        }}
      />
    </>
  );
}
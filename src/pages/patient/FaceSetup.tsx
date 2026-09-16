// ============================================================================
// FACE SETUP — elder "profile setup" destination for face login.
//
// A calm full page that reports whether face login is ready and lets the elder
// (or a family member helping) enroll / re-enroll / reset. Cameras only start on
// explicit user action inside FaceEnrollment, and are always released on exit.
//
// Enrollment check priority:
//   1. Supabase face_enrollments (authoritative, if elder has Supabase UUID)
//   2. IndexedDB (local cache fallback)
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Button, Card, SectionTitle } from '@/components/ui';
import { BackButton } from '@/components/common';
import { FaceEnrollment } from '@/face/FaceEnrollment';
import { loadFaceProfile, resetFaceProfile } from '@/face/faceRecognition.service';
import { hasFaceEnrollment, deleteFaceEnrollment } from '@/services/faceDatabaseService';

export default function FaceSetup() {
  const { t, state } = useApp();
  const navigate = useNavigate();
  const [enrolled, setEnrolled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);

  const checkEnrollment = async () => {
    setChecking(true);
    try {
      const patientId = state.patient?.id ?? '';
      const isSupabaseId = patientId.length === 36 && patientId.includes('-');

      if (isSupabaseId) {
        // Primary: check Supabase
        const supabaseEnrolled = await hasFaceEnrollment(patientId);
        if (supabaseEnrolled) {
          setEnrolled(true);
          setChecking(false);
          return;
        }
      }

      // Fallback: check IndexedDB local cache
      const local = await loadFaceProfile();
      setEnrolled(Boolean(local?.enrolled));
    } catch {
      setEnrolled(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void checkEnrollment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEnroll, state.patient?.id]);

  const handleReset = async () => {
    const patientId = state.patient?.id ?? '';
    const isSupabaseId = patientId.length === 36 && patientId.includes('-');

    if (isSupabaseId) {
      await deleteFaceEnrollment(patientId).catch(() => null);
    }
    await resetFaceProfile(patientId);
    setEnrolled(false);
  };

  return (
    <div className="mx-auto min-h-dvh max-w-2xl bg-canvas px-4 pb-24 pt-4">
      <BackButton to="/home" />

      <div className="mt-3 space-y-5">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              🛡️
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">{t('face.title')}</h1>
              <p className="mt-1 text-base font-semibold leading-relaxed text-brand-700">
                {t('face.login.button')}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-brand-50/70 px-4 py-3 text-sm font-semibold leading-relaxed text-brand-800">
            {t('face.secure.note')}
          </div>
        </Card>

        {/* status card */}
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          {checking ? (
            <div className="text-base font-semibold text-brand-700">{t('face.prepare')}</div>
          ) : enrolled ? (
            <>
              <div className="text-4xl">✅</div>
              <div className="text-xl font-extrabold text-brand-900">{t('face.ready')}</div>
              <p className="max-w-sm text-base font-semibold leading-relaxed text-neutral-600">
                {t('face.setup.success.body')}
              </p>
              <div className="mt-1 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm font-bold text-emerald-700">
                ☁️ Saved securely to your profile
              </div>
              <div className="mt-2 flex w-full max-w-sm flex-col gap-2.5">
                <Button variant="huge" onClick={() => navigate('/login?role=elder')} className="w-full">
                  🛡️ {t('face.test')}
                </Button>
                <Button variant="secondary" onClick={() => setShowEnroll(true)} className="w-full">
                  🔄 {t('face.reenroll')}
                </Button>
                <button
                  onClick={() => void handleReset()}
                  className="mt-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition"
                >
                  {t('face.reset')}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl">📷</div>
              <div className="text-xl font-extrabold text-brand-900">{t('face.noProfile')}</div>
              <p className="max-w-sm text-base font-semibold leading-relaxed text-neutral-600">
                {t('face.noProfile.hint')}
              </p>
              <div className="mt-2 flex w-full max-w-sm flex-col gap-2.5">
                <Button variant="huge" onClick={() => setShowEnroll(true)} className="w-full">
                  📷 {t('face.setup.button')}
                </Button>
                <Button variant="secondary" onClick={() => navigate('/login?role=elder')} className="w-full">
                  ← {t('common.back')} {t('login.title')}
                </Button>
              </div>
            </>
          )}
        </Card>

        <SectionTitle icon="💡">
          <span className="text-lg">{t('face.title')} — prototype</span>
        </SectionTitle>
        <p className="text-sm font-semibold leading-relaxed text-neutral-500">{t('face.prototype.note')}</p>
      </div>

      <FaceEnrollment
        open={showEnroll}
        elderId={state.patient?.id}
        onClose={() => setShowEnroll(false)}
        onEnrolled={() => {
          setShowEnroll(false);
          void checkEnrollment();
        }}
      />
    </div>
  );
}
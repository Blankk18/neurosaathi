// ============================================================================
// FACE ENROLLMENT — live-camera, multi-sample face enrollment (no uploads).
//
// Uses the scanning hook in `enroll` mode: it captures several valid face
// samples across natural micro-movements, then stores the profile locally.
// After enrollment the elder can immediately "Test Face Login".
// ============================================================================

import { useEffect, useState, useRef } from 'react';
import { useApp } from '@/state/AppContext';
import { Button, Modal } from '@/components/ui';
import { LiveFaceScanner } from './LiveFaceScanner';
import { useFaceRecognition } from './useFaceRecognition';
import { saveFaceProfile, buildFaceProfile, resetFaceProfile } from './faceRecognition.service';
import { ENROLLMENT_SAMPLES } from './faceRecognition.config';
import { faceApi } from '@/services/faceApi';
import type { FaceSample } from './types';

const GUIDED_PROMPTS = [
  "Let's set up face recognition. Look at the camera.",
  'Look at the camera',
  'Turn slightly left',
  'Turn slightly right',
  'Look straight ahead',
  'Hold still',
];

export function FaceEnrollment({
  open,
  onClose,
  onEnrolled,
}: {
  open: boolean;
  onClose: () => void;
  onEnrolled?: () => void;
}) {
  const { state, t, speakText } = useApp();
  const [samples, setSamples] = useState<FaceSample[]>([]);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastSpokenStep = useRef<number>(-1);

  const face = useFaceRecognition({
    profile: null,
    enroll: true,
    onSample: (sample) => {
      setSamples((prev) => (prev.length >= ENROLLMENT_SAMPLES ? prev : [...prev, sample]));
    },
  });

  // Calculate current guide step based on collected samples (0 to 5)
  const currentStepIdx = Math.min(
    GUIDED_PROMPTS.length - 1,
    Math.floor((samples.length / ENROLLMENT_SAMPLES) * GUIDED_PROMPTS.length)
  );
  const currentPrompt = GUIDED_PROMPTS[currentStepIdx];

  // Speak prompt when step changes
  useEffect(() => {
    if (!open || done || currentStepIdx === lastSpokenStep.current) return;
    lastSpokenStep.current = currentStepIdx;
    if (state.settings.voiceOn) {
      speakText(currentPrompt);
    }
  }, [open, done, currentStepIdx, currentPrompt, speakText, state.settings.voiceOn]);

  // start scanning when the modal opens; always release the camera on close
  useEffect(() => {
    if (!open) return;
    setSamples([]);
    setDone(false);
    setFailed(false);
    lastSpokenStep.current = -1;
    face.start();
    return () => {
      face.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // react to collected sample count
  useEffect(() => {
    if (samples.length >= ENROLLMENT_SAMPLES && !done) {
      setDone(true);
      face.cancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples]);

  // persist profile once enrollment completes
  useEffect(() => {
    if (!done) return;
    const patientId = state.patient?.id || 'patient-1';
    const profile = buildFaceProfile(samples, patientId);

    // Save locally (IndexedDB) and sync to server-side biometrics
    Promise.all([
      saveFaceProfile(profile),
      faceApi.enroll(
        patientId,
        samples.map((s) => s.descriptor),
        'tiny_face_vladmandic'
      ).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[FaceEnrollment] Server-side enrollment sync notice:', err);
        return null;
      }),
    ]).then(([localOk]) => {
      if (!localOk) setFailed(true);
      else if (state.settings.voiceOn) speakText(t('face.ready.msg'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const collected = samples.length;
  const name = state.patient?.name?.split(' ')[0] ?? '';

  const reset = () => {
    face.cancel();
    const patientId = state.patient?.id || 'patient-1';
    void Promise.all([
      resetFaceProfile(),
      faceApi.resetEnrollment(patientId).catch(() => null),
    ]).then(() => {
      setSamples([]);
      setDone(false);
      setFailed(false);
      lastSpokenStep.current = -1;
    });
  };

  return (
    <Modal open={open} title={t('face.setup.title')} onClose={() => { face.cancel(); onClose(); }}>
      <div className="space-y-5">
        <div className="text-center">
          <div className="text-xl font-extrabold text-brand-900">📷 {t('face.setup.title')}</div>
          <div className="mt-1 text-base font-semibold text-neutral-500">{t('face.enroll.look', { name })}</div>
        </div>

        {failed && (
          <p className="rounded-2xl bg-danger-50 px-4 py-3 text-sm font-bold text-danger-600" role="alert">
            {t('face.saveFail')}
          </p>
        )}

        {done ? (
          <div className="space-y-4 text-center">
            <div className="text-4xl">✅</div>
            <div className="text-xl font-extrabold text-brand-900">{t('face.setup.success.title')}</div>
            <p className="text-base font-semibold text-neutral-600">{t('face.setup.success.body')}</p>
            <Button variant="huge" onClick={() => { face.cancel(); onEnrolled?.(); }} className="w-full">
              🧪 {t('face.test')}
            </Button>
            <button onClick={reset} className="text-xs font-semibold text-neutral-400 hover:text-neutral-600">
              {t('face.reset')}
            </button>
          </div>
        ) : (
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
            <div className="flex flex-col items-center gap-3">
              <div className="w-full max-w-sm rounded-xl bg-brand-50 px-4 py-2 text-center text-sm font-extrabold text-brand-800 border border-brand-200 shadow-sm animate-pulse">
                {currentPrompt}
              </div>
              <div className="flex items-center gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={ENROLLMENT_SAMPLES} aria-valuenow={collected}>
                {Array.from({ length: ENROLLMENT_SAMPLES }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-3 w-6 rounded-full transition-colors duration-300 ${i < collected ? 'bg-emerald-500' : 'bg-neutral-200'}`}
                    aria-hidden
                  />
                ))}
              </div>
              <div className="text-sm font-bold text-brand-700">{t('face.samples', { current: collected, total: ENROLLMENT_SAMPLES })}</div>
              {face.status.state !== 'error' && (
                <button
                  onClick={face.cancel}
                  className="rounded-full bg-white px-5 py-3 text-base font-bold text-brand-700 shadow-card hover:bg-brand-50 transition"
                >
                  {t('face.cancel')}
                </button>
              )}
            </div>
          </LiveFaceScanner>
        )}
      </div>
    </Modal>
  );
}
// ============================================================================
// FACE ENROLLMENT — live-camera, multi-sample face enrollment (no uploads).
//
// Uses the scanning hook in `enroll` mode: it captures several valid face
// samples across natural micro-movements, then stores the profile locally.
// After enrollment the elder can immediately "Test Face Login".
// ============================================================================

import { useEffect, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { Button, Modal } from '@/components/ui';
import { LiveFaceScanner } from './LiveFaceScanner';
import { useFaceRecognition } from './useFaceRecognition';
import { saveFaceProfile, buildFaceProfile, resetFaceProfile } from './faceRecognition.service';
import { ENROLLMENT_SAMPLES } from './faceRecognition.config';
import type { FaceSample } from './types';

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

  const face = useFaceRecognition({
    profile: null,
    enroll: true,
    onSample: (sample) => {
      setSamples((prev) => (prev.length >= ENROLLMENT_SAMPLES ? prev : [...prev, sample]));
    },
  });

  // start scanning when the modal opens; always release the camera on close
  useEffect(() => {
    if (!open) return;
    setSamples([]);
    setDone(false);
    setFailed(false);
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
    const profile = buildFaceProfile(samples, state.patient?.id);
    void saveFaceProfile(profile).then((ok) => {
      if (!ok) setFailed(true);
      else if (state.settings.voiceOn) speakText(t('face.ready.msg'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const collected = samples.length;
  const name = state.patient?.name?.split(' ')[0] ?? '';

  const reset = () => {
    face.cancel();
    void resetFaceProfile().then(() => {
      setSamples([]);
      setDone(false);
      setFailed(false);
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
          <LiveFaceScanner videoRef={face.videoRef} status={face.status} alignment={face.alignment}>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={ENROLLMENT_SAMPLES} aria-valuenow={collected}>
                {Array.from({ length: ENROLLMENT_SAMPLES }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-3 w-6 rounded-full ${i < collected ? 'bg-emerald-500' : 'bg-neutral-200'}`}
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
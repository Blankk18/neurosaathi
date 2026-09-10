// ============================================================================
// FACE LOGIN — Face ID-style elder authentication via live webcam.
//
// Renders the useFaceRecognition state machine inside a calm, large,
// accessibility-friendly modal. On success calls onSuccess; on failure/error
// or explicit choice it offers "Use PIN instead". The hook always releases the
// camera — never left running in the background.
// ============================================================================

import { useEffect, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { Button, Modal } from '@/components/ui';
import { LiveFaceScanner } from './LiveFaceScanner';
import { useFaceRecognition } from './useFaceRecognition';
import { loadFaceProfile } from './faceRecognition.service';
import type { FaceProfile } from './types';

export function FaceLogin({
  open,
  onClose,
  onSuccess,
  onUsePin,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onUsePin: () => void;
}) {
  const { state, t, speakText } = useApp();
  const [profile, setProfile] = useState<FaceProfile | null>(null);
  const [checking, setChecking] = useState(true);

  const face = useFaceRecognition({
    profile,
    onMatch: onSuccess,
  });

  // load the enrolled profile whenever the modal opens
  useEffect(() => {
    if (!open) return;
    face.cancel();
    setChecking(true);
    let mounted = true;
    loadFaceProfile().then((p) => {
      if (!mounted) return;
      setProfile(p);
      setChecking(false);
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // speak the guidance once the camera is live
  useEffect(() => {
    if ((face.state === 'cameraReady' || face.state === 'detecting') && state.settings.voiceOn) {
      speakText(t('face.sayHello'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face.state]);

  const name = state.patient?.name?.split(' ')[0] ?? '';

  const idleOrStarting =
    face.state === 'idle' || face.state === 'loadingModels' || face.state === 'requestingCamera';

  return (
    <Modal open={open} title={t('face.title')} onClose={() => { face.cancel(); onClose(); }}>
      <div className="space-y-5">
        <div className="text-center">
          <div className="text-xl font-extrabold text-brand-900">🛡️ {t('face.title')}</div>
          <div className="mt-1 text-base font-semibold text-neutral-500">{t('face.welcome', { name })}</div>
        </div>

        {checking ? (
          <div className="text-center text-base font-semibold text-brand-700">{t('face.prepare')}</div>
        ) : !profile?.enrolled ? (
          <div className="space-y-4 text-center">
            <div className="rounded-3xl bg-warm-50 p-5 text-brand-800">
              <div className="text-3xl">😊</div>
              <div className="mt-2 text-lg font-extrabold">{t('face.noProfile')}</div>
              <div className="mt-1 text-sm font-semibold text-neutral-500">{t('face.noProfile.hint')}</div>
            </div>
            <Button variant="secondary" onClick={onUsePin} className="w-full">
              🔐 {t('face.usePin')}
            </Button>
          </div>
        ) : idleOrStarting ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <p className="max-w-xs text-base font-semibold text-brand-700">
              {t('face.camera.only')} {t('face.local')}
            </p>
            <Button variant="huge" onClick={face.start} className="!px-10">
              🛡️ {t('face.login.button')}
            </Button>
            <button
              onClick={onUsePin}
              className="rounded-full bg-white px-5 py-3 text-base font-bold text-brand-700 shadow-card hover:bg-brand-50 transition"
            >
              🔐 {t('face.usePin')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <LiveFaceScanner
              videoRef={face.videoRef}
              status={face.status}
              alignment={face.alignment}
            />
            {/* consecutive-match progress (required before authenticating) */}
            {face.matchProgress > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700" role="status" aria-live="polite">
                {Array.from({ length: face.matchProgress }).map((_, i) => (
                  <span key={i} className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
                ))}
                <span className="ml-1">{t('face.verify')}</span>
              </div>
            )}
            <button
              onClick={() => { face.cancel(); onUsePin(); }}
              className="rounded-full bg-white px-5 py-3 text-base font-bold text-brand-700 shadow-card hover:bg-brand-50 transition"
            >
              🔐 {t('face.usePin')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
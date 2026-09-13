// ============================================================================
// FACE ENROLLMENT — Automatic 3-photo enrollment for elderly dementia patients
//
// HANDS-FREE AUTOMATIC FLOW:
//   1. Camera opens
//   2. Show "Look at the camera"
//   3. Wait for valid face (centered, quality, fully in frame, high detection score)
//   4. Accumulate stable frames
//   5. Once stable → show 3... 2... 1... (countdown)
//   6. Auto-capture Photo 1
//   7. Show "Great! Photo 1 of 3"
//   8. Repeat for Photos 2 ("Please smile") and 3 ("Look at the camera again")
//   9. On 3 photos collected → "Face setup complete!"
//
// NO manual confirmation buttons needed.
// Face must be valid before countdown starts.
// If face moves during countdown, countdown cancels and waits again.
// ============================================================================

import { useEffect, useState, useRef } from 'react';
import { useApp } from '@/state/AppContext';
import { Modal } from '@/components/ui';
import { LiveFaceScanner } from './LiveFaceScanner';
import { useFaceRecognition } from './useFaceRecognition';
import { saveFaceProfile, buildFaceProfile, resetFaceProfile } from './faceRecognition.service';
import {
  saveFaceEnrollment,
  deleteFaceEnrollment,
  uploadEnrollmentImages,
  FACE_MODEL_VERSION,
} from '@/services/faceDatabaseService';
import { supabase } from '@/services/supabase';
import { ENROLLMENT_SAMPLES } from './faceRecognition.config';
import type { FaceSample } from './types';

// Three automatic prompts — one per photo
const PHOTO_PROMPTS = [
  "Look at the camera",      // Photo 1
  "Please smile",             // Photo 2
  "Look at the camera again", // Photo 3
];

const PHOTO_SUCCESS_MESSAGES = [
  "Great! Photo 1 of 3",
  "Great! Photo 2 of 3",
  "Great! Photo 3 of 3",
];

export function FaceEnrollment({
  open,
  onClose,
  onEnrolled,
  elderId,
}: {
  open: boolean;
  onClose: () => void;
  onEnrolled?: () => void;
  elderId?: string;
}) {
  const { state, t, speakText } = useApp();
  const [samples, setSamples] = useState<FaceSample[]>([]);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failMessage, setFailMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null); // null = no countdown, 3/2/1 = showing
  const [justCaptured, setJustCaptured] = useState(false); // Show "Photo X of 3" message after capture
  const lastSpokenStep = useRef<number>(-1);
  const lastSpokenCountdown = useRef<number>(-1);
  // authUserId: the Supabase auth.uid() for the current anonymous session.
  const authUserIdRef = useRef<string | null>(null);
  // enrollmentId: unique UUID per attempt.
  const enrollmentIdRef = useRef<string>(crypto.randomUUID());

  const face = useFaceRecognition({
    profile: null,
    enroll: true,
    onSample: (sample) => {
      setSamples((prev) => (prev.length >= ENROLLMENT_SAMPLES ? prev : [...prev, sample]));
      setJustCaptured(true);
      // Auto-dismiss "Photo X of 3" message after 1.5 seconds
      setTimeout(() => setJustCaptured(false), 1500);
    },
    onCountdownTick: (remaining) => {
      if (remaining === 0) {
        setCountdownDisplay(null);
      } else {
        setCountdownDisplay(remaining);
      }
    },
  });

  // Current photo index (0, 1, or 2)
  const currentPhotoIdx = Math.min(2, samples.length);
  const currentPrompt = PHOTO_PROMPTS[currentPhotoIdx];
  const currentSuccessMessage = PHOTO_SUCCESS_MESSAGES[currentPhotoIdx];

  // Speak prompt when it changes
  useEffect(() => {
    if (!open || done || countdownDisplay !== null || justCaptured) return;
    if (currentPhotoIdx === lastSpokenStep.current) return;
    lastSpokenStep.current = currentPhotoIdx;
    if (state.settings.voiceOn) {
      speakText(currentPrompt);
    }
  }, [open, done, currentPhotoIdx, currentPrompt, countdownDisplay, justCaptured, speakText, state.settings.voiceOn]);

  // Speak countdown numbers
  useEffect(() => {
    if (!countdownDisplay || !state.settings.voiceOn || countdownDisplay === lastSpokenCountdown.current) return;
    lastSpokenCountdown.current = countdownDisplay;
    speakText(countdownDisplay.toString());
  }, [countdownDisplay, state.settings.voiceOn, speakText]);

  // Start scanning when the modal opens
  useEffect(() => {
    if (!open) return;
    setSamples([]);
    setDone(false);
    setFailed(false);
    setFailMessage('');
    setSaving(false);
    setSavedToCloud(false);
    setUploadProgress('');
    setCountdownDisplay(null);
    setJustCaptured(false);
    lastSpokenStep.current = -1;
    lastSpokenCountdown.current = -1;
    enrollmentIdRef.current = crypto.randomUUID();
    // Fetch the current Supabase auth user
    void supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        authUserIdRef.current = data.user.id;
        // eslint-disable-next-line no-console
        console.info(`[FaceEnrollment] Auth user loaded — uid: ${data.user.id}, enrollmentId: ${enrollmentIdRef.current}`);
      } else {
        authUserIdRef.current = null;
        // eslint-disable-next-line no-console
        console.error('[FaceEnrollment] No authenticated Supabase user found on open');
      }
    });
    face.start();
    return () => {
      face.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // React to collected sample count
  useEffect(() => {
    if (samples.length >= ENROLLMENT_SAMPLES && !done) {
      setDone(true);
      face.cancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples]);

  // Persist profile once enrollment completes
  useEffect(() => {
    if (!done) return;

    const patientId = elderId || state.patient?.id || '';

    // Guard: patient.id MUST be a real Supabase UUID
    const isSupabaseId = patientId.length === 36 && patientId.includes('-');

    if (!isSupabaseId) {
      setFailed(true);
      setFailMessage(
        'Elder account setup is incomplete — no Supabase ID found. Please restart registration.'
      );
      setSaving(false);
      return;
    }

    const persist = async () => {
      setSaving(true);
      setFailed(false);
      setFailMessage('');

      // Resolve auth user
      if (!authUserIdRef.current) {
        const { data: freshUser } = await supabase.auth.getUser();
        if (freshUser?.user) {
          authUserIdRef.current = freshUser.user.id;
          // eslint-disable-next-line no-console
          console.info(`[FaceEnrollment] Auth user recovered — uid: ${freshUser.user.id}`);
        } else {
          setSaving(false);
          setFailed(true);
          setFailMessage('No authenticated Supabase session. Please restart registration.');
          return;
        }
      }
      const resolvedAuthUserId = authUserIdRef.current;
      const enrollmentId = enrollmentIdRef.current;

      // eslint-disable-next-line no-console
      console.info(
        `[FaceEnrollment] persist — authUserId: ${resolvedAuthUserId}, enrollmentId: ${enrollmentId}, patientId: ${patientId}`
      );

      // Upload enrollment images to private Storage
      setUploadProgress('Uploading face images…');
      const blobs = samples.map((s) => s.imageBlob);

      const uploadResult = await uploadEnrollmentImages(resolvedAuthUserId, enrollmentId, blobs);

      if (!uploadResult.success) {
        // eslint-disable-next-line no-console
        console.error('[FaceEnrollment] Image upload failed:', uploadResult.error);
        setSaving(false);
        setFailed(true);
        setFailMessage(
          uploadResult.error ??
            'Face images could not be uploaded. Please check your connection and try again.'
        );
        setUploadProgress('');
        return;
      }

      if (uploadResult.missingBlobs > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `[FaceEnrollment] ${uploadResult.missingBlobs} samples had no image blob — those samples were skipped.`
        );
      }

      // eslint-disable-next-line no-console
      console.info(
        `[FaceEnrollment] Uploaded ${uploadResult.paths.length} images to face-enrollments/${resolvedAuthUserId}/${enrollmentId}/`
      );

      // Upsert face_enrollments row
      setUploadProgress('Saving face recognition profile…');
      const dbResult = await saveFaceEnrollment(
        patientId,
        samples,
        FACE_MODEL_VERSION,
        uploadResult.paths,
      );

      if (!dbResult.success) {
        // eslint-disable-next-line no-console
        console.error('[FaceEnrollment] DB save failed:', dbResult.error);

        setSaving(false);
        setFailed(true);
        setFailMessage(
          dbResult.error
            ? `Images uploaded, but face profile could not be finalized.\n${dbResult.error}`
            : 'Images uploaded, but face profile could not be finalized. Please try again.'
        );
        setUploadProgress('');
        return;
      }

      setSavedToCloud(true);
      // eslint-disable-next-line no-console
      console.info(
        `[FaceEnrollment] Face enrollment complete ✅ — ${samples.length} samples, ${uploadResult.paths.length} images`
      );

      // Save descriptor-only profile to IndexedDB as local cache
      const strippedSamples = samples.map((s) => ({
        descriptor: s.descriptor,
        capturedAt: s.capturedAt,
      }));
      const profile = buildFaceProfile(strippedSamples, patientId);
      const localOk = await saveFaceProfile(profile, patientId);
      if (!localOk) {
        // eslint-disable-next-line no-console
        console.warn(
          '[FaceEnrollment] IndexedDB cache save failed — Supabase copy is still authoritative.'
        );
      }

      setSaving(false);
      setUploadProgress('');

      if (state.settings.voiceOn) {
        speakText('Face registration saved securely.');
      }
    };

    void persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const collected = samples.length;
  const name = state.patient?.name?.split(' ')[0] ?? '';

  const reset = () => {
    face.cancel();
    const patientId = elderId || state.patient?.id || '';
    const isSupabaseId = patientId.length === 36 && patientId.includes('-');

    const doReset = async () => {
      enrollmentIdRef.current = crypto.randomUUID();
      if (isSupabaseId) {
        await deleteFaceEnrollment(patientId).catch(() => null);
      }
      await resetFaceProfile(patientId);
      setSamples([]);
      setDone(false);
      setFailed(false);
      setFailMessage('');
      setSavedToCloud(false);
      setUploadProgress('');
      setCountdownDisplay(null);
      setJustCaptured(false);
      lastSpokenStep.current = -1;
      lastSpokenCountdown.current = -1;
      face.start();
    };

    void doReset();
  };

  return (
    <Modal open={open} title={t('face.setup.title')} onClose={() => { face.cancel(); onClose(); }}>
      <div className="space-y-5">
        <div className="text-center">
          <div className="text-xl font-extrabold text-brand-900">📷 {t('face.setup.title')}</div>
          <div className="mt-1 text-base font-semibold text-neutral-500">{t('face.enroll.look', { name })}</div>
        </div>

        {/* Error state */}
        {failed && (
          <p className="rounded-2xl bg-danger-50 px-4 py-3 text-sm font-bold text-danger-600 border border-danger-200" role="alert">
            <span aria-hidden>⚠️ </span>
            {failMessage || t('face.saveFail')}
          </p>
        )}

        {done && !saving && !failed ? (
          <div className="space-y-4 text-center">
            <div className="text-4xl">✅</div>
            <div className="text-xl font-extrabold text-brand-900">{t('face.setup.success.title')}</div>
            <p className="text-base font-semibold text-neutral-600">{t('face.setup.success.body')}</p>

            {/* Cloud save confirmation */}
            {savedToCloud && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
                <span className="text-xl">☁️</span>
                <p className="text-sm font-bold text-emerald-700 text-left">
                  {ENROLLMENT_SAMPLES} face images and your face recognition profile were saved securely.
                </p>
              </div>
            )}

            <button
              onClick={() => { face.cancel(); onEnrolled?.(); }}
              className="w-full rounded-2xl bg-brand-600 px-5 py-3.5 text-sm font-extrabold text-white shadow transition hover:bg-brand-700"
            >
              ✅ {t('face.test')}
            </button>
            <button onClick={reset} className="text-xs font-semibold text-neutral-400 hover:text-neutral-600">
              {t('face.reset')}
            </button>
          </div>
        ) : done && saving ? (
          /* Saving state with progress detail */
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-sm font-bold text-brand-700">
              {uploadProgress || 'Saving your face profile securely…'}
            </p>
            <p className="text-xs font-semibold text-neutral-400">Please keep the app open for a moment.</p>
          </div>
        ) : failed && !saving ? (
          /* Retry state after failure */
          <div className="space-y-4 text-center py-2">
            <button
              onClick={reset}
              className="w-full rounded-2xl bg-brand-600 px-5 py-3.5 text-sm font-extrabold text-white shadow transition hover:bg-brand-700"
            >
              🔄 Try Face Enrollment Again
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
            <div className="flex flex-col items-center gap-4">
              {/* Main instruction or countdown display */}
              {justCaptured ? (
                /* Show "Photo X of 3" success message after capture */
                <div className="w-full max-w-sm rounded-xl bg-emerald-50 px-4 py-2 text-center text-sm font-extrabold text-emerald-800 border border-emerald-200 shadow-sm">
                  {currentSuccessMessage}
                </div>
              ) : countdownDisplay !== null ? (
                /* Show countdown number (3, 2, 1) */
                <div className="flex flex-col items-center gap-2">
                  <div className="text-6xl font-black text-brand-600 tabular-nums">
                    {countdownDisplay}
                  </div>
                  <div className="text-sm font-semibold text-neutral-600">
                    Ready to capture…
                  </div>
                </div>
              ) : (
                /* Show instruction prompt */
                <div className="w-full max-w-sm rounded-xl bg-brand-50 px-4 py-2 text-center text-sm font-extrabold text-brand-800 border border-brand-200 shadow-sm animate-pulse">
                  {currentPrompt}
                </div>
              )}

              {/* Photo progress indicator */}
              <div className="flex items-center gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={ENROLLMENT_SAMPLES} aria-valuenow={collected}>
                {Array.from({ length: ENROLLMENT_SAMPLES }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-3 w-6 rounded-full transition-colors duration-300 ${i < collected ? 'bg-emerald-500' : 'bg-neutral-200'}`}
                    aria-hidden
                  />
                ))}
              </div>

              {/* Photo count display */}
              <div className="text-sm font-bold text-brand-700">
                Photo {collected + 1} of {ENROLLMENT_SAMPLES}
              </div>

              {/* Cancel button only */}
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

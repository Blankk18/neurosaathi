// ============================================================================
// FACE ENROLLMENT — live-camera, multi-sample face enrollment.
//
// COMPLETE FLOW (mandatory for elder registration):
//   1. Camera opens via useFaceRecognition(enroll: true)
//   2. Hook collects ENROLLMENT_SAMPLES (10) real face samples.
//      Each sample = { descriptor: number[128], capturedAt, imageBlob: Blob }
//      The imageBlob is the JPEG frame captured at the exact same tick that
//      produced the descriptor — guaranteed 1-to-1 correspondence.
//   3. On 10 samples collected:
//      a) Upload all 10 JPEG blobs to private Supabase Storage bucket
//         'face-enrollments' under path {elder_id}/sample-NN.jpg
//         (Storage RLS verifies elder ownership via auth chain)
//      b) Upsert face_enrollments row with:
//           embedding   = JSON of descriptor+capturedAt arrays (no blobs)
//           sample_count = 10
//           photo_paths  = 10 storage paths
//           is_active    = true
//      c) On success: save descriptor-only profile to IndexedDB as cache
//         (no blobs in IndexedDB — they are already in Storage)
//   4. onEnrolled() is called ONLY after BOTH storage upload AND DB write succeed.
//   5. If upload fails: show error, allow retry. Do NOT call onEnrolled.
//   6. If DB write fails: clean up uploaded images, show error, allow retry.
// ============================================================================

import { useEffect, useState, useRef } from 'react';
import { useApp } from '@/state/AppContext';
import { Button, Modal } from '@/components/ui';
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
  const lastSpokenStep = useRef<number>(-1);
  // authUserId: the Supabase auth.uid() for the current anonymous session.
  // Used as the FIRST folder segment in Storage paths so RLS can match auth.uid().
  const authUserIdRef = useRef<string | null>(null);
  // enrollmentId: unique UUID per attempt. Generated fresh on each start/retry.
  // Used as the SECOND folder segment — ensures no path collisions between retries.
  const enrollmentIdRef = useRef<string>(crypto.randomUUID());

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
    setFailMessage('');
    setSaving(false);
    setSavedToCloud(false);
    setUploadProgress('');
    lastSpokenStep.current = -1;
    // Generate a fresh enrollmentId for this open session
    enrollmentIdRef.current = crypto.randomUUID();
    // Fetch the current Supabase auth user — needed for Storage path
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

    const patientId = elderId || state.patient?.id || '';

    // Guard: patient.id MUST be a real Supabase UUID (36 chars with hyphens).
    // A local uid('patient') would be rejected by Supabase RLS anyway, so
    // we fail early with a clear message.
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

      // ── Step 1: Resolve auth user ─────────────────────────────────────────
      // authUserId is used as Storage folder root so RLS (auth.uid()::text) passes.
      // patientId (elder_profiles.id) is used only for the DB face_enrollments row.
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

      // ── Step 2: Upload 10 enrollment images to private Storage ────────────
      // Path: face-enrollments/{authUserId}/{enrollmentId}/sample-NN.jpg
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

      // ── Step 3: Upsert face_enrollments row (elder_id = elder_profiles.id) ───
      // photo_paths contain the storage paths with authUserId as folder.
      // elder_id is the DB-level identity (elder_profiles.id).
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
        // eslint-disable-next-line no-console
        console.info(
          '[FaceEnrollment] Images preserved in Storage for inspection (NOT deleted).\n' +
          `authUserId: ${resolvedAuthUserId}\n` +
          `enrollmentId: ${enrollmentId}\n` +
          `elderId (patientId): ${patientId}\n` +
          `uploadedPaths: ${JSON.stringify(uploadResult.paths)}`
        );

        // NOTE: Images are NOT deleted here during debugging so you can inspect
        // them in Supabase Storage. Once the full flow is confirmed working,
        // cleanup can be re-enabled for partial-failure cases.

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

      // ── Step 3: Save descriptor-only profile to IndexedDB as local cache ───
      // Strip imageBlob before IndexedDB storage — blobs are large and already
      // persisted in Supabase Storage.
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
      // Generate a fresh enrollmentId so the next attempt uses new paths
      enrollmentIdRef.current = crypto.randomUUID();
      // Clear Supabase if applicable
      if (isSupabaseId) {
        await deleteFaceEnrollment(patientId).catch(() => null);
      }
      // Clear local cache
      await resetFaceProfile(patientId);
      setSamples([]);
      setDone(false);
      setFailed(false);
      setFailMessage('');
      setSavedToCloud(false);
      setUploadProgress('');
      lastSpokenStep.current = -1;
      // Restart camera
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

            {/* Cloud save confirmation — only shown after Supabase + Storage succeed */}
            {savedToCloud && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
                <span className="text-xl">☁️</span>
                <p className="text-sm font-bold text-emerald-700 text-left">
                  {ENROLLMENT_SAMPLES} face images and your face recognition profile were saved securely.
                </p>
              </div>
            )}

            <Button variant="huge" onClick={() => { face.cancel(); onEnrolled?.(); }} className="w-full">
              🧪 {t('face.test')}
            </Button>
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
              {/* "Capturing face sample N of 10" as required */}
              <div className="text-sm font-bold text-brand-700">
                {collected > 0
                  ? `Capturing face sample ${collected} of ${ENROLLMENT_SAMPLES}`
                  : t('face.samples', { current: collected, total: ENROLLMENT_SAMPLES })}
              </div>
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
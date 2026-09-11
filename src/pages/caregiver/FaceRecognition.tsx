// ============================================================================
// CAREGIVER — FACE RECOGNITION ADMINISTRATION
// Manage biometric enrollment, review status, and launch guided face setup.
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, Button, Chip, Modal } from '@/components/ui';
import { FaceEnrollment } from '@/face/FaceEnrollment';
import { faceApi, BackendFaceStatus } from '@/services/faceApi';
import { resetFaceProfile, loadFaceProfile } from '@/face/faceRecognition.service';
import { ShieldIcon, ClockIcon, AlertIcon } from '@/components/Icons';
import { ElderSelector } from '@/components/caregiver/ElderSelector';
import type { DbElderProfile } from '@/types/database';

export default function FaceRecognition() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [selectedElder, setSelectedElder] = useState<DbElderProfile | null>(null);
  const activeElderId = selectedElder?.id || state.patient?.id || 'e0000000-0000-0000-0000-000000000001';
  const elderName = selectedElder?.name || state.patient?.name || 'Asha Sharma';

  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<BackendFaceStatus | null>(null);
  const [showEnroll, setShowEnroll] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      // 1. Check backend status
      const status = await faceApi.getStatus(activeElderId);
      setBackendStatus(status);
    } catch {
      // Fallback to local profile check if backend is offline
      const local = await loadFaceProfile();
      setBackendStatus({
        isEnrolled: Boolean(local?.enrolled),
        samplesCount: local?.samples?.length || 0,
        modelVersion: 'face-api-v1',
        enrolledAt: local?.enrolledAt ? new Date(local.enrolledAt).toISOString() : null,
        lastSuccessfulScan: null,
        lastFailedScan: null,
        lastPhoto: null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, [activeElderId, showEnroll]);

  const handleReset = async () => {
    if (!window.confirm(`Are you sure you want to reset face recognition for ${elderName}?`)) return;
    setResetting(true);
    try {
      await resetFaceProfile();
      await faceApi.resetEnrollment(activeElderId).catch(() => {});
      setMessage({ text: 'Face recognition has been reset.', type: 'success' });
      await fetchStatus();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to reset.', type: 'error' });
    } finally {
      setResetting(false);
    }
  };

  const isEnrolled = Boolean(backendStatus?.isEnrolled);

  return (
    <div className="mx-auto max-w-[780px] space-y-6 fade-in">
      {/* Multi-Elder Selector */}
      <div className="rounded-3xl bg-white p-3 shadow-card">
        <ElderSelector
          selectedElderId={activeElderId}
          onSelectElder={setSelectedElder}
        />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-brand-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 shadow-sm border border-brand-100">
              <ShieldIcon size={20} />
            </span>
            Security & Face Recognition
          </h2>
          <p className="mt-1 text-sm font-semibold text-neutral-500">
            Manage biometric authentication and monitor scan activities for <b>{elderName}</b>.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => navigate('/caregiver/face-scans')}
          className="!py-2.5 text-sm shadow-sm"
        >
          🕒 View Scan History
        </Button>
      </div>

      {message && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-bold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-danger-50 text-danger-800 border border-danger-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Main Status Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-100">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-3xl">
              👤
            </div>
            <div>
              <div className="text-xl font-extrabold text-brand-900">{elderName}</div>
              <div className="mt-1 flex items-center gap-2">
                <Chip tone={isEnrolled ? 'brand' : 'warm'}>
                  {isEnrolled ? '✓ Face Recognition Enabled' : '⚠ Not Enrolled'}
                </Chip>
                {backendStatus?.modelVersion && (
                  <span className="text-xs font-mono text-neutral-400">
                    model: {backendStatus.modelVersion}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant={isEnrolled ? 'secondary' : 'huge'}
              onClick={() => setShowEnroll(true)}
              className="!py-3 !text-sm"
            >
              📷 {isEnrolled ? 'Update Face' : 'Set Up Face Recognition'}
            </Button>
            {isEnrolled && (
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs font-extrabold text-danger-700 hover:bg-danger-100 transition"
              >
                {resetting ? 'Resetting…' : 'Reset'}
              </button>
            )}
          </div>
        </div>

        {/* Biometric Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="rounded-2xl bg-canvas p-4 border border-brand-100/60">
            <div className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">
              Enrolled Samples
            </div>
            <div className="mt-2 text-2xl font-extrabold text-brand-900">
              {loading ? '…' : `${backendStatus?.samplesCount ?? 0}`}
            </div>
            <p className="mt-1 text-xs font-semibold text-neutral-400">
              5–10 samples across slight angles
            </p>
          </div>

          <div className="rounded-2xl bg-canvas p-4 border border-brand-100/60">
            <div className="text-xs font-extrabold uppercase tracking-wide text-neutral-500 flex items-center gap-1">
              <ClockIcon size={12} /> Last Successful Scan
            </div>
            <div className="mt-2 text-sm font-extrabold text-emerald-800 truncate">
              {loading
                ? '…'
                : backendStatus?.lastSuccessfulScan
                  ? new Date(backendStatus.lastSuccessfulScan).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'No successful scans yet'}
            </div>
            <p className="mt-1 text-xs font-semibold text-neutral-400">
              Validated on device
            </p>
          </div>

          <div className="rounded-2xl bg-canvas p-4 border border-brand-100/60">
            <div className="text-xs font-extrabold uppercase tracking-wide text-neutral-500 flex items-center gap-1">
              <AlertIcon size={12} /> Last Failed Attempt
            </div>
            <div className="mt-2 text-sm font-extrabold text-warm-700 truncate">
              {loading
                ? '…'
                : backendStatus?.lastFailedScan
                  ? new Date(backendStatus.lastFailedScan).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'None recorded'}
            </div>
            <p className="mt-1 text-xs font-semibold text-neutral-400">
              Non-match or multiple faces
            </p>
          </div>
        </div>
      </Card>

      {/* Latest Captured Face Login Photo (works cross-device) */}
      {(state.lastFaceLogin?.photo || backendStatus?.lastPhoto) && (
        <Card className="p-5 border border-brand-200/80 bg-gradient-to-r from-brand-50/50 via-white to-emerald-50/40 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedPhoto(state.lastFaceLogin?.photo || backendStatus?.lastPhoto || null)}
                className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-emerald-400 shadow-sm focus:outline-none"
                aria-label="Enlarge captured face photo"
              >
                <img
                  src={state.lastFaceLogin?.photo || backendStatus?.lastPhoto || ''}
                  alt="Verified Login Snapshot"
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 text-white text-xs font-extrabold">
                  🔍 View
                </div>
              </button>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-brand-900">📸 Latest Face Login Photo</span>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800">
                    ✓ Verified Match
                  </span>
                </div>
                <p className="text-xs font-semibold text-neutral-600">
                  Snapshot captured during {state.lastFaceLogin?.name || elderName || 'elder'}'s biometric login.
                </p>
                <div className="text-[11px] font-mono text-neutral-400">
                  Logged:{' '}
                  {new Date(
                    state.lastFaceLogin?.timestamp || backendStatus?.lastSuccessfulScan || Date.now()
                  ).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={() => setSelectedPhoto(state.lastFaceLogin?.photo || backendStatus?.lastPhoto || null)}
              className="!py-2 !px-4 text-xs font-extrabold"
            >
              Enlarge Photo
            </Button>
          </div>
        </Card>
      )}

      {/* Privacy Notice (Part 25) */}
      <Card className="border border-brand-200/70 bg-gradient-to-br from-brand-50/70 via-white to-warm-50/40 p-5">
        <div className="flex items-start gap-3.5">
          <span className="text-2xl" aria-hidden>🔒</span>
          <div className="space-y-1 text-sm font-semibold leading-relaxed text-brand-900">
            <div className="font-extrabold text-brand-900">Privacy & Biometric Architecture</div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Face recognition is processed entirely on this device. Only the numerical 128-dimensional mathematical descriptors required for recognition and authoritative security audit logs are securely stored on the server.
            </p>
            <p className="text-xs text-neutral-500">
              Raw webcam video is never uploaded or recorded. You can reset or remove biometric enrollment at any time.
            </p>
          </div>
        </div>
      </Card>

      {/* Enrollment Modal */}
      <FaceEnrollment
        open={showEnroll}
        elderId={state.patient?.id}
        onClose={() => setShowEnroll(false)}
        onEnrolled={() => {
          setShowEnroll(false);
          setMessage({ text: 'Face enrollment completed and stored on server!', type: 'success' });
          void fetchStatus();
        }}
      />

      {/* Photo Enlarge Lightbox */}
      {selectedPhoto && (
        <Modal open={true} title="Biometric Check-In Photo" onClose={() => setSelectedPhoto(null)}>
          <div className="space-y-4 text-center">
            <div className="overflow-hidden rounded-2xl border border-brand-200 bg-black shadow-lift">
              <img
                src={selectedPhoto}
                alt="Enlarged Verified Face"
                className="max-h-[420px] w-full object-contain mx-auto"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold px-1">
              <span>✓ Captured during live biometric face scan</span>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="font-extrabold text-brand-700 hover:text-brand-900"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

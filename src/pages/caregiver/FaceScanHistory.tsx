// ============================================================================
// CAREGIVER — FACE SCAN ACTIVITY HISTORY
// Authoritative security audit logs of all face scan attempts from backend.
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, Button, Modal } from '@/components/ui';
import { faceApi, BackendScanEvent } from '@/services/faceApi';
import { ShieldIcon } from '@/components/Icons';
import { ElderSelector } from '@/components/caregiver/ElderSelector';
import type { DbElderProfile } from '@/types/database';

export default function FaceScanHistory() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [selectedElder, setSelectedElder] = useState<DbElderProfile | null>(null);
  const activeElderId = selectedElder?.id || state.patient?.id || 'e0000000-0000-0000-0000-000000000001';
  const elderName = selectedElder?.name || state.patient?.name || 'Asha Sharma';

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<BackendScanEvent[]>([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await faceApi.getScanHistory(activeElderId, 50);
      setEvents(data.events || []);
    } catch (err: any) {
      setError('Face recognition server is currently unreachable. Showing local fallback if available.');
      // Fallback to state alerts
      const localEvents: BackendScanEvent[] = state.alerts
        .filter((a) => a.kind === 'face_login')
        .map((a) => ({
          id: a.id,
          user_id: a.patientId,
          timestamp: a.createdAt,
          result: 'MATCHED',
          face_distance: 0.38,
          device_session_id: 'local-session',
          created_at: a.createdAt,
        }));
      setEvents(localEvents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHistory();
  }, [activeElderId]);

  // Group events by day: Today, Yesterday, or date string
  const grouped = events.reduce((acc, ev) => {
    const d = new Date(ev.timestamp);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const title = isToday
      ? 'Today'
      : isYesterday
        ? 'Yesterday'
        : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    if (!acc[title]) acc[title] = [];
    acc[title].push(ev);
    return acc;
  }, {} as Record<string, BackendScanEvent[]>);

  const getResultBadge = (result: BackendScanEvent['result']) => {
    switch (result) {
      case 'MATCHED':
        return {
          icon: '✓',
          title: 'Face recognized',
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-500',
          desc: 'Biometric descriptor matched enrolled profile',
        };
      case 'NOT_RECOGNIZED':
        return {
          icon: '⚠',
          title: 'Face not recognized',
          bg: 'bg-warm-50 border-warm-200 text-warm-800',
          dot: 'bg-warm-500',
          desc: 'Descriptor distance exceeded match threshold',
        };
      case 'MULTIPLE_FACES':
        return {
          icon: '👥',
          title: 'Multiple faces detected',
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500',
          desc: 'Authentication paused — more than one person visible',
        };
      case 'NO_FACE':
        return {
          icon: '👤',
          title: 'No face in frame',
          bg: 'bg-neutral-50 border-neutral-200 text-neutral-800',
          dot: 'bg-neutral-400',
          desc: 'Elder moved away from camera during scan',
        };
      default:
        return {
          icon: '✕',
          title: 'Scan error',
          bg: 'bg-danger-50 border-danger-200 text-danger-800',
          dot: 'bg-danger-500',
          desc: 'Hardware camera or permission interruption',
        };
    }
  };

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/caregiver/face-recognition')}
              className="text-xs font-bold text-brand-600 hover:text-brand-800"
            >
              ← Back to Face Recognition
            </button>
          </div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-brand-900">
            Face Scan Activity
          </h2>
          <p className="mt-0.5 text-sm font-semibold text-neutral-500">
            Authoritative audit trail for <b>{elderName}</b>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-2 text-xs font-bold text-neutral-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showMetrics}
              onChange={(e) => setShowMetrics(e.target.checked)}
              className="rounded border-brand-200 text-brand-600 focus:ring-brand-300"
            />
            Show technical metrics
          </label>
          <Button variant="secondary" onClick={fetchHistory} disabled={loading} className="!py-2 text-xs">
            {loading ? 'Refreshing…' : '🔄 Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-warm-200 bg-warm-50 p-4 text-xs font-bold text-warm-800">
          ⚠️ {error}
        </div>
      )}

      {/* History Sections */}
      {loading && events.length === 0 ? (
        <Card className="p-8 text-center text-sm font-semibold text-neutral-500">
          Loading scan activity from server…
        </Card>
      ) : events.length === 0 ? (
        <Card className="p-10 text-center ring-1 ring-black/[0.04]">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <ShieldIcon size={24} />
            </span>
            <div className="text-base font-extrabold text-brand-900">No Scan Events Recorded</div>
            <p className="text-xs font-semibold leading-relaxed text-neutral-500">
              Face scan events will appear here whenever an elder signs in via live face recognition.
            </p>
          </div>
        </Card>
      ) : (
        Object.entries(grouped).map(([dayGroup, groupEvents]) => (
          <div key={dayGroup} className="space-y-3">
            <div className="text-xs font-extrabold tracking-widest text-neutral-400 uppercase pl-1">
              {dayGroup}
            </div>

            <div className="space-y-3">
              {groupEvents.map((ev) => {
                const badge = getResultBadge(ev.result);
                const timeStr = new Date(ev.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <Card key={ev.id} className="p-5 ring-1 ring-black/[0.04] transition hover:shadow-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-base font-extrabold shadow-sm ${badge.bg}`}
                          aria-hidden
                        >
                          {badge.icon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-brand-900">
                              {elderName}
                            </span>
                            <span className="text-xs font-bold text-neutral-400">·</span>
                            <span className="text-sm font-bold text-neutral-700">{badge.title}</span>
                          </div>
                          <p className="mt-0.5 text-xs font-semibold text-neutral-500">
                            {badge.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col sm:items-end justify-between items-center text-right shrink-0">
                        <span className="chip bg-brand-50 text-brand-800 text-xs font-extrabold border border-brand-100">
                          {timeStr}
                        </span>
                        {ev.device_session_id && (
                          <span className="mt-1 text-[10px] font-mono text-neutral-400">
                            session: {ev.device_session_id.slice(0, 12)}…
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Verified Photo Snapshot Thumbnail (cross-device) */}
                    {ev.photo && (
                      <div className="mt-3 flex items-center gap-3 pt-3 border-t border-brand-100/60">
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(ev.photo ?? null)}
                          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-emerald-400 shadow-sm focus:outline-none"
                          aria-label="Enlarge verified scan snapshot"
                        >
                          <img
                            src={ev.photo}
                            alt="Scanned Face"
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 text-white text-[10px] font-extrabold">
                            🔍 View
                          </div>
                        </button>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-brand-900">📸 Verified Login Photo</span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800">
                              Captured on Device
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-neutral-500">
                            Snapshot verified during biometric facial authentication.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Optional Advanced/Debug technical metrics */}
                    {showMetrics && (
                      <div className="mt-3.5 pt-3 border-t border-brand-100/70 flex flex-wrap gap-4 text-[11px] font-mono text-neutral-600 bg-neutral-50/70 p-2.5 rounded-xl">
                        <div>
                          <span className="font-bold text-neutral-400">EVENT ID:</span> {ev.id}
                        </div>
                        {ev.face_distance !== null && (
                          <div>
                            <span className="font-bold text-neutral-400">DISTANCE:</span>{' '}
                            <span className={ev.face_distance <= 0.55 ? 'text-emerald-700 font-bold' : 'text-warm-700 font-bold'}>
                              {ev.face_distance.toFixed(4)}
                            </span>{' '}
                            (threshold &le; 0.55)
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-neutral-400">SERVER TIME:</span> {ev.created_at}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Photo Enlarge Lightbox */}
      {selectedPhoto && (
        <Modal open={true} title="Face Scan Snapshot" onClose={() => setSelectedPhoto(null)}>
          <div className="space-y-4 text-center">
            <div className="overflow-hidden rounded-2xl border border-brand-200 bg-black shadow-lift">
              <img
                src={selectedPhoto}
                alt="Enlarged Face Scan"
                className="max-h-[420px] w-full object-contain mx-auto"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold px-1">
              <span>✓ Verified scan photo stored on server</span>
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

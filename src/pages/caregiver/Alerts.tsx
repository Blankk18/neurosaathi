import { useMemo, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { Card, Button, Disclaimer, Chip, SectionTitle, Modal } from '@/components/ui';
import { evaluateAttentionIndicator, simulateDecline } from '@/engine/alerts';
import { AlertIcon, BellIcon, ShieldIcon, InfoIcon, EyeIcon } from '@/components/Icons';

export default function Alerts() {
  const { t, state, dispatch } = useApp();
  const [triggered, setTriggered] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // live evaluation from the current stored trend (no single-score alarm)
  const live = useMemo(
    () => evaluateAttentionIndicator(state.gameResults, state.reminders),
    [state.gameResults, state.reminders],
  );

  const simulate = () => {
    const decline = simulateDecline();
    const evalResult = evaluateAttentionIndicator([...state.gameResults, ...decline], state.reminders);
    dispatch({ type: 'ADD_RESULTS', results: decline });
    if (evalResult.alert) dispatch({ type: 'ADD_ALERT', alert: evalResult.alert });
    setTriggered(true);
  };

  const alerts = state.alerts;
  const visible = alerts.filter((a) => a.severity === 'attention').slice(0, 8);

  return (
    <div className="mx-auto max-w-[780px] space-y-5 fade-in">
      {/* non-diagnostic reassurance — must stay verbatim */}
      <Disclaimer>{t('cg.attention.notdiagnosis')}</Disclaimer>

      {/* header: title + calm explainer + simulate control */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight text-brand-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-600 shadow-card ring-1 ring-black/[0.04]">
              <BellIcon size={18} />
            </span>
            {t('cg.alerts')}
          </h2>
          <p className="mt-1 max-w-[520px] text-sm font-semibold leading-relaxed text-neutral-500">
            Quiet, multi-signal monitoring. A gentle prompt to check in — never a diagnosis.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-bold tracking-wide text-neutral-500 shadow-card ring-1 ring-black/[0.04] sm:inline-flex">
            <span className={`h-2 w-2 rounded-full ${live.triggered ? 'bg-warm-400' : 'bg-brand-400'} `} aria-hidden />
            {live.triggered ? t('cg.alerts.signals', { n: live.reasons.length }) : t('cg.alerts.monitoring')}
          </span>
          <Button onClick={simulate} variant="secondary" size="md" className="!py-3 !text-[14px] shadow-card">
            {t('cg.simulate.trend')}
          </Button>
        </div>
      </div>

      {/* live signal window — summary signal at the top */}
      <Card className="relative overflow-hidden p-0 ring-1 ring-black/[0.04]">
        <div className={`absolute inset-y-0 left-0 w-[4px] ${live.triggered ? 'bg-warm-300' : 'bg-brand-200'}`} aria-hidden />
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                live.triggered ? 'bg-warm-50 text-warm-600 ring-warm-200' : 'bg-brand-50 text-brand-600 ring-brand-100'
              }`}
            >
              {live.triggered ? <AlertIcon size={20} /> : <ShieldIcon size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[15px] font-extrabold tracking-tight text-brand-900">
                  {live.triggered ? t('cg.attention.title') : t('cg.noAlerts')}
                </div>
                {/* status chip — warm amber for attention, calm sage when monitoring */}
                <Chip tone={live.triggered ? 'warm' : 'brand'}>
                  {live.triggered ? t('cg.alerts.signals', { n: live.reasons.length }) : t('cg.alerts.monitoring')}
                </Chip>
              </div>
              <p className="mt-1.5 max-w-[640px] text-[13.5px] font-semibold leading-relaxed text-neutral-600">
                {live.triggered ? live.alert?.message : t('cg.alerts.live.off')}
              </p>
              {!live.triggered && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
                  <EyeIcon size={14} /> Monitoring in the background
                </p>
              )}
            </div>
          </div>

          {live.triggered && live.reasons.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-neutral-400">
                <InfoIcon size={14} /> {t('cg.attention.why')}
              </div>
              <div className="flex flex-wrap gap-2">
                {live.reasons.map((r, i) => (
                  <Chip key={i} tone="warm">
                    {r}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* simulated trend feedback — appears after Simulate Trend */}
      {triggered && (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-warm-50 to-white p-0 shadow-card ring-1 ring-warm-200/60">
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-warm-500 shadow-sm ring-1 ring-warm-200" aria-hidden>
                <AlertIcon size={18} />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold tracking-tight text-warm-600">{t('cg.triggered')}</div>
                <p className="mt-0.5 text-sm font-semibold leading-relaxed text-brand-800">{t('cg.checkin')}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
              <div className="flex items-center gap-1.5 text-sm font-extrabold text-brand-900">
                <InfoIcon size={14} /> {t('cg.attention.why')}
              </div>
              <ul className="mt-2 space-y-1.5">
                {live.reasons.length
                  ? live.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-brand-800">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warm-400" aria-hidden />
                        <span>{r}</span>
                      </li>
                    ))
                  : [
                      t('cg.reason.accDecrease'),
                      t('cg.reason.rt'),
                      t('cg.reason.skipped'),
                    ].map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-brand-800">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warm-400" aria-hidden />
                        <span>{r}</span>
                      </li>
                    ))}
              </ul>
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold tracking-wide text-neutral-500">
              <span className="h-1.5 w-1.5 rounded-full bg-warm-300" aria-hidden />
              {t('cg.alerts.simulated')}
            </p>
          </div>
        </Card>
      )}

      {/* history list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle icon="🕒">Attention history</SectionTitle>
          <span className="text-xs font-bold tracking-wide text-neutral-400">
            {visible.length ? `${visible.length} ${visible.length === 1 ? 'item' : 'items'}` : 'no history yet'}
          </span>
        </div>

        {visible.length === 0 && !triggered && (
          <Card className="py-10 text-center ring-1 ring-black/[0.04]">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                <ShieldIcon size={18} />
              </span>
              <p className="text-sm font-semibold leading-relaxed text-neutral-500">{t('cg.alerts.none')}</p>
            </div>
          </Card>
        )}

        {visible.map((a) => (
          <Card key={a.id} className={`p-5 ring-1 ring-black/[0.04] transition ${a.read ? 'opacity-60' : 'shadow-card hover:shadow-lift'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warm-50 text-warm-600 ring-1 ring-warm-200" aria-hidden>
                  <AlertIcon size={16} />
                </span>
                <div className="min-w-0">
                  <div className="text-[15px] font-extrabold leading-tight tracking-tight text-brand-900">{a.title}</div>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-neutral-600">{a.message}</p>
                </div>
              </div>
              <Chip tone={a.read ? 'neutral' : 'warm'}>{a.read ? t('cg.alerts.read') : t('cg.alerts.new')}</Chip>
            </div>

            {a.reasons.length > 0 && (
              <div className="mt-4 rounded-2xl bg-canvas px-4 py-3.5 ring-1 ring-black/[0.04]">
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-neutral-400">
                  <InfoIcon size={12} /> {t('cg.attention.why')}
                </div>
                <ul className="mt-2 space-y-1">
                  {a.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-brand-800">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warm-400" aria-hidden />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {a.photo && (
              <div className="mt-4 flex flex-col sm:flex-row items-start gap-3.5 rounded-2xl bg-canvas p-3 ring-1 ring-black/[0.05]">
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(a.photo ?? null)}
                  className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-brand-200 shadow-sm focus:outline-none"
                  aria-label="Enlarge captured face photo"
                >
                  <img
                    src={a.photo}
                    alt="Scanned Face"
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 text-white text-xs font-bold">
                    🔍 View
                  </div>
                </button>
                <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Verified Face Login Snapshot
                  </span>
                  <p className="text-xs font-semibold leading-relaxed text-neutral-600">
                    Photo captured during live face scan authentication. Confirmed match on local device.
                  </p>
                  <div className="text-[11px] font-mono text-neutral-400">
                    Captured: {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              </div>
            )}

            {!a.read && (
              <button
                onClick={() => dispatch({ type: 'MARK_ALERT_READ', id: a.id })}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-800 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
              >
                {t('cg.alerts.reviewed')}
              </button>
            )}
          </Card>
        ))}
      </div>

      {/* Photo Enlarge Lightbox */}
      <Modal
        open={Boolean(selectedPhoto)}
        onClose={() => setSelectedPhoto(null)}
        title="📸 Scanned Face Snapshot"
      >
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-brand-100 bg-neutral-900 shadow-lift">
            {selectedPhoto && (
              <img
                src={selectedPhoto}
                alt="Enlarged Face Capture"
                className="h-auto max-h-[380px] w-full object-contain mx-auto"
              />
            )}
          </div>
          <div className="rounded-xl bg-brand-50 p-3 text-center text-xs font-bold text-brand-800">
            Biometric verification record · Preserved securely for caregiver confirmation
          </div>
          <Button variant="secondary" onClick={() => setSelectedPhoto(null)} className="w-full">
            {t('common.close')}
          </Button>
        </div>
      </Modal>

      <p className="pb-1 text-center text-xs font-semibold leading-relaxed text-neutral-400">
        Alerts are generated only when multiple signals move together over days — never from a single score.
      </p>
    </div>
  );
}

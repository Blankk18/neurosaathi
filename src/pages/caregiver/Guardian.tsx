import { useEffect, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { Card, Button, Chip, SectionTitle, Modal, Toggle, EmptyState } from '@/components/ui';
import MapView from '@/components/MapView';
import { SIM_MOVES } from '@/services/guardianSimulator';
import { riskMeta, haversineM, fmtLat, fmtLng, fmtAccuracy, fmtDistanceM } from '@/engine/guardian';
import { uid } from '@/data/demoData';
import type { SafeLocation, EmergencyContact, RiskLevel } from '@/types';

// ============================================================================
// NEUROSAATHI GUARDIAN — caregiver live location + safety dashboard.
//
// Everything here is the caregiver's view. The risk posture is a *location
// heuristic* for awareness; it never diagnoses and never claims someone is
// "lost". The caregiver always makes the final call. Demo/simulated fixes are
// always labelled "Demo / Simulated location".
// ============================================================================

function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

/** Solid banner coloured by the current risk posture. */
function RiskBanner({ status, search, ageLabel }: { status: RiskLevel; search: boolean; ageLabel: string }) {
  const { t } = useApp();
  const meta = riskMeta(status);
  const tones: Record<RiskLevel, string> = {
    safe: 'from-brand-600 to-brand-700 text-white',
    attention: 'from-warm-400 to-warm-500 text-white',
    unusual: 'from-accent-400 to-accent-500 text-white',
    high: 'from-danger-500 to-danger-600 text-white',
  };
  return (
    <div className={`rounded-3xl bg-gradient-to-br p-5 shadow-lift ${tones[status]}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl ring-1 ring-white/20">{meta.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight">{t(meta.labelKey)}</span>
            {search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-extrabold tracking-wide">
                🔴 {t('guardian.search.active')}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-sm font-semibold text-white/85">{t(meta.descKey)}</div>
        </div>
        <div className="shrink-0 text-right text-sm font-bold text-white/90">{ageLabel}</div>
      </div>
    </div>
  );
}

// ---- Safe-location modal form ----

interface ZoneFormState { name: string; radiusM: number; }

function ZoneModal({
  open,
  editing,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  editing: boolean;
  onClose: () => void;
  onSave: (data: ZoneFormState) => void;
  initial: ZoneFormState;
}) {
  const { t } = useApp();
  const [form, setForm] = useState<ZoneFormState>(initial);
  return (
    <Modal open={open} onClose={onClose} title={editing ? t('guardian.safePlaces') : t('guardian.safePlaces.add')}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-extrabold text-brand-700">{t('cg.name.label')}</span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-2xl border border-brand-100 bg-canvas px-4 py-3 text-lg font-bold text-brand-900 outline-none focus:border-brand-400"
            placeholder={t('guardian.safePlaces.add')}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-extrabold text-brand-700">{t('guardian.homeZone.radius')} (m)</span>
          <input
            type="number"
            value={form.radiusM}
            min={30}
            max={2000}
            onChange={(e) => setForm({ ...form, radiusM: Number(e.target.value) })}
            className="w-full rounded-2xl border border-brand-100 bg-canvas px-4 py-3 text-lg font-bold text-brand-900 outline-none focus:border-brand-400"
          />
        </label>
        <Button
          variant="primary"
          disabled={form.name.trim().length < 2}
          onClick={() => onSave(form)}
          className="w-full rounded-full"
        >
          {t('cg.save')}
        </Button>
      </div>
    </Modal>
  );
}

// ---- Emergency-contact modal form ----

interface ContactFormState { name: string; relationship: string; phone: string; email: string; }

function ContactModal({
  open,
  editing,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  editing: boolean;
  onClose: () => void;
  onSave: (data: ContactFormState) => void;
  initial: ContactFormState;
}) {
  const { t } = useApp();
  const [form, setForm] = useState<ContactFormState>(initial);
  return (
    <Modal open={open} onClose={onClose} title={editing ? t('guardian.emergency.edit') : t('guardian.emergency.add')}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-extrabold text-brand-700">{t('cg.name.label')}</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-2xl border border-brand-100 bg-canvas px-4 py-3 text-lg font-bold text-brand-900 outline-none focus:border-brand-400" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-extrabold text-brand-700">{t('cg.relationship.label')}</span>
          <input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="w-full rounded-2xl border border-brand-100 bg-canvas px-4 py-3 text-lg font-bold text-brand-900 outline-none focus:border-brand-400" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-extrabold text-brand-700">📞 {t('cg.phone.label')}</span>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-2xl border border-brand-100 bg-canvas px-4 py-3 text-lg font-bold text-brand-900 outline-none focus:border-brand-400" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-extrabold text-brand-700">{t('cg.email.label')}</span>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-2xl border border-brand-100 bg-canvas px-4 py-3 text-lg font-bold text-brand-900 outline-none focus:border-brand-400" />
        </label>
        <Button
          variant="primary"
          disabled={form.name.trim().length < 2}
          onClick={() => onSave(form)}
          className="w-full rounded-full"
        >
          {t('cg.save')}
        </Button>
      </div>
    </Modal>
  );
}

export default function Guardian() {
  const { t, state, dispatch, guardianStart, guardianStop, guardianSimulate, toggleSearchMode, triggerAlarm, resolveAlarm } = useApp();
  const g = state.guardian;
  const [now, setNow] = useState(Date.now());
  // refresh "ago" labels every 15s
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const [zoneModal, setZoneModal] = useState<{ open: boolean; editing: boolean; target: SafeLocation | null }>({ open: false, editing: false, target: null });
  const [contactModal, setContactModal] = useState<{ open: boolean; editing: boolean; target: EmergencyContact | null }>({ open: false, editing: false, target: null });
  const [showHome, setShowHome] = useState(false);

  const meta = riskMeta(g.status);
  const cur = g.current;
  const lastAgo = cur ? ago(cur.timestamp, now) : '–';
  const distHome = cur && g.home ? haversineM(cur, g.home) : null;
  const nearestZone = cur
    ? [...g.safeLocations].sort((a, b) => haversineM(cur, a) - haversineM(cur, b))[0]
    : null;

  const simMoves = SIM_MOVES;

  const saveZone = (data: ZoneFormState) => {
    const target = zoneModal.target;
    const base = target ?? ({ id: uid('guard-zone'), name: '', type: 'other', lat: g.current?.lat ?? g.home?.lat ?? 0, lng: g.current?.lng ?? g.home?.lng ?? 0, radiusM: 100 });
    const location: SafeLocation = { ...base, name: data.name, radiusM: data.radiusM };
    if (zoneModal.editing) dispatch({ type: 'UPDATE_SAFE_LOCATION', location });
    else dispatch({ type: 'ADD_SAFE_LOCATION', location });
    setZoneModal({ open: false, editing: false, target: null });
  };

  const saveContact = (data: ContactFormState) => {
    const target = contactModal.target;
    const base = target ?? ({ id: uid('guard-contact'), name: '', relationship: '', phone: '' });
    const contact: EmergencyContact = { ...base, ...data };
    if (contactModal.editing) dispatch({ type: 'UPDATE_CONTACT', contact });
    else dispatch({ type: 'ADD_CONTACT', contact });
    setContactModal({ open: false, editing: false, target: null });
  };

  return (
    <div className="fade-in space-y-6">
      {/* risk banner */}
      <RiskBanner status={g.status} search={g.searchMode} ageLabel={`${t('guardian.lastUpdate', { ago: lastAgo })}`} />
      <p className="-mt-3 text-sm font-semibold text-neutral-500">{t('guardian.subtitle')}</p>

      {/* live vs simulated honesty chip */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={g.simulated ? 'warm' : 'brand'}>
          {g.simulated ? `🧪 ${t('guardian.simulated.label')}` : `📍 ${t('guardian.real.label')}`}
        </Chip>
        <Chip tone={g.accessDenied ? 'danger' : 'neutral'}>{t('guardian.updateModes')}</Chip>
      </div>

      {/* map + snapshot */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden border-brand-100 p-0 lg:col-span-2">
          <MapView
            home={g.home}
            safeLocations={g.safeLocations}
            current={g.current}
            trail={g.trail}
            className="border-0 shadow-none"
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="text-lg font-extrabold text-brand-900">📍 {t('guardian.currentLocation')}</div>
          {g.current ? (
            <>
              <div className="flex items-center gap-3">
                <span className={`h-3.5 w-3.5 rounded-full ${meta.dot}`} />
                <span className="text-xl font-extrabold text-brand-900">{t(meta.labelKey)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-canvas p-3">
                  <div className="text-xs font-bold text-neutral-500">{t('guardian.accuracy')}</div>
                  <div className="text-lg font-extrabold text-brand-900">{fmtAccuracy(g.current.accuracyM)}</div>
                </div>
                <div className="rounded-2xl bg-canvas p-3">
                  <div className="text-xs font-bold text-neutral-500">{t('guardian.distanceHome')}</div>
                  <div className="text-lg font-extrabold text-brand-900">{distHome === null ? '–' : fmtDistanceM(distHome)}</div>
                </div>
                <div className="col-span-2 rounded-2xl bg-canvas p-3">
                  <div className="text-xs font-bold text-neutral-500">{t('guardian.coords')}</div>
                  <div className="font-mono font-bold text-brand-900">{fmtLat(g.current.lat)}, {fmtLng(g.current.lng)}</div>
                </div>
                <div className="col-span-2 rounded-2xl bg-canvas p-3">
                  <div className="text-xs font-bold text-neutral-500">{t('guardian.nearest')}</div>
                  <div className="font-bold text-brand-900">{nearestZone ? nearestZone.name : t('guardian.zone.none')}</div>
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon="📍" title={t('guardian.noFix')} body={t('guardian.subtitle')} />
          )}
        </Card>
      </div>

      {/* update source + demo simulator */}
      <SectionTitle icon="🕹️">{t('guardian.updateModes')}</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="tinted">
          <div className="mb-3 text-lg font-extrabold text-brand-900">📍 {t('guardian.live')}</div>
          {g.tracking && !g.accessDenied ? (
            <Button variant="secondary" onClick={guardianStop} className="w-full rounded-full">⏸ {t('guardian.access.stop')}</Button>
          ) : g.accessDenied ? (
            <div className="space-y-2">
              <P text={t('guardian.access.denied')} />
              <Button variant="primary" onClick={guardianStart} className="w-full rounded-full">🔓 {t('guardian.access.grant')}</Button>
            </div>
          ) : (
            <Button variant="primary" onClick={guardianStart} className="w-full rounded-full">📡 {t('guardian.live')}</Button>
          )}
          <P text={t('guardian.access.explain')} subtle />
        </Card>

        <Card className="tinted">
          <div className="mb-3 text-lg font-extrabold text-brand-900">🧪 {t('guardian.sim.title')}</div>
          <p className="mb-3 text-sm font-semibold text-neutral-500">{t('guardian.sim.desc')}</p>
          <div className="flex flex-wrap gap-2">
            {simMoves.map((m) => (
              <button
                key={m.id}
                onClick={() => guardianSimulate(m.id)}
                className="rounded-full bg-white px-4 py-2.5 text-base font-bold text-brand-800 shadow-card ring-1 ring-brand-100 hover:bg-brand-50"
              >
                {m.icon} {t(m.labelKey)}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* search mode + alarm */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="tinted">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="text-lg font-extrabold text-brand-900">🔴 {t('guardian.search')}</div>
              <P text={t('guardian.search.desc')} subtle />
            </div>
            <Toggle checked={g.searchMode} onChange={toggleSearchMode} label={g.searchMode ? t('guardian.search.stop') : t('guardian.search.start')} />
          </div>
          {g.searchMode && <div className="mt-2 rounded-2xl bg-danger-50 px-4 py-2.5 text-sm font-bold text-danger-600">{t('guardian.search.help')}</div>}
        </Card>

        <Card className="tinted">
          <div className="text-lg font-extrabold text-brand-900">🚨 {t('guardian.alarm')}</div>
          <div className="mt-3">
            {!g.alarmActive ? (
              <Button variant="danger" onClick={triggerAlarm} className="w-full rounded-full">🚨 {t('guardian.alarm.trigger')}</Button>
            ) : (
              <Button variant="secondary" onClick={resolveAlarm} className="w-full rounded-full">⏹ {t('guardian.alarm.stop')}</Button>
            )}
          </div>
          <P text={t('guardian.alarm.note')} subtle />
        </Card>
      </div>

      {/* home geofence */}
      <SectionTitle icon="🏠">{t('guardian.homeZone')}</SectionTitle>
      <Card className="tinted">
        {g.home ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl">🏠</span>
            <div className="flex-1">
              <div className="font-extrabold text-brand-900">{t('guardian.homeZone')}</div>
              <div className="text-sm font-semibold text-neutral-500">{g.home.name} · {t('guardian.homeZone.radiusM', { r: g.home.radiusM })}</div>
            </div>
            <Button variant="ghost" size="md" onClick={() => setShowHome(true)}>{t('guardian.homeZone.configure')}</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <P text={t('guardian.homeZone.configure')} />
            <Button variant="primary" onClick={() => setShowHome(true)} className="w-full rounded-full">🏠 {t('guardian.homeZone.configure')}</Button>
          </div>
        )}
      </Card>

      {/* safe places */}
      <SectionTitle icon="📍">{t('guardian.safePlaces')}</SectionTitle>
      <div className="space-y-2">
        {g.safeLocations.filter((z) => z.id !== g.home?.id).map((z) => (
          <Card key={z.id} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warm-50 text-xl ring-1 ring-warm-100">📍</span>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-brand-900">{z.name}</div>
              <div className="text-sm font-semibold text-neutral-500">{t('guardian.homeZone.radiusM', { r: z.radiusM })}</div>
            </div>
            <button
              aria-label={`Edit ${z.name}`}
              onClick={() => setZoneModal({ open: true, editing: true, target: z })}
              className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-700 hover:bg-brand-100"
            >
              ✎
            </button>
            <button
              aria-label={`Remove ${z.name}`}
              onClick={() => dispatch({ type: 'REMOVE_SAFE_LOCATION', id: z.id })}
              className="rounded-full bg-danger-50 px-3 py-1.5 text-sm font-bold text-danger-600 hover:bg-danger-100"
            >
              ✕
            </button>
          </Card>
        ))}
        {g.safeLocations.filter((z) => z.id !== g.home?.id).length === 0 && (
          <EmptyState icon="📍" title={t('guardian.safePlaces.empty')} />
        )}
        <Button variant="secondary" onClick={() => setZoneModal({ open: true, editing: false, target: null })} className="w-full rounded-full">
          ＋ {t('guardian.safePlaces.add')}
        </Button>
      </div>

      {/* emergency contacts */}
      <SectionTitle icon="🆘">{t('guardian.emergency')}</SectionTitle>
      <div className="space-y-2">
        {state.emergencyContacts.map((c) => (
          <Card key={c.id} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-xl ring-1 ring-accent-100">👤</span>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-brand-900">{c.name}</div>
              <div className="text-sm font-semibold text-neutral-500">{c.relationship} · {c.phone}</div>
            </div>
            {c.phone && (
              <a href={`tel:${c.phone.replace(/[^+\d]/g, '')}`} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800">
                📞 {t('guardian.emergency.call')}
              </a>
            )}
            <button
              aria-label={`Edit ${c.name}`}
              onClick={() => setContactModal({ open: true, editing: true, target: c })}
              className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-700 hover:bg-brand-100"
            >
              ✎
            </button>
            <button
              aria-label={`Remove ${c.name}`}
              onClick={() => dispatch({ type: 'REMOVE_CONTACT', id: c.id })}
              className="rounded-full bg-danger-50 px-3 py-1.5 text-sm font-bold text-danger-600 hover:bg-danger-100"
            >
              ✕
            </button>
          </Card>
        ))}
        {state.emergencyContacts.length === 0 && <EmptyState icon="🆘" title={t('guardian.emergency.empty')} />}
        <Button variant="secondary" onClick={() => setContactModal({ open: true, editing: false, target: null })} className="w-full rounded-full">
          ＋ {t('guardian.emergency.add')}
        </Button>
      </div>

      {/* home config modal */}
      <Modal open={showHome} onClose={() => setShowHome(false)} title={`🏠 ${t('guardian.homeZone')}`}>
        <div className="space-y-4">
          <p className="text-sm font-semibold text-neutral-500">{t('guardian.homeZone.configure')}</p>
          <div className="grid grid-cols-2 gap-3">
            {g.current && (
              <Button variant="primary" onClick={() => {
                dispatch({ type: 'CONFIGURE_HOME', location: { id: g.home?.id ?? 'guard-home', name: 'Home', type: 'home', lat: g.current!.lat, lng: g.current!.lng, radiusM: g.home?.radiusM ?? 120 } });
                setShowHome(false);
              }} className="rounded-full">
                📍 {t('guardian.homeZone.useCurrent')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setShowHome(false)}>{t('common.cancel')}</Button>
          </div>
        </div>
      </Modal>

      {/* zone + contact modals */}
      <ZoneModal
        open={zoneModal.open}
        editing={zoneModal.editing}
        onClose={() => setZoneModal({ open: false, editing: false, target: null })}
        onSave={saveZone}
        initial={{ name: zoneModal.target?.name ?? '', radiusM: zoneModal.target?.radiusM ?? 100 }}
      />
      <ContactModal
        open={contactModal.open}
        editing={contactModal.editing}
        onClose={() => setContactModal({ open: false, editing: false, target: null })}
        onSave={saveContact}
        initial={{ name: contactModal.target?.name ?? '', relationship: contactModal.target?.relationship ?? '', phone: contactModal.target?.phone ?? '', email: contactModal.target?.email ?? '' }}
      />
    </div>
  );
}

// tiny text helper with the app's secondary style
function P({ text, subtle }: { text: string; subtle?: boolean }) {
  return <p className={`text-sm font-semibold ${subtle ? 'text-neutral-500' : 'text-brand-800'}`}>{text}</p>;
}
import { useApp } from '@/state/AppContext';
import { Card, Button, Chip, Disclaimer } from '@/components/ui';
import { riskMeta, haversineM, fmtAccuracy, fmtDistanceM } from '@/engine/guardian';

// ============================================================================
// NEUROSAATHI GUARDIAN — the elder's own safety view.
//
// Elder-friendly big controls. It shows the elder's current safety posture in
// reassuring, plain language and a single giant "I need help" call button. It
// never surprises: location is shared only with the caregiver's consent flow,
// and simulated demo fixes are always labelled as such.
// ============================================================================

export default function Safety() {
  const { t, state, triggerAlarm } = useApp();
  const g = state.guardian;
  const meta = riskMeta(g.status);

  const firstContact = state.emergencyContacts[0];

  // Reassuring copy per status — calm, never scary, never diagnostic.
  const msgKey =
    g.status === 'safe'
      ? 'safety.allGood'
      : g.status === 'attention'
        ? 'safety.attention.msg'
        : g.status === 'unusual'
          ? 'safety.unusual.msg'
          : 'safety.high.msg';

  const tones: Record<string, string> = {
    safe: 'from-brand-50 to-white border-brand-100',
    attention: 'from-warm-50 to-white border-warm-100',
    unusual: 'from-accent-50 to-white border-accent-100',
    high: 'from-danger-50 to-white border-danger-100',
  };

  const distHome =
    g.current && g.home ? fmtDistanceM(haversineM(g.current, g.home)) : null;

  return (
    <div className="fade-in space-y-5 pt-2">
      {/* status card */}
      <div className={`rounded-3xl border p-5 ${tones[g.status]}`}>
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-card ring-1 ring-brand-100">
            {meta.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-extrabold text-brand-900">{t(meta.labelKey)}</div>
            <div className="text-base font-semibold text-neutral-600">{t(msgKey)}</div>
          </div>
        </div>
        {g.current && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="brand">📍 {t('guardian.accuracy', { acc: fmtAccuracy(g.current.accuracyM) })}</Chip>
            {distHome && <Chip tone="brand">🏠 {t('guardian.distanceHome')}: {distHome}</Chip>}
            {g.simulated && <Chip tone="warm">🧪 {t('safety.simulated')}</Chip>}
          </div>
        )}
      </div>

      {g.simulated && (
        <div className="rounded-2xl bg-warm-50 px-4 py-3 text-sm font-bold text-warm-700 ring-1 ring-warm-100">
          🧪 {t('safety.demoNote')}
        </div>
      )}

      {/* monitoring + big help button */}
      <Card className="flex flex-col items-center gap-4 p-5 text-center">
        <div className="flex items-center gap-2 text-lg font-extrabold text-brand-900">
          <span className="pulse-soft">🛟</span> {t('safety.monitoring')}
        </div>
        <p className="max-w-sm text-base font-semibold leading-relaxed text-neutral-600">{t('safety.locationShown')}</p>

        {firstContact ? (
          <a
            href={`tel:${firstContact.phone.replace(/[^+\d]/g, '')}`}
            className="btn-huge mt-1 w-full shadow-lift"
          >
            🆘 {t('safety.call', { name: firstContact.name })}
          </a>
        ) : (
          <Button variant="huge" className="w-full" onClick={() => triggerAlarm()}>
            🆘 {t('safety.needHelp')}
          </Button>
        )}

        <p className="text-center text-sm font-semibold text-neutral-500">{t('safety.on')}</p>
      </Card>

      <Disclaimer>{t('cg.insight.label')}</Disclaimer>
    </div>
  );
}
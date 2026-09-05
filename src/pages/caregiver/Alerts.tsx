import { useMemo, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { Card, Button, Disclaimer, Chip } from '@/components/ui';
import { evaluateAttentionIndicator, simulateDecline } from '@/engine/alerts';

export default function Alerts() {
  const { t, state, dispatch } = useApp();
  const [triggered, setTriggered] = useState(false);

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
    <div>
      <div className="mb-3">
        <Disclaimer>{t('cg.attention.notdiagnosis')}</Disclaimer>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-xl font-extrabold text-brand-900">🔔 {t('cg.alerts')}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-neutral-500">
            {live.triggered ? t('cg.alerts.signals', { n: live.reasons.length }) : t('cg.alerts.monitoring')}
          </span>
          <Button onClick={simulate} variant="secondary" size="md" className="!py-3">
            ⚙️ {t('cg.simulate.trend')}
          </Button>
        </div>
      </div>

      {triggered && (
        <Card className="mt-4 border-2 border-accent-300 bg-accent-50">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden>⚠️</span>
            <div>
              <div className="text-xl font-extrabold text-accent-400">{t('cg.triggered')}</div>
              <p className="font-semibold text-brand-800">{t('cg.checkin')}</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-white p-4">
            <div className="font-extrabold text-brand-900">{t('cg.attention.why')}</div>
            <ul className="mt-2 list-inside space-y-1 text-base">
              {live.reasons.length
                ? live.reasons.map((r, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-accent-400">•</span> {r}
                    </li>
                  ))
                : [
                    t('cg.reason.accDecrease'),
                    t('cg.reason.rt'),
                    t('cg.reason.skipped'),
                  ].map((r, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-accent-400">•</span> {r}
                    </li>
                  ))}
            </ul>
          </div>
          <p className="mt-3 text-sm font-bold text-brand-700">
            {t('cg.alerts.simulated')}
          </p>
        </Card>
      )}

      <div className="mt-4 space-y-3">
        {/* live window indicator */}
        <Card className="border-l-4 border-l-brand-400">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{live.triggered ? '🟠' : '🟢'}</span>
            <div>
              <div className="text-lg font-extrabold text-brand-900">
                {live.triggered ? t('cg.attention.title') : t('cg.noAlerts')}
              </div>
              <p className="text-sm font-semibold text-neutral-600">
                {live.triggered ? live.alert?.message : t('cg.alerts.live.off')}
              </p>
            </div>
          </div>
          {live.triggered && live.reasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {live.reasons.map((r, i) => (
                <Chip key={i} tone="warm">{r}</Chip>
              ))}
            </div>
          )}
        </Card>

        {visible.length === 0 && !triggered && (
          <Card className="text-center text-neutral-500">{t('cg.alerts.none')}</Card>
        )}

        {visible.map((a) => (
          <Card key={a.id} className={a.read ? 'opacity-70' : ''}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`text-3xl ${a.severity === 'attention' ? '' : ''}`}>🟠</span>
                <div>
                  <div className="text-lg font-extrabold text-brand-900">{a.title}</div>
                  <p className="text-base font-semibold text-neutral-700">{a.message}</p>
                </div>
              </div>
              <Chip tone={a.read ? 'neutral' : 'accent'}>{a.read ? t('cg.alerts.read') : t('cg.alerts.new')}</Chip>
            </div>
            {a.reasons.length > 0 && (
              <div className="mt-3 rounded-xl bg-brand-50 p-3">
                <div className="text-sm font-extrabold text-brand-700">{t('cg.attention.why')}</div>
                <ul className="mt-1 list-inside space-y-0.5 text-sm text-brand-800">
                  {a.reasons.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            )}
            {!a.read && (
              <button
                onClick={() => dispatch({ type: 'MARK_ALERT_READ', id: a.id })}
                className="mt-3 rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-100"
              >
                {t('cg.alerts.reviewed')}
              </button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
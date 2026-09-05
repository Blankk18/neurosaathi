import { useApp } from '@/state/AppContext';
import { Card, Chip } from '@/components/ui';
import * as stats from './stats';

export default function Activity() {
  const { t, state, pendingSync, lastSyncedAt, runSync } = useApp();

  const timeline = stats.todayTimeline(state);

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* timeline */}
        <div>
          <h2 className="mb-2 text-xl font-extrabold text-brand-900">🕐 {t('cg.timeline')}</h2>
          <Card>
            {timeline.length === 0 ? (
              <p className="text-neutral-500">{t('cg.activity.empty')}</p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-brand-200 pl-5">
                {timeline.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[31px] flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-lg">
                      {ev.icon}
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-bold text-brand-900">{ev.label}</span>
                      <span className="text-sm font-bold text-brand-600">{ev.time}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* sync queue */}
        <div>
          <h2 className="mb-2 text-xl font-extrabold text-brand-900">🔄 {t('common.sync')}</h2>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-extrabold text-brand-900">
                  {pendingSync > 0 ? t('common.waiting.sync') : t('common.synced')}
                </div>
                <div className="text-sm font-semibold text-neutral-500">
                  {t('common.lastSynced')}: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
              <button
                onClick={() => runSync()}
                disabled={pendingSync === 0}
                className="rounded-full bg-brand-600 px-5 py-3 text-lg font-bold text-white hover:bg-brand-700 disabled:opacity-40"
              >
                🔄 {t('common.sync')}
              </button>
            </div>

            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {state.syncRecords.length === 0 ? (
                <p className="text-sm text-neutral-500">{t('cg.sync.empty')}</p>
              ) : (
                state.syncRecords.slice(0, 15).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2">
                    <span className="text-xl" aria-hidden>{r.kind === 'game' ? '🎮' : r.kind === 'reminder' ? '🔔' : r.kind === 'mood' ? '💬' : '👤'}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-brand-900">{r.label}</div>
                      <div className="text-xs text-neutral-500">{r.detail}</div>
                    </div>
                    <Chip tone={r.status === 'synced' ? 'brand' : 'warm'}>
                      {r.status === 'synced' ? t('cg.sync.synced') : t('cg.sync.waiting')}
                    </Chip>
                  </div>
                ))
              )}
            </div>

            <p className="mt-3 text-xs font-semibold text-neutral-400">{t('offline.note')}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
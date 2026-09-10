import { useApp } from '@/state/AppContext';
import { Card, Button, Chip } from '@/components/ui';
import * as stats from './stats';

export default function Activity() {
  const { t, state, pendingSync, lastSyncedAt, runSync } = useApp();

  const timeline = stats.todayTimeline(state);

  return (
    <div className="space-y-4">
      {/* today's timeline */}
      <section aria-labelledby="activity-timeline-title">
        <h2 id="activity-timeline-title" className="mb-3 flex items-center gap-2 text-xl font-extrabold text-brand-900">
          🕐 {t('cg.timeline')}
          <span className="chip bg-brand-100 text-brand-700">{timeline.length}</span>
        </h2>
        <Card className="p-2">
          {timeline.length === 0 ? (
            <p className="px-4 py-6 text-center text-neutral-500">{t('cg.activity.empty')}</p>
          ) : (
            <ol className="relative space-y-1">
              {timeline.map((ev, idx) => {
                const isLast = idx === timeline.length - 1;
                return (
                  <li key={ev.id} className="relative flex gap-4 pl-2">
                    {/* connector line */}
                    {!isLast && (
                      <span className="absolute left-[42px] top-14 bottom-0 w-px bg-brand-200" aria-hidden />
                    )}
                    {/* dot marker */}
                    <span
                      className="mt-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg shadow-card"
                    >
                      {ev.icon}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-100 py-3 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base font-bold text-brand-900">{ev.label}</span>
                        {ev.photo && (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50/80 p-1">
                            <img src={ev.photo} alt="Snapshot" className="h-9 w-9 rounded-lg object-cover" />
                            <span className="text-[11px] font-bold text-brand-700 pr-1">📸 Photo Verified</span>
                          </span>
                        )}
                      </div>
                      <span className="chip bg-warm-100 text-warm-600 self-start sm:self-auto">{ev.time}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </section>

      {/* sync queue */}
      <section aria-labelledby="activity-sync-title">
        <h2 id="activity-sync-title" className="mb-3 flex items-center gap-2 text-xl font-extrabold text-brand-900">
          🔄 {t('common.sync')}
          {pendingSync > 0 && (
            <span className="chip bg-warm-100 text-warm-600">{pendingSync}</span>
          )}
        </h2>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold text-brand-900">
                {pendingSync > 0 ? t('common.waiting.sync') : t('common.synced')}
              </div>
              <div className="mt-0.5 text-sm font-semibold text-neutral-500">
                {t('common.lastSynced')}: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
            </div>
            <Button onClick={() => runSync()} disabled={pendingSync === 0} variant="primary" size="md">
              <span className="inline-flex items-center gap-2">🔄 {t('common.sync')}</span>
            </Button>
          </div>

          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
            {state.syncRecords.length === 0 ? (
              <p className="text-sm text-neutral-500">{t('cg.sync.empty')}</p>
            ) : (
              state.syncRecords.slice(0, 15).map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl bg-brand-50/70 px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-card" aria-hidden>
                    {r.kind === 'game' ? '🎮' : r.kind === 'reminder' ? '🔔' : r.kind === 'mood' ? '💬' : '👤'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-brand-900">{r.label}</div>
                    <div className="truncate text-xs text-neutral-500">{r.detail}</div>
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
      </section>
    </div>
  );
}
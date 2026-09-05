import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card } from '@/components/ui';

const FLOW: { icon: string; titleKey: string; descKey: string }[] = [
  { icon: '🧓', titleKey: 'arch.patient', descKey: 'arch.patient.desc' },
  { icon: '🎤', titleKey: 'arch.voice', descKey: 'arch.voice.desc' },
  { icon: '🎮', titleKey: 'arch.games', descKey: 'arch.games.desc' },
  { icon: '🤖', titleKey: 'arch.ai', descKey: 'arch.ai.desc' },
  { icon: '💾', titleKey: 'arch.storage', descKey: 'arch.storage.desc' },
  { icon: '🔄', titleKey: 'arch.sync.layer', descKey: 'arch.sync.layer.desc' },
  { icon: '👨‍👩‍👧', titleKey: 'arch.dashboard', descKey: 'arch.dashboard.desc' },
];

const IMAGINARY_LINES = [
  { icon: '🧓', labelKey: 'arch.patient.data', color: 'bg-accent-100 text-accent-400' },
  { icon: '🗝️', labelKey: 'arch.secure.storage', color: 'bg-brand-100 text-brand-700' },
  { icon: '📊', labelKey: 'arch.cg.insights', color: 'bg-warm-100 text-warm-500' },
];

export default function Architecture() {
  const { t } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => navigate('/caregiver/settings')} className="mb-4 rounded-full bg-white px-4 py-2 font-bold text-brand-800 shadow-card">
          ← {t('common.back')}
        </button>
        <h1 className="text-3xl font-extrabold text-brand-900">🏗️ {t('arch.title')}</h1>
        <p className="mt-1 text-base font-semibold text-neutral-500">{t('arch.desc')}</p>

        <div className="mt-6 space-y-0">
          {FLOW.map((f, i) => (
            <div key={f.titleKey}>
              <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-2xl" aria-hidden>
                  {f.icon}
                </span>
                <div>
                  <div className="text-lg font-extrabold text-brand-900">{t(f.titleKey)}</div>
                  <div className="text-sm font-semibold text-neutral-500">{t(f.descKey)}</div>
                </div>
              </div>
              {i < FLOW.length - 1 && (
                <div className="flex justify-center py-1 text-2xl text-brand-400" aria-hidden>
                  ↓
                </div>
              )}
            </div>
          ))}
        </div>

        <Card className="mt-6">
          <div className="mb-2 text-sm font-bold uppercase tracking-wide text-brand-600">{t('arch.dataflow')}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="flex flex-wrap items-center gap-2 text-lg font-extrabold">
            {IMAGINARY_LINES.map((x, i) => (
              <span key={x.labelKey} className="flex items-center gap-2">
                <span className={`rounded-xl px-3 py-2 ${x.color}`}>
                  {x.icon} {t(x.labelKey)}
                </span>
                {i < IMAGINARY_LINES.length - 1 && <span aria-hidden>→</span>}
              </span>
            ))}
          </div>
        </Card>

        <p className="mt-6 text-sm font-semibold text-neutral-400">{t('arch.prod')}</p>
      </div>
    </div>
  );
}
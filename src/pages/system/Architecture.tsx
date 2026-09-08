import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card } from '@/components/ui';
import { ChevronRightIcon, LeafIcon, RefreshIcon, ShieldIcon } from '@/components/Icons';

const FLOW: { icon: string; titleKey: string; descKey: string; tone: string }[] = [
  { icon: '🧓', titleKey: 'arch.patient', descKey: 'arch.patient.desc', tone: 'bg-brand-100 text-brand-700' },
  { icon: '🎤', titleKey: 'arch.voice', descKey: 'arch.voice.desc', tone: 'bg-accent-100 text-accent-500' },
  { icon: '🎮', titleKey: 'arch.games', descKey: 'arch.games.desc', tone: 'bg-warm-100 text-warm-600' },
  { icon: '🤖', titleKey: 'arch.ai', descKey: 'arch.ai.desc', tone: 'bg-info-100 text-info-700' },
  { icon: '💾', titleKey: 'arch.storage', descKey: 'arch.storage.desc', tone: 'bg-brand-100 text-brand-700' },
  { icon: '🔄', titleKey: 'arch.sync.layer', descKey: 'arch.sync.layer.desc', tone: 'bg-warm-100 text-warm-600' },
  { icon: '👨‍👩‍👧', titleKey: 'arch.dashboard', descKey: 'arch.dashboard.desc', tone: 'bg-accent-100 text-accent-500' },
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
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/caregiver/settings')}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-lg font-bold text-brand-800 shadow-card transition hover:bg-brand-50"
          >
            ← {t('common.back')}
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/neurosaathi-header.png" alt="NeuroSaathi" className="h-9 w-auto object-contain" />
        </div>

        {/* hero */}
        <header className="fade-up mt-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-extrabold tracking-wide text-brand-700">
            <LeafIcon size={15} /> NeuroSaathi
          </span>
          <h1 className="mt-4 text-4xl font-extrabold text-brand-900">{t('arch.title')}</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-semibold leading-relaxed text-neutral-600">
            {t('arch.desc')}
          </p>
        </header>

        {/* layered architecture flow */}
        <div className="mt-8">
          {FLOW.map((f, i) => (
            <div key={f.titleKey}>
              <Card className="flex items-center gap-4">
                <span
                  aria-hidden
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${f.tone}`}
                >
                  {f.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-lg font-extrabold text-brand-900">{t(f.titleKey)}</div>
                  <div className="mt-1 text-sm font-semibold leading-relaxed text-neutral-500">
                    {t(f.descKey)}
                  </div>
                </div>
              </Card>
              {i < FLOW.length - 1 && (
                <div aria-hidden className="flex items-center justify-center py-1.5 text-brand-300">
                  <ChevronRightIcon size={20} className="-rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* end-to-end data flow */}
        <Card className="mt-6">
          <div className="flex items-center gap-2">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <RefreshIcon size={18} />
            </span>
            <div className="text-sm font-bold uppercase tracking-wide text-brand-600">{t('arch.dataflow')}</div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-lg font-extrabold">
            {IMAGINARY_LINES.map((x, i) => (
              <span key={x.labelKey} className="flex items-center gap-2">
                <span className={`rounded-2xl px-3 py-2 ${x.color}`}>
                  {x.icon} {t(x.labelKey)}
                </span>
                {i < IMAGINARY_LINES.length - 1 && (
                  <span aria-hidden className="text-brand-300">
                    <ChevronRightIcon size={22} />
                  </span>
                )}
              </span>
            ))}
          </div>
        </Card>

        {/* production note */}
        <div className="mt-8 flex items-start gap-3 rounded-3xl border border-brand-100 bg-brand-50/70 px-5 py-4">
          <span aria-hidden className="mt-0.5 shrink-0 text-brand-500">
            <ShieldIcon size={22} />
          </span>
          <p className="text-sm font-semibold leading-relaxed text-brand-800">{t('arch.prod')}</p>
        </div>
      </div>
    </div>
  );
}

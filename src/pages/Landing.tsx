import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Button, Chip, Card } from '@/components/ui';
import { LanguageSelector } from '@/components/common';

const DIFFERENTIATORS = [
  { icon: '🧠', titleKey: 'landing.diff.adaptiveAI', descKey: 'landing.diff.adaptiveAI.desc' },
  { icon: '🏡', titleKey: 'landing.diff.cultural', descKey: 'landing.diff.cultural.desc' },
  { icon: '👨‍👩‍👧', titleKey: 'landing.diff.family', descKey: 'landing.diff.family.desc' },
  { icon: '🎤', titleKey: 'landing.diff.voice', descKey: 'landing.diff.voice.desc' },
  { icon: '🟠', titleKey: 'landing.diff.offline', descKey: 'landing.diff.offline.desc' },
  { icon: '📈', titleKey: 'landing.diff.cg', descKey: 'landing.diff.cg.desc' },
  { icon: '🔔', titleKey: 'landing.diff.alerts', descKey: 'landing.diff.alerts.desc' },
  { icon: '⚕️', titleKey: 'landing.diff.nondiag', descKey: 'landing.diff.nondiag.desc' },
];

export default function Landing() {
  const { t, dispatch } = useApp();
  const navigate = useNavigate();

  const pick = (role: 'elder' | 'caregiver') => {
    dispatch({ type: 'SET_ROLE', role });
    navigate(role === 'elder' ? '/home' : '/caregiver');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-brand-50">
      {/* top bar */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center">
  <img
    src="/neurosaathi-header.png"
    alt="NeuroSaathi"
    className="h-14 w-auto object-contain"
  />
</div>
        <LanguageSelector />
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        {/* hero */}
        <section className="fade-up text-center">
         <div className="mx-auto mt-6 flex items-center justify-center" aria-hidden>
  <img
    src="/neurosaathi-full.png"
    alt="NeuroSaathi"
    className="h-64 w-auto object-contain"
  />
</div>
          <p className="mt-3 text-2xl font-semibold text-brand-700">
  {t('brand.tagline')}
</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">{t('brand.tagline')}</p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">{t('brand.blurb')}</p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Chip tone="brand">🔒 {t('landing.privacy')}</Chip>
            <Chip tone="warm">📴 {t('landing.offline')}</Chip>
            <Chip tone="brand">🌐 {t('landing.multilingual')}</Chip>
            <Chip tone="accent">🤖 {t('landing.adaptive')}</Chip>
          </div>

          <div className="mx-auto mt-10 flex max-w-md flex-col gap-4">
            <Button variant="huge" onClick={() => pick('elder')}>
              🧓 {t('landing.continue.elder')}
            </Button>
            <Button variant="primary" onClick={() => pick('caregiver')}>
              👨‍👩‍👧 {t('landing.continue.caregiver')}
            </Button>
            <div className="mt-2 flex items-center justify-center gap-3 text-sm font-semibold text-neutral-400">
              <span>SIH 2026 · PS 26003</span>
              <span>·</span>
              <button onClick={() => navigate('/demo')} className="font-bold text-brand-600 underline-offset-4 hover:underline">
                ▶ {t('landing.demo')}
              </button>
            </div>
          </div>

          {/* simulated notice */}
          <div className="mx-auto mt-6 max-w-2xl rounded-2xl bg-brand-100/60 px-5 py-3 text-sm font-semibold text-brand-700">
            {t('landing.prototype.note')}
          </div>
        </section>

        {/* differentiators */}
        <section className="mt-14">
          <h2 className="mb-4 text-center text-2xl font-extrabold text-brand-900">
            {t('landing.differentiators.title')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {DIFFERENTIATORS.map((d) => (
              <Card key={d.titleKey} className="flex items-start gap-3">
                <span className="text-3xl" aria-hidden>
                  {d.icon}
                </span>
                <div>
                  <div className="text-lg font-extrabold text-brand-900">{t(d.titleKey)}</div>
                  <div className="text-sm text-neutral-600">{t(d.descKey)}</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* final message */}
        <section className="mt-14 rounded-3xl bg-brand-700 px-6 py-10 text-center text-white shadow-lift">
          <p className="text-2xl font-bold md:text-3xl">{t('landing.final.title')}</p>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-brand-100">{t('landing.final.sub')}</p>
        </section>
      </main>
    </div>
  );
}
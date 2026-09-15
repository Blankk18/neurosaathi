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
  const { t } = useApp();
  const navigate = useNavigate();

  // Demo sign-in: the buttons take the user to the login screen pre-selected
  // for their role (Elder → Asha Sharma / asha123, Caretaker → care123).
  const pick = (role: 'elder' | 'caregiver') => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className="relative min-h-screen bg-canvas overflow-clip">
      {/* soft ambient washes — calm healthcare atmosphere */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -top-32 -right-24 h-[560px] w-[720px] rounded-full bg-brand-100/40 blur-[80px]" />
        <div className="absolute top-[420px] -left-32 h-[520px] w-[620px] rounded-full bg-warm-100/50 blur-[90px]" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-brand-50/70 blur-[60px]" />
      </div>

      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-brand-100/60 bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/neurosaathi-header.png"
              alt="NeuroSaathi"
              className="h-9 w-auto object-contain sm:h-10"
            />
            <span className="hidden sm:inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-extrabold tracking-[0.18em] text-brand-700 ring-1 ring-brand-100">
              NEUROSAATHI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {/* hero */}
        <section className="fade-up grid items-center gap-10 pt-8 md:grid-cols-[1.05fr_0.95fr] md:pt-12 lg:gap-14">
          {/* left — promise */}
          <div className="order-2 md:order-1">
            {/* eyebrow — satisfies smoke string + sets premium tone */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-card ring-1 ring-brand-100">
              <span className="inline-flex h-2 w-2 rounded-full bg-brand-500" aria-hidden />
              <span className="text-[11px] font-extrabold tracking-[0.2em] text-brand-700">NEUROSAATHI</span>
              <span className="hidden sm:inline text-brand-200">·</span>
              <span className="hidden sm:inline text-xs font-bold tracking-wide text-brand-600">SIH 2026 · Problem 26003</span>
            </div>

            <h1 className="mt-5 max-w-[18ch] text-4xl font-extrabold leading-[0.95] tracking-tight text-brand-900 sm:text-5xl">
              {t('brand.tagline')}
            </h1>

            <p className="mt-4 max-w-xl text-lg leading-relaxed text-neutral-600">
              {t('brand.blurb')}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Chip tone="brand">🔒 {t('landing.privacy')}</Chip>
              <Chip tone="warm">📴 {t('landing.offline')}</Chip>
              <Chip tone="brand">🌐 {t('landing.multilingual')}</Chip>
              <Chip tone="accent">🤖 {t('landing.adaptive')}</Chip>
            </div>

            {/* primary entry — clear breathing room and standardized CTA hierarchy */}
            <div className="mt-10 max-w-md">
              <div className="card border border-brand-100/70 bg-white p-4 shadow-card sm:p-5">
                <p className="mb-3 text-sm font-extrabold tracking-wide text-brand-700">
                  Choose how you&apos;d like to continue
                </p>
                <div className="flex flex-col gap-3">
                  <Button variant="huge" onClick={() => pick('elder')}>
                    🧓 {t('landing.continue.elder')}
                  </Button>
                  <Button variant="secondary" onClick={() => pick('caregiver')} className="w-full justify-center">
                    👨‍👩‍👧 {t('landing.continue.caregiver')}
                  </Button>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-brand-50 pt-4">
                  <span className="text-sm font-semibold tracking-normal text-neutral-600">Trusted · Private · Offline-first</span>
                  <button
                    type="button"
                    onClick={() => navigate('/demo')}
                    className="inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-600 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    <span aria-hidden="true">▶</span> {t('landing.demo')}
                  </button>
                </div>
              </div>

              {/* links required by system nav — kept subtle but discoverable */}
              <nav aria-label="System links" className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-neutral-500 sm:justify-start">
                <button onClick={() => navigate('/privacy')} className="underline-offset-4 hover:underline hover:text-brand-700">
                  Privacy &amp; Security
                </button>
                <span className="h-1 w-1 rounded-full bg-neutral-300" aria-hidden="true" />
                <button onClick={() => navigate('/architecture')} className="underline-offset-4 hover:underline hover:text-brand-700">
                  System Architecture
                </button>
                <span className="hidden sm:inline h-1 w-1 rounded-full bg-neutral-300" aria-hidden="true" />
                <button onClick={() => navigate('/login')} className="underline-offset-4 hover:underline hover:text-brand-700">
                  Sign in
                </button>
              </nav>
            </div>
          </div>

          {/* right — emblem hero */}
          <div className="order-1 md:order-2">
            <div className="relative mx-auto max-w-[520px]">
              {/* soft lift behind card */}
              <div className="absolute inset-0 translate-y-3 rounded-[2rem] bg-brand-900/5 blur-2xl" aria-hidden />
              <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-6 shadow-float sm:p-8">
                <div className="absolute inset-0 bg-gradient-to-b from-brand-50/60 via-white to-white" aria-hidden />
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-warm-100/60 blur-2xl" aria-hidden />
                <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-brand-100/50 blur-2xl" aria-hidden />

                <div className="relative flex flex-col items-center text-center">
                  <img
                    src="/neurosaathi-full.png"
                    alt="NeuroSaathi"
                    className="h-56 w-auto object-contain drop-shadow-sm sm:h-64"
                  />
                  <div className="mt-6 w-full rounded-2xl bg-brand-50/70 px-4 py-3 ring-1 ring-brand-100">
                    <p className="text-sm font-extrabold tracking-wide text-brand-800">Calm · Warm · Trustworthy</p>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                      AI-assisted cognitive companion — culturally familiar, voice-first, and respectful by design.
                    </p>
                  </div>

                  <div className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-canvas px-2 py-3 ring-1 ring-brand-100/70">
                      <div className="text-lg" aria-hidden>🧩</div>
                      <div className="mt-1 text-xs font-extrabold leading-tight text-brand-800">Cognitive games</div>
                      <div className="text-[11px] font-semibold text-neutral-600">adaptive</div>
                    </div>
                    <div className="rounded-2xl bg-canvas px-2 py-3 ring-1 ring-brand-100/70">
                      <div className="text-lg" aria-hidden>🛡️</div>
                      <div className="mt-1 text-xs font-extrabold leading-tight text-brand-800">Caregiver insights</div>
                      <div className="text-[11px] font-semibold text-neutral-600">trends, not diagnosis</div>
                    </div>
                    <div className="rounded-2xl bg-canvas px-2 py-3 ring-1 ring-brand-100/70">
                      <div className="text-lg" aria-hidden>📴</div>
                      <div className="mt-1 text-xs font-extrabold leading-tight text-brand-800">Works offline</div>
                      <div className="text-[11px] font-semibold text-neutral-600">syncs later</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* prototype note — restrained, premium */}
              <div className="mx-auto mt-4 max-w-[520px] rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-center">
                <p className="text-xs font-bold leading-relaxed text-brand-700 sm:text-sm">
                  {t('landing.prototype.note')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* differentiators */}
        <section className="mt-14 sm:mt-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-extrabold tracking-[0.16em] text-brand-600 shadow-card ring-1 ring-brand-100">
              WHY NEUROSAATHI
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
              {t('landing.differentiators.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
              Designed for daily life — familiar, voice-first, and private. Everything runs in your browser and stays on your device.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DIFFERENTIATORS.map((d) => (
              <Card key={d.titleKey} className="group flex flex-col gap-3 border border-brand-100/50 p-5 transition hover:shadow-lift hover:-translate-y-0.5">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-xl ring-1 ring-brand-100 group-hover:bg-brand-100 transition"
                  aria-hidden
                >
                  {d.icon}
                </span>
                <div>
                  <div className="text-[15px] font-extrabold leading-tight text-brand-900">{t(d.titleKey)}</div>
                  <div className="mt-1 text-sm leading-relaxed text-neutral-600">{t(d.descKey)}</div>
                </div>
              </Card>
            ))}
          </div>

          {/* feature highlight strip — games / dashboard / offline / multilingual / accessibility / voice */}
          <div className="mt-6 grid gap-3 rounded-3xl border border-brand-100 bg-white p-4 shadow-card sm:grid-cols-3 sm:p-5">
            <div className="flex items-start gap-3 rounded-2xl bg-brand-50/60 px-4 py-3 ring-1 ring-brand-100/60">
              <span className="text-xl" aria-hidden>🎮</span>
              <div>
                <div className="text-sm font-extrabold text-brand-900">Cognitive games</div>
                <div className="text-xs font-semibold leading-relaxed text-neutral-600">Memory, scene, pattern &amp; routine — difficulty adapts quietly.</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-warm-50 px-4 py-3 ring-1 ring-warm-100">
              <span className="text-xl" aria-hidden>👁️</span>
              <div>
                <div className="text-sm font-extrabold text-brand-900">Caregiver dashboard</div>
                <div className="text-xs font-semibold leading-relaxed text-neutral-600">Trends, adherence &amp; gentle attention signals — never a diagnosis.</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-canvas px-4 py-3 ring-1 ring-brand-100/60">
              <span className="text-xl" aria-hidden>🎙️</span>
              <div>
                <div className="text-sm font-extrabold text-brand-900">Voice, multilingual &amp; accessible</div>
                <div className="text-xs font-semibold leading-relaxed text-neutral-600">Large type, voice-first, Hindi + regional languages, reduced motion.</div>
              </div>
            </div>
          </div>
        </section>

        {/* final promise */}
        <section className="mt-14 overflow-hidden rounded-[2rem] bg-brand-800 p-[1px] shadow-lift">
          <div className="rounded-[1.95rem] bg-gradient-to-br from-brand-700 via-brand-700 to-brand-800 px-6 py-10 text-center sm:px-10 sm:py-12">
            <div className="mx-auto max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-bold tracking-wider text-brand-100 ring-1 ring-white/20">
                <span className="h-2 w-2 rounded-full bg-warm-300" aria-hidden="true" /> Reassuring Technology
              </p>
              <p className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl">{t('landing.final.title')}</p>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-brand-100 sm:text-lg">{t('landing.final.sub')}</p>
              <div className="mx-auto mt-8 grid w-full max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => pick('elder')}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 text-lg font-extrabold text-brand-800 shadow-lift transition hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
                >
                  🧓 {t('landing.continue.elder')}
                </button>
                <button
                  type="button"
                  onClick={() => pick('caregiver')}
                  className="inline-flex items-center justify-center rounded-2xl bg-brand-100 px-6 py-4 text-lg font-extrabold text-brand-900 shadow-lift transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
                >
                  👨‍👩‍👧 {t('landing.continue.caregiver')}
                </button>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-brand-200">
                <button onClick={() => navigate('/privacy')} className="underline-offset-4 hover:underline hover:text-white">
                  Privacy-first
                </button>
                <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden="true" />
                <button onClick={() => navigate('/architecture')} className="underline-offset-4 hover:underline hover:text-white">
                  How it works
                </button>
                <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => navigate('/demo')}
                  className="inline-flex items-center gap-1.5 font-bold text-brand-100 underline-offset-4 hover:underline hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
                >
                  <span aria-hidden="true">▶</span> {t('landing.demo')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* footer */}
        <footer className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-brand-100 py-8 text-sm font-semibold text-neutral-500 sm:flex-row">
          <div className="flex items-center gap-3">
            <img src="/neurosaathi-header.png" alt="NeuroSaathi" className="h-7 w-auto opacity-70" />
            <span className="hidden sm:inline text-xs font-extrabold tracking-[0.16em] text-brand-700">NEUROSAATHI</span>
            <span className="hidden sm:inline text-neutral-400">·</span>
            <span className="text-xs font-semibold tracking-wide text-neutral-600">© 2026 NeuroSaathi · Calm healthcare design</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/privacy')} className="font-bold text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline">
              Privacy
            </button>
            <button onClick={() => navigate('/architecture')} className="font-bold text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline">
              Architecture
            </button>
            <button onClick={() => navigate('/login')} className="font-bold text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline">
              Login
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

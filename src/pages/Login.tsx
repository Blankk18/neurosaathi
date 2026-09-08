import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { LanguageSelector } from '@/components/common';
import type { Role } from '@/types';

// ============================================================================
// Demo login — UI-only authentication (no backend). Two roles offered:
//   Elder     → Asha Sharma     password  asha123
//   Caretaker → Asha Sharma     password  care123
// A correct password sets the role and takes the user to the matching view.
// ============================================================================

const PASSWORDS: Record<Role, string> = { elder: 'asha123', caregiver: 'care123' };

interface LoginCardProps {
  role: Role;
  emoji: string;
  focus: boolean;
  onFocus: () => void;
}

function LoginCard({ role, emoji, focus, onFocus }: LoginCardProps) {
  const { t, state, dispatch, speakText } = useApp();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (password.trim() === PASSWORDS[role]) {
      const msg = role === 'elder' ? t('login.success.elder') : t('login.success.caregiver');
      speakText(`${t('login.patient.name')}. ${msg}`);
      dispatch({ type: 'SET_ROLE', role });
      if (role === 'elder' && !state.patient?.onboarded) navigate('/onboarding');
      else if (role === 'elder') navigate('/home');
      else navigate('/caregiver');
      return;
    }
    setError(true);
    setPassword('');
    speakText(t('login.error'));
  };

  const isElder = role === 'elder';
  const titleKey = isElder ? 'login.elder.title' : 'login.caregiver.title';
  const hintKey = isElder ? 'login.elder.hint' : 'login.caregiver.hint';
  const descKey = isElder ? 'login.elder.desc' : 'login.caregiver.desc';

  const ring = error
    ? 'border-danger-300 shadow-card'
    : focus
      ? 'border-brand-300 shadow-lift'
      : 'border-brand-100/70 shadow-card hover:shadow-lift hover:border-brand-200';

  return (
    <form
      onSubmit={submit}
      onFocus={onFocus}
      className={`card flex flex-col gap-4 p-5 sm:p-6 transition-all duration-200 border-2 ${ring} ${focus ? 'scale-[1.01]' : ''}`}
      aria-label={t(titleKey)}
    >
      <div className="flex items-center gap-3.5">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100 text-[1.65rem] shadow-soft"
          aria-hidden
        >
          {emoji}
        </span>
        <div className="min-w-0">
          <div className="font-display text-[1.2rem] font-extrabold leading-none tracking-tight text-brand-900">
            {t(titleKey)}
          </div>
          <div className="mt-1 text-sm font-semibold leading-snug text-neutral-500">{t(descKey)}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-warm-50/60 border border-brand-100 px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold tracking-widest text-brand-700 uppercase">Patient</span>
        <span className="text-base font-extrabold text-brand-900">👤 {t('login.patient.name')}</span>
      </div>

      <div>
        <label className="label" htmlFor={`pw-${role}`}>
          🔐 {t('login.password')}
        </label>
        <input
          id={`pw-${role}`}
          className={`input ${error ? '!border-danger-300 !ring-2 !ring-danger-100' : ''}`}
          type="password"
          inputMode="text"
          autoComplete="off"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          placeholder={t('login.password.placeholder')}
        />
        <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-warm-600" aria-live="polite">
          <span aria-hidden>💡</span> {t(hintKey)}
        </p>
      </div>

      {error && (
        <p
          className="rounded-2xl bg-danger-50 border border-danger-200 px-3.5 py-2.5 text-sm font-bold text-danger-700 flex items-center gap-2"
          role="alert"
        >
          <span aria-hidden>⚠️</span> {t('login.error')}
        </p>
      )}

      <button
        type="submit"
        className="btn-huge !bg-accent-500 hover:!bg-accent-600 shadow-lift mt-1"
      >
        🔓 {t('common.start')}
      </button>
    </form>
  );
}

export default function Login() {
  const { t, speakText } = useApp();
  const [params] = useSearchParams();
  const preset = params.get('role');
  // Arriving from Landing ("Continue as …") carries a role param: show only
  // that role's login card. Without a param (e.g. session-guard redirects)
  // fall back to the full chooser with both cards.
  const single = preset === 'elder' || preset === 'caregiver';
  const role: Role = preset === 'caregiver' ? 'caregiver' : 'elder';
  const [focus, setFocus] = useState<Role>(role);

  const speakPrompt = (r: Role) => {
    const titleKey = r === 'elder' ? 'login.elder.title' : 'login.caregiver.title';
    const hintKey = r === 'elder' ? 'login.elder.hint' : 'login.caregiver.hint';
    speakText(`${t('login.choose')}. ${t(titleKey)}. ${t('login.patient.name')}. ${t(hintKey)}`);
    setFocus(r);
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* top bar */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:py-5">
        <img src="/neurosaathi-header.png" alt="NeuroSaathi" className="h-11 w-auto object-contain sm:h-[52px]" />
        <LanguageSelector />
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-10 sm:pb-14">
        {/* premium split hero: brand left / role cards right */}
        <div className="grid gap-6 lg:grid-cols-[1.02fr_1.22fr] lg:gap-8 items-start">
          {/* left — brand story */}
          <div className="relative overflow-hidden rounded-[2rem] bg-white p-6 sm:p-8 shadow-card border border-brand-100/60">
            {/* soft decorative orbs */}
            <div aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-brand-50 blur-2xl opacity-80" />
            <div aria-hidden className="pointer-events-none absolute -left-10 bottom-0 h-44 w-44 rounded-full bg-warm-50 blur-2xl opacity-70" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-100 px-3.5 py-1.5 text-xs font-extrabold tracking-wide text-brand-700">
                <span aria-hidden>🍃</span> Calm · Private · Voice-first
              </span>

              <div className="mt-5 flex justify-center lg:justify-start">
                <img
                  src="/neurosaathi-full.png"
                  alt="NeuroSaathi"
                  className="h-40 w-auto object-contain sm:h-48"
                />
              </div>

              <h1 className="font-display mt-4 text-center text-[2.1rem] font-extrabold tracking-tight text-brand-900 lg:text-left">
                NEUROSAATHI
              </h1>
              <p className="mt-2 text-center text-[1.05rem] font-bold leading-snug text-brand-700 lg:text-left">
                {t('brand.tagline')}
              </p>
              <p className="mx-auto mt-3 max-w-md text-center text-[15px] leading-relaxed text-neutral-500 lg:mx-0 lg:text-left">
                {t('brand.blurb')}
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                <span className="chip bg-brand-50 text-brand-700 border border-brand-100">🔒 {t('landing.privacy')}</span>
                <span className="chip bg-warm-50 text-warm-700 border border-warm-100">📴 {t('landing.offline')}</span>
                <span className="chip bg-white text-brand-700 border border-brand-100 shadow-soft">🌐 {t('landing.multilingual')}</span>
                <span className="chip bg-accent-50 text-accent-700 border border-accent-100">🤖 {t('landing.adaptive')}</span>
              </div>

              <div className="mt-6 rounded-2xl bg-brand-50/70 border border-brand-100 px-4 py-3.5">
                <p className="text-sm font-extrabold text-brand-800">A reassuring companion for elders and caregivers.</p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                  Choose how you&apos;d like to sign in on the right. Demo passwords are shown on each card — no real account needed.
                </p>
              </div>
            </div>
          </div>

          {/* right — auth */}
          <div className="fade-up">
            <div className="rounded-[2rem] bg-white p-6 sm:p-7 shadow-card border border-brand-100/60">
              <div className="text-center lg:text-left">
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-brand-900 sm:text-[1.7rem]">
                  {t('login.choose')}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-neutral-500">{t('login.demo.note')}</p>
              </div>

              <div className="mt-6">
                {single ? (
                  <div className="flex justify-center">
                    <div className="w-full max-w-md">
                      {role === 'elder' ? (
                        <LoginCard role="elder" emoji="👵" focus={focus === 'elder'} onFocus={() => setFocus('elder')} />
                      ) : (
                        <LoginCard
                          role="caregiver"
                          emoji="👨‍👩‍👧"
                          focus={focus === 'caregiver'}
                          onFocus={() => speakPrompt('caregiver')}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-5">
                    <LoginCard role="elder" emoji="👵" focus={focus === 'elder'} onFocus={() => setFocus('elder')} />
                    <LoginCard
                      role="caregiver"
                      emoji="👨‍👩‍👧"
                      focus={focus === 'caregiver'}
                      onFocus={() => speakPrompt('caregiver')}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-center lg:justify-start">
                <button
                  onClick={() => speakPrompt(single ? role : 'elder')}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-extrabold text-brand-700 shadow-card border border-brand-100 hover:bg-brand-50 transition"
                >
                  🔊 {t('voice.listen')}
                </button>
              </div>

              <p className="mt-4 text-center text-xs font-semibold text-neutral-400">
                Demo mode — your choice stays on this device.
              </p>
            </div>

            {/* subtle reassurance footer */}
            <p className="mt-4 text-center text-xs font-semibold text-neutral-400">
              Private by design · Voice-assisted · Built for families
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

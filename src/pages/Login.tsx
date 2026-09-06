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

  const ring = error ? 'border-accent-400' : focus ? 'border-brand-500' : 'border-brand-100';

  return (
    <form
      onSubmit={submit}
      onFocus={onFocus}
      className={`card flex flex-col gap-3 transition ${ring}`}
      aria-label={t(titleKey)}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-3xl" aria-hidden>
          {emoji}
        </span>
        <div>
          <div className="text-xl font-extrabold text-brand-900">{t(titleKey)}</div>
          <div className="text-sm font-semibold text-neutral-500">{t(descKey)}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-brand-50 px-4 py-3">
        <div className="text-lg font-extrabold text-brand-900">👤 {t('login.patient.name')}</div>
      </div>

      <div>
        <label className="label" htmlFor={`pw-${role}`}>
          🔐 {t('login.password')}
        </label>
        <input
          id={`pw-${role}`}
          className={`input ${error ? '!border-accent-400' : ''}`}
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
        <p className="mt-1.5 text-base font-bold text-warm-500" aria-live="polite">
          💡 {t(hintKey)}
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-accent-50 px-3 py-2 text-base font-bold text-accent-500" role="alert">
          ❌ {t('login.error')}
        </p>
      )}

      <button type="submit" className="btn-huge bg-brand-600 text-white hover:bg-brand-700">
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-10">
      <div className="w-full max-w-3xl fade-up">
        <div className="mb-6 flex items-center justify-between">
          <img src="/neurosaathi-header.png" alt="NeuroSaathi" className="h-14 w-auto object-contain" />
          <LanguageSelector />
        </div>

        <div className="text-center">
          <span className="text-4xl" aria-hidden>🍃</span>
          <h1 className="font-display text-3xl font-bold text-brand-900">NEUROSAATHI</h1>
          <h2 className="mt-2 text-2xl font-extrabold text-brand-900">{t('login.choose')}</h2>
          <p className="mt-2 text-base font-semibold text-neutral-500">{t('login.demo.note')}</p>
        </div>

        {single ? (
          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-md">
              {role === 'elder' ? (
                <LoginCard role="elder" emoji="👵" focus={focus === 'elder'} onFocus={() => setFocus('elder')} />
              ) : (
                <LoginCard role="caregiver" emoji="👨‍👩‍👧" focus={focus === 'caregiver'} onFocus={() => speakPrompt('caregiver')} />
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <LoginCard role="elder" emoji="👵" focus={focus === 'elder'} onFocus={() => setFocus('elder')} />
            <LoginCard role="caregiver" emoji="👨‍👩‍👧" focus={focus === 'caregiver'} onFocus={() => speakPrompt('caregiver')} />
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => speakPrompt(single ? role : 'elder')}
            className="rounded-2xl bg-white px-4 py-2 text-base font-bold text-brand-700 shadow-card hover:bg-brand-50"
          >
            🔊 {t('voice.listen')}
          </button>
        </div>
      </div>
    </div>
  );
}
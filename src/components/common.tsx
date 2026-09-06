import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { languageNames } from '@/i18n';
import { createRecognizer, speechRecognitionSupported, speechSynthesisSupported } from '@/services/voice';
import { BackIcon, HomeIcon } from './Icons';
import { Toggle, Modal, Button } from './ui';
import type { Settings } from '@/types';

// ============================================================================
// Shared components: language selector, voice button, offline badge, etc.
// ============================================================================

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { t, state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const langs = Object.keys(languageNames);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-base font-bold text-brand-800 shadow-card"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        🌐 <span className="uppercase">{state.settings.language}</span>
        <span className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 max-h-72 w-56 overflow-auto rounded-2xl bg-white p-1 shadow-lift pop" role="listbox">
          {langs.map((l) => (
            <button
              key={l}
              role="option"
              aria-selected={state.settings.language === l}
              onClick={() => {
                dispatch({ type: 'SET_LANGUAGE', language: l as never });
                setOpen(false);
              }}
              className={`block w-full rounded-xl px-3 py-2 text-left text-base font-semibold hover:bg-brand-50 ${state.settings.language === l ? 'bg-brand-100 text-brand-800' : 'text-neutral-700'}`}
            >
              {languageNames[l]}
              {l !== 'en' && l !== 'hi' && l !== 'gu' && !compact && <span className="ml-1 text-xs text-neutral-400">(sample)</span>}
            </button>
          ))}
          <div className="px-3 py-2 text-xs text-neutral-400">{t('a11y.language')}</div>
        </div>
      )}
    </div>
  );
}

export function OfflineBadge() {
  const { isOffline, t } = useApp();
  const cls = isOffline ? 'bg-warm-200 text-warm-500' : 'bg-brand-100 text-brand-700';
  return (
    <span className={`chip ${cls}`} aria-label={isOffline ? t('common.offline') : t('common.online')}>
      {isOffline ? '🟠' : '🟢'} {isOffline ? t('common.offline') : t('common.online')}
    </span>
  );
}

export function VoiceButton({
  onTranscript,
  label,
  size = 'lg',
}: {
  onTranscript: (text: string) => void;
  label?: string;
  size?: 'lg' | 'xl';
}) {
  const { t, lang } = useApp();
  const [listening, setListening] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);

  const stop = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  };

  const start = () => {
    if (!speechRecognitionSupported()) {
      setUnavailable(true);
      return;
    }
    setUnavailable(false);
    const rec = createRecognizer(lang);
    if (!rec) {
      setUnavailable(true);
      return;
    }
    recRef.current = rec;
    rec.onresult = (ev) => {
      const transcript = ev.results[0]?.[0]?.transcript ?? '';
      if (transcript) onTranscript(transcript);
      stop();
    };
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed') setUnavailable(true);
      stop();
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setUnavailable(true);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={listening ? stop : start}
        aria-label={label ?? t('voice.tap')}
        className={`rounded-full bg-accent-400 text-white font-extrabold shadow-lift hover:bg-accent-500 transition ${
          size === 'xl' ? 'h-28 w-28 text-lg' : 'h-20 w-20 text-base'
        } ${listening ? 'pulse-soft' : ''}`}
      >
        {listening ? '⏸' : '🎤'}
        <span className="block text-xs font-bold">{listening ? t('voice.listening') : t('voice.tap')}</span>
      </button>
      {unavailable && (
        <p className="max-w-xs text-center text-sm font-semibold text-accent-500">{t('voice.fallback')}</p>
      )}
    </div>
  );
}

export function SpeakText({ text, langOverride }: { text: string; langOverride?: string }) {
  const { speakText, state, t } = useApp();
  const [done, setDone] = useState(false);
  useEffect(() => setDone(false), [text]);
  if (!state.settings.voiceOn || !speechSynthesisSupported()) return null;
  return (
    <button
      onClick={() => {
        speakText(text, langOverride);
        setDone(true);
        window.setTimeout(() => setDone(false), 2500);
      }}
      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-brand-700 shadow-card hover:bg-brand-50"
      aria-label={t('voice.listen')}
    >
      🔊 {done ? '✓' : ''}
    </button>
  );
}

const NAV_BTN_CLS =
  'inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-lg font-bold text-brand-800 shadow-card hover:bg-brand-50 transition';

/** Small round home shortcut used next to the back button. */
export function HomeButton({ className = '' }: { className?: string }) {
  const { t } = useApp();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/home')}
      aria-label={t('common.home')}
      title={t('common.home')}
      className={`inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-lg font-bold text-brand-800 shadow-card hover:bg-brand-50 transition ${className}`}
    >
      <HomeIcon /> <span className="hidden sm:inline">{t('common.home')}</span>
    </button>
  );
}

export function BackButton({ to, onBack }: { to?: string; onBack?: () => void }) {
  const { t } = useApp();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        if (onBack) onBack();
        else if (to) navigate(to);
        else navigate(-1);
      }}
      className={NAV_BTN_CLS}
      aria-label={t('common.back')}
    >
      <BackIcon /> {t('common.back')}
    </button>
  );
}

/**
 * Page header used by every internal page. Shows a clearly visible ← Back
 * button (returns to the previous logical page, or `backTo`/onBack when given)
 * plus an optional Home button. When `inProgress` is true, backing out asks
 * "Leave game? Your current progress will be lost." with Continue / Leave.
 */
export function PageHeader({
  title,
  subtitle,
  backTo,
  onBack,
  showHome = false,
  inProgress = false,
  right,
}: {
  title?: string;
  subtitle?: string;
  backTo?: string;
  onBack?: () => void;
  showHome?: boolean;
  inProgress?: boolean;
  right?: React.ReactNode;
}) {
  const { t } = useApp();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);

  const leave = () => {
    if (inProgress) setConfirm(true);
    else go();
  };

  const go = () => {
    if (onBack) onBack();
    else if (backTo) navigate(backTo);
    else navigate(-1);
  };

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BackButton onBack={leave} />
          {showHome && <HomeButton />}
        </div>
        {right}
      </div>

      {title && <h1 className="mt-3 text-3xl font-extrabold text-brand-900">{title}</h1>}
      {subtitle && (
        <p className="mt-1 text-lg font-semibold text-brand-700">{subtitle}</p>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} title={t('games.leave.confirm')}>
        <p className="text-lg font-semibold text-brand-800">{t('games.leave.body')}</p>
        <div className="mt-5 flex flex-col gap-3">
          <Button variant="huge" onClick={() => setConfirm(false)}>
            ▶ {t('games.leave.continue')}
          </Button>
          <Button variant="danger" onClick={go}>
            {t('games.leave.leave')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/** A row of mutually exclusive options (used for text / button size). */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-2xl border-2 px-3 py-3 text-base font-bold transition ${
            value === o.value ? 'border-brand-500 bg-brand-100 text-brand-900' : 'border-brand-100 bg-white text-neutral-600 hover:bg-brand-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Stops any in-progress speech. Safe to press anytime. */
export function StopVoiceButton({ className = '' }: { className?: string }) {
  const { t, stopSpeaking } = useApp();
  return (
    <button
      onClick={() => stopSpeaking()}
      aria-label={t('a11y.stopVoice')}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-accent-300 bg-white px-4 py-3 text-lg font-extrabold text-accent-500 transition hover:bg-accent-50 ${className}`}
    >
      ⏹ {t('a11y.stopVoice')}
    </button>
  );
}

/**
 * Elder-friendly accessibility panel. Preferences are persisted via settings
 * (→ localStorage) and applied app-wide by AppContext. Includes 3-state text
 * and button sizing, plus High Contrast / Simple Mode / Reduced Motion /
 * Voice Assistance toggles and a Stop Voice control.
 */
export function AccessibilityControls() {
  const { t, state, dispatch, speakText } = useApp();
  const s = state.settings;

  const set = (patch: Partial<Settings>) => dispatch({ type: 'UPDATE_SETTINGS', settings: patch });

  const setText = (v: Settings['textSize']) => {
    set({ textSize: v });
    speakText(
      t(v === 'large' ? 'a11y.text.large' : v === 'medium' ? 'a11y.text.medium' : 'a11y.text.small'),
    );
  };

  const setButton = (v: Settings['buttonSize']) => {
    set({ buttonSize: v });
    speakText(
      t(v === 'extra' ? 'a11y.button.xl' : v === 'large' ? 'a11y.button.large' : 'a11y.button.standard'),
    );
  };

  return (
    <div className="card space-y-5">
      <h3 className="text-xl font-extrabold text-brand-900">♿ {t('a11y.title')}</h3>

      <div>
        <div className="mb-2 text-lg font-bold text-brand-800">🔠 {t('a11y.textSize')}</div>
        <Segmented<Settings['textSize']>
          value={s.textSize}
          ariaLabel={t('a11y.textSize')}
          onChange={setText}
          options={[
            { value: 'small', label: t('a11y.text.small') },
            { value: 'medium', label: t('a11y.text.medium') },
            { value: 'large', label: t('a11y.text.large') },
          ]}
        />
      </div>

      <div>
        <div className="mb-2 text-lg font-bold text-brand-800">🔘 {t('a11y.buttonSize')}</div>
        <Segmented<Settings['buttonSize']>
          value={s.buttonSize}
          ariaLabel={t('a11y.buttonSize')}
          onChange={setButton}
          options={[
            { value: 'standard', label: t('a11y.button.standard') },
            { value: 'large', label: t('a11y.button.large') },
            { value: 'extra', label: t('a11y.button.xl') },
          ]}
        />
      </div>

      <div className="space-y-1">
        {(
          [
            ['highContrast', t('a11y.contrast')],
            ['simpleLanguage', t('a11y.simple')],
            ['reducedMotion', t('a11y.motion')],
            ['voiceOn', t('a11y.voiceAssist')],
          ] as const
        ).map(([k, label]) => (
          <Toggle key={k} checked={Boolean(s[k])} onChange={(v) => set({ [k]: v })} label={label} />
        ))}
      </div>

      <div>
        <StopVoiceButton className="w-full" />
      </div>
    </div>
  );
}
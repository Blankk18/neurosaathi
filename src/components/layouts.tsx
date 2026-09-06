import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { HomeIcon, GamesIcon, BellIcon, HeartsIcon, ChartIcon, GridIcon, UserIcon, LightbulbIcon, AlertIcon } from './Icons';
import { AccessibilityControls, LanguageSelector, OfflineBadge } from './common';
import { Modal, Toast } from './ui';

// ============================================================================
// Patient shell — big bottom navigation, calm top bar, tablet/mobile first.
// ============================================================================

const PATIENT_NAV = [
  { to: '/home', label: 'nav.home', Icon: HomeIcon },
  { to: '/games', label: 'nav.games', Icon: GamesIcon },
  { to: '/reminders', label: 'nav.reminders', Icon: BellIcon },
  { to: '/memories', label: 'nav.memories', Icon: HeartsIcon },
  { to: '/progress', label: 'nav.progress', Icon: ChartIcon },
];

// Voice assistance: the page name (+ a short instruction where available) is
// spoken aloud when arriving on a page, so the user always knows where they are.
const PATIENT_PAGE_SPEECH: Record<string, string[]> = {
  '/home': ['nav.home'],
  '/games': ['games.title'],
  '/games/memory': ['games.memory', 'memory.tap'],
  '/games/scene': ['games.scene', 'scene.watch'],
  '/games/pattern': ['games.pattern', 'pattern.watch'],
  '/games/routine': ['games.routine', 'routine.watch'],
  '/games/family': ['games.family', 'family.start.desc'],
  '/games/region': ['games.region', 'region.familiar'],
  '/reminders': ['reminders.title'],
  '/memories': ['family.title'],
  '/progress': ['progress.title'],
  '/voice': ['voice.title'],
  '/mood': ['mood.title'],
};

export function PatientShell({ children }: { children: React.ReactNode }) {
  const { t, state, speakText } = useApp();
  const location = useLocation();

  // speak the page name (in the selected language) when the page changes
  useEffect(() => {
    const keys = PATIENT_PAGE_SPEECH[location.pathname];
    if (!keys || !state.settings.voiceOn) return;
    speakText(keys.map((k) => t(k)).join('. '));
    // speakText already honours voiceOn; run once per page visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col pb-28">
      <PatientTopBar />
      <main className="flex-1 px-4">{children}</main>
      <OfflineBanner />
      <nav
        className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-xl -translate-x-1/2 items-stretch justify-between gap-1 border-t border-brand-100 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-4px_20px_rgba(43,60,38,0.08)]"
        aria-label="Main"
      >
        {PATIENT_NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-xs font-bold ${
                isActive ? 'bg-brand-100 text-brand-800' : 'text-neutral-500 hover:bg-neutral-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span>{t(label)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function PatientTopBar() {
  const { t, state, speakText, stopSpeaking } = useApp();
  const [showA11y, setShowA11y] = useState(false);
  const name = state.patient?.name ?? t('home.friend');
  return (
    <header className="flex flex-wrap items-center justify-between gap-y-2 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src="/neurosaathi-header.png"
          alt="NeuroSaathi"
          className="h-10 max-sm:h-8 w-auto object-contain"
        />
        <div className="truncate text-lg font-extrabold leading-tight text-brand-900 max-sm:text-base">{name}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => speakText(`${t('home.greeting.morning')}, ${name}. ${t('voice.greet')}`)}
          aria-label={t('voice.listen')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-400 text-white shadow-card hover:bg-accent-500"
        >
          🔊
        </button>
        {state.settings.voiceOn && (
          <button
            onClick={() => stopSpeaking()}
            aria-label={t('a11y.stopVoice')}
            title={t('a11y.stopVoice')}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-accent-500 shadow-card hover:bg-accent-200"
          >
            ⏹
          </button>
        )}
        <button
          onClick={() => setShowA11y(true)}
          aria-label={t('a11y.title')}
          title={t('a11y.title')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-700 shadow-card hover:bg-brand-50"
        >
          ♿
        </button>
        <LanguageSelector compact />

        <Modal open={showA11y} onClose={() => setShowA11y(false)} title={`♿ ${t('a11y.title')}`}>
          <div className="max-h-[70vh] overflow-y-auto">
            <AccessibilityControls />
          </div>
        </Modal>
      </div>
    </header>
  );
}

// ============================================================================
// Caregiver shell — desk-friendly side navigation.
// ============================================================================

const CAREGIVER_NAV = [
  { to: '/caregiver', label: 'cg.overview', Icon: GridIcon, end: true },
  { to: '/caregiver/patients', label: 'cg.patients', Icon: UserIcon },
  { to: '/caregiver/insights', label: 'cg.insights', Icon: LightbulbIcon },
  { to: '/caregiver/alerts', label: 'cg.alerts', Icon: AlertIcon },
  { to: '/caregiver/activity', label: 'cg.activity', Icon: ClockNavIcon },
  { to: '/caregiver/settings', label: 'cg.settings', Icon: ChartIcon },
];

// Voice assistance on the caregiver side — name the section you land on.
const CAREGIVER_PAGE_SPEECH: Record<string, string> = {
  '/caregiver': 'cg.overview',
  '/caregiver/patients': 'cg.patients',
  '/caregiver/insights': 'cg.insights',
  '/caregiver/alerts': 'cg.alerts',
  '/caregiver/activity': 'cg.activity',
  '/caregiver/settings': 'cg.settings',
};

function ClockNavIcon({ active }: { active?: boolean }) {
  return (
    <span className={active ? 'text-brand-700' : ''}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    </span>
  );
}

export function CaregiverShell({ children }: { children: React.ReactNode }) {
  const { t, state, speakText } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const unread = state.alerts.filter((a) => !a.read).length;

  useEffect(() => {
    const key = CAREGIVER_PAGE_SPEECH[location.pathname];
    if (!key || !state.settings.voiceOn) return;
    speakText(t(key));
  }, [location.pathname]);
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-white shadow-card md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
  <img
    src="/neurosaathi-header.png"
    alt="NeuroSaathi"
    className="h-12 w-auto object-contain"
  />
</div>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Caregiver">
          {CAREGIVER_NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-lg font-bold ${
                  isActive ? 'bg-brand-600 text-white' : 'text-brand-800 hover:bg-brand-50'
                }`
              }
            >
              <Icon active={false} />
              {t(label)}
              {label === 'cg.alerts' && unread > 0 && (
                <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-400 px-1 text-sm font-extrabold text-white">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-brand-100 p-4">
          <OfflineBadge />
          <button
            onClick={() => navigate('/')}
            className="mt-3 w-full rounded-2xl bg-brand-50 px-4 py-2 text-base font-bold text-brand-700 hover:bg-brand-100"
          >
            {state.caregiver.name} · {t('cg.patient.view')} →
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-brand-100 bg-brand-50/90 px-4 py-3 backdrop-blur md:px-8">
          <h1 className="text-2xl font-extrabold text-brand-900">{t('cg.title')}</h1>
          <div className="flex items-center gap-3">
            <OfflineBadge />
            <LanguageSelector />
            <button
              onClick={() => navigate('/')}
              className="rounded-full bg-white px-4 py-2 text-base font-bold text-brand-800 shadow-card hover:bg-brand-50 md:hidden"
            >
              {t('cg.patient.view')}
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>

      {/* mobile top tabs */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex overflow-x-auto border-t border-brand-100 bg-white px-2 py-2 md:hidden">
        {CAREGIVER_NAV.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                isActive ? 'bg-brand-600 text-white' : 'text-brand-800'
              }`
            }
          >
            <Icon active={false} /> {t(label)}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Offline banner that appears inside the shells.
// ============================================================================

function OfflineBanner() {
  const { t, isOffline, justConnected, pendingSync } = useApp();
  if (isOffline) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-warm-300 bg-warm-100 px-4 py-3 text-base font-bold text-warm-500">
        🟠 {t('offline.banner')}{' '}
        {pendingSync > 0 && <span className="ml-auto text-sm">({pendingSync} ⏳)</span>}
      </div>
    );
  }
  if (justConnected) {
    return <Toast message={`${t('offline.restored')} ${pendingSync} ${t('offline.synced')}`} tone="success" />;
  }
  return null;
}
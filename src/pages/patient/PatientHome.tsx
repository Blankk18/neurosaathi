import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, Chip, SectionTitle } from '@/components/ui';
import { PageHeader } from '@/components/common';
import { currentDifficulty, recentForGame, adaptDifficulty, LEVEL_TO_CARDS } from '@/engine/adaptive';
import type { GameKind } from '@/types';
import {
  SpeakerIcon,
  PlayIcon,
  MicIcon,
  HeartsIcon,
  PillIcon,
  WaterIcon,
  MealIcon,
  WalkIcon,
  SparkleIcon,
  ClockIcon,
  CheckCircleIcon,
  LeafIcon,
} from '@/components/Icons';

const ACTIVITIES: { game: GameKind; emoji: string; labelKey: string }[] = [
  { game: 'family-memory', emoji: '👨‍👩‍👧', labelKey: 'games.family' },
  { game: 'memory-match', emoji: '🧠', labelKey: 'games.memory' },
  { game: 'routine', emoji: '🕰️', labelKey: 'games.routine' },
];

const GAME_ROUTE: Record<GameKind, string> = {
  'memory-match': '/games/memory',
  // legacy — kept only to satisfy the exhaustive GameKind type; no UI surfaces it.
  'scene-memory': '/games/family',
  pattern: '/games/pattern',
  routine: '/games/routine',
  'family-memory': '/games/family',
  region: '/games/region',
};

export default function PatientHome() {
  const { t, state, speakText } = useApp();
  const navigate = useNavigate();
  const patient = state.patient;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t('home.greeting.morning');
    if (h < 17) return t('home.greeting.afternoon');
    return t('home.greeting.evening');
  }, [t]);

  const name = patient?.name ?? t('home.friend');

  // show a banner when a recent session triggered a difficulty change
  const adapted = useMemo(() => {
    return state.gameResults.some((r) => r.adaptationNote && r.nextDifficulty !== r.difficulty);
  }, [state.gameResults]);

  const todayLabel = useMemo(() => {
    try {
      return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    } catch {
      return '';
    }
  }, []);

  return (
    <div className="mx-auto max-w-[760px] space-y-6 pb-8">
      <PageHeader />

      {/* Quiet morning hero — soft gradient, Fraunces heading, patient name */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-50 via-white to-warm-50/70 p-6 shadow-card sm:p-8 fade-up">
        {/* soft decorative washes */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-100/60 blur-[0.5px]" aria-hidden />
        <div className="pointer-events-none absolute -left-12 bottom-6 h-36 w-36 rounded-full bg-warm-100/50" aria-hidden />
        <div className="pointer-events-none absolute right-12 top-1/2 hidden h-20 w-20 -translate-y-1/2 rounded-full bg-accent-50/60 sm:block" aria-hidden />

        <div className="relative">
          {/* eyebrow: date + calm marker */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-extrabold tracking-wide text-brand-600 shadow-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <LeafIcon size={12} />
            </span>
            <span className="uppercase tracking-widest">{todayLabel}</span>
            <span className="h-1 w-1 rounded-full bg-brand-300" aria-hidden />
            <span className="inline-flex items-center gap-1 font-bold normal-case tracking-normal text-brand-500">
              <ClockIcon size={12} /> calm pace
            </span>
          </div>

          <h1 className="mt-4 text-[2.15rem] font-extrabold leading-[1.05] tracking-tight text-brand-900 sm:text-[2.65rem]">
            {greeting}, <br />
            <span className="text-brand-700">{name}</span>{' '}
            <span aria-hidden className="inline-block align-baseline text-[1.9rem] sm:text-[2.2rem]">
              👋
            </span>
          </h1>

          <p className="mt-3 max-w-[30ch] text-lg font-semibold leading-relaxed text-neutral-600">
            A gentle start, exactly at your pace.
          </p>

          <button
            onClick={() => speakText(`${greeting}, ${name}. ${t('voice.greet')}`)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-base font-bold text-brand-700 shadow-card transition hover:bg-brand-50 hover:shadow-lift focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"
          >
            <SpeakerIcon size={18} /> {t('home.talk')}
          </button>

          {adapted && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-info-50 px-4 py-3 text-sm font-bold leading-snug text-info-800 ring-1 ring-info-100">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-info-600 shadow-sm">
                <SparkleIcon size={16} />
              </span>
              <span>{t('games.adapted.banner')}</span>
            </div>
          )}

          {/* Primary action — warm, huge, unmistakable */}
          <div className="mt-7">
            <button
              onClick={() => navigate(GAME_ROUTE['memory-match'])}
              className="btn-huge flex w-full items-center justify-center gap-3 bg-accent-500 text-white hover:bg-accent-600 shadow-lift rounded-3xl py-6 text-xl font-extrabold tracking-tight sm:text-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-300"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <PlayIcon size={22} />
              </span>
              {t('home.start.activity')}
            </button>
            <p className="mt-3 text-center text-sm font-semibold tracking-wide text-brand-700">
              2 – 5 minutes · Encouraging & easy to pause
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions: voice + mood + face setup — balanced 3-column hierarchy */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/voice')}
          className="card group flex items-center gap-3 p-4 text-left transition hover:shadow-lift focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300 sm:p-5"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-700 transition group-hover:bg-accent-100">
            <MicIcon size={22} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-base font-extrabold leading-tight text-brand-900 sm:text-lg">{t('home.talk')}</span>
            <span className="text-xs font-bold text-brand-700 sm:text-sm">Voice assist</span>
          </span>
        </button>
        <button
          onClick={() => navigate('/mood')}
          className="card group flex items-center gap-3 p-4 text-left transition hover:shadow-lift focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300 sm:p-5"
          aria-label={t('home.mood.checkin')}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-warm-50 text-warm-700 transition group-hover:bg-warm-100">
            <HeartsIcon size={22} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-base font-extrabold leading-tight text-brand-900 sm:text-lg">{t('home.mood.checkin')}</span>
            <span className="text-xs font-bold text-brand-700 sm:text-sm">How are you?</span>
          </span>
        </button>
        <button
          onClick={() => navigate('/face-setup')}
          className="card group flex items-center gap-3 p-4 text-left transition hover:shadow-lift focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300 sm:p-5"
          aria-label={t('face.setup.button')}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
            <span className="text-xl" aria-hidden="true">🛡️</span>
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-base font-extrabold leading-tight text-brand-900 sm:text-lg">{t('face.setup.button')}</span>
            <span className="text-xs font-bold text-brand-700 sm:text-sm">Sign in with face</span>
          </span>
        </button>
      </div>

      <SectionTitle icon="🎮">{t('home.today.activities')}</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {ACTIVITIES.map(({ game, emoji, labelKey }) => {
          const recent = recentForGame(state.gameResults, game);
          const prev = currentDifficulty(state.gameResults, game, 1);
          const d = adaptDifficulty(prev, recent);
          const cards = LEVEL_TO_CARDS[d.nextDifficulty] ?? 8;
          void cards;
          return (
            <button
              key={game}
              onClick={() => navigate(GAME_ROUTE[game])}
              className="card group flex flex-col items-center gap-3 p-5 text-center transition hover:shadow-lift sm:p-6"
            >
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-4xl transition group-hover:bg-brand-100"
                aria-hidden
              >
                {emoji}
              </span>
              <span className="text-center text-lg font-extrabold leading-tight text-brand-900">{t(labelKey)}</span>
              <Chip tone="brand">
                {t('games.level')} {d.nextDifficulty}
              </Chip>
            </button>
          );
        })}
      </div>

      <SectionTitle icon="🔔">{t('home.today.reminders')}</SectionTitle>
      <div className="space-y-3">
        {state.reminders.slice(0, 4).map((r) => {
          const visual =
            r.type === 'medicine'
              ? { bg: 'bg-info-50 text-info-600', icon: <PillIcon size={22} /> }
              : r.type === 'water'
                ? { bg: 'bg-brand-50 text-brand-600', icon: <WaterIcon size={22} /> }
                : r.type === 'walk'
                  ? { bg: 'bg-warm-50 text-warm-600', icon: <WalkIcon size={22} /> }
                  : { bg: 'bg-accent-50 text-accent-600', icon: <MealIcon size={22} /> };
          return (
            <Card key={r.id} className="flex items-center gap-4 p-4 sm:p-5" onClick={() => navigate('/reminders')}>
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${visual.bg}`} aria-hidden>
                {visual.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-extrabold leading-tight text-brand-900">{r.name}</div>
                <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-500">
                  <ClockIcon size={14} /> {r.time}
                </div>
              </div>
              {r.status === 'done' ? (
                <Chip tone="brand">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircleIcon size={14} /> {t('reminders.status.taken')}
                  </span>
                </Chip>
              ) : (
                <Chip tone="warm">• {t('reminders.status.pending')}</Chip>
              )}
            </Card>
          );
        })}
        {state.reminders.length === 0 && (
          <Card className="py-8 text-center">
            <div className="text-base font-semibold text-neutral-500">{t('home.noReminders')}</div>
          </Card>
        )}
      </div>
    </div>
  );
}

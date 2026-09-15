import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { Card, Chip, SectionTitle } from '@/components/ui';
import { currentDifficulty, recentForGame, adaptDifficulty } from '@/engine/adaptive';
import type { GameKind } from '@/types';
import {
  SparkleIcon,
  BrainIcon,
  TargetIcon,
  ClockIcon,
  UsersIcon,
  HomeIcon,
  LightbulbIcon,
  ShieldIcon,
  PlayIcon,
  SpeakerIcon,
  HeartIcon,
} from '@/components/Icons';

const GAME_ICONS: Record<GameKind, typeof BrainIcon> = {
  'memory-match': BrainIcon,
  // legacy — kept only to satisfy the exhaustive GameKind type; no hub card uses it.
  'scene-memory': BrainIcon,
  pattern: TargetIcon,
  routine: ClockIcon,
  'family-memory': UsersIcon,
  region: HomeIcon,
  'memories-from-home': UsersIcon,
};

const GAMES: { game: GameKind; route: string; titleKey: string; descKey: string }[] = [
  { game: 'memory-match', route: '/games/memory', titleKey: 'games.memory', descKey: 'games.memory.desc' },
  { game: 'pattern', route: '/games/pattern', titleKey: 'games.pattern', descKey: 'games.pattern.desc' },
  { game: 'routine', route: '/games/routine', titleKey: 'games.routine', descKey: 'games.routine.desc' },
  { game: 'family-memory', route: '/games/family', titleKey: 'games.family', descKey: 'games.family.desc' },
  { game: 'region', route: '/games/region', titleKey: 'games.region', descKey: 'games.region.desc' },
];

export default function GamesHub() {
  const { t, state, speakText } = useApp();
  const navigate = useNavigate();

  const adapted = state.gameResults.some((r) => r.adaptationNote && r.nextDifficulty !== r.difficulty);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col bg-canvas px-4 pb-28 pt-4">
      <PageHeader
        backTo="/home"
        title={t('games.title')}
        right={
          <button onClick={() => speakText(t('games.title'))} className="rounded-full bg-white p-3 text-xl shadow-card" aria-label="Speak">
            <SpeakerIcon size={22} />
          </button>
        }
      />

      {adapted && (
        <div className="mt-4 flex items-start gap-3 rounded-3xl bg-brand-50 px-5 py-4 text-left shadow-sm">
          <span className="mt-0.5 rounded-full bg-brand-100 p-2 text-brand-700">
            <LightbulbIcon size={22} />
          </span>
          <div>
            <p className="text-base font-bold text-brand-900">{t('games.adapted.banner')}</p>
            <p className="mt-1 text-sm text-brand-700/90">
              We fine-tune challenge based on your recent play so each game stays comfortable, not frustrating.
            </p>
          </div>
        </div>
      )}

      <section className="mt-5">
        <SectionTitle icon="🧩">
          {t('games.title')}
        </SectionTitle>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Signature Showcase: Memories from Home */}
          <Card
            onClick={() => navigate('/games/memories')}
            className="group relative col-span-full overflow-hidden border border-warm-300/80 bg-gradient-to-br from-warm-50 via-white to-warm-100/60 p-0 shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex flex-col sm:flex-row items-stretch">
              {/* Card Artwork */}
              <div className="relative h-48 sm:h-auto sm:w-5/12 overflow-hidden bg-warm-100 shrink-0">
                <img
                  src="/assets/memories-game/card_thumb.jpg"
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/40 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5" aria-hidden>
                  <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur-sm shadow-soft">
                    ✨ {t('memoriesHome.tag.personal')}
                  </span>
                  <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold text-warm-800 backdrop-blur-sm shadow-soft">
                    💛 {t('memoriesHome.tag.gentle')}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-xl bg-warm-100 p-2 text-warm-800 shadow-soft">
                      <HeartIcon size={20} />
                    </span>
                    <span className="text-xs font-extrabold uppercase tracking-widest text-warm-800">
                      Family Activity
                    </span>
                  </div>

                  <h3 className="mt-2.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-900">
                    {t('memoriesHome.title')}
                  </h3>
                  <p className="mt-2 text-base sm:text-lg font-semibold leading-relaxed text-brand-800/90">
                    {t('games.memoriesHome.desc')}
                  </p>
                </div>

                <div className="mt-5 pt-2">
                  <span className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-brand-600 px-7 py-3.5 text-lg font-extrabold text-white shadow-lift transition-colors group-hover:bg-brand-700">
                    ▶ {t('common.start')}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Flagship: Family Memory Challenge — prominent, warm, full width */}
          <Card
            onClick={() => navigate('/games/family')}
            className="group relative col-span-full flex flex-col items-start gap-3 overflow-hidden border-0 bg-gradient-to-br from-warm-50 via-brand-50 to-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="absolute right-4 top-4 flex items-center gap-1.5" aria-hidden>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-brand-700 shadow-card">✨ {t('family.challenge.tag.personalized')}</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-warm-700 shadow-card">🧩 {t('family.challenge.tag.adaptive')}</span>
            </div>
            <span className="inline-flex rounded-2xl bg-white p-3 text-brand-700 shadow-card transition-colors group-hover:bg-brand-100">
              <UsersIcon size={30} />
            </span>
            <span className="rounded-full bg-accent-400/90 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white">
              {t('family.challenge.eyebrow')}
            </span>
            <div className="space-y-1.5">
              <h3 className="text-2xl font-extrabold tracking-tight text-brand-900">{t('family.challenge.title')}</h3>
              <p className="max-w-[34ch] text-base font-semibold text-brand-700/90">{t('family.challenge.subtitle')}</p>
            </div>
            <span className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-lg font-extrabold text-white shadow-card transition-colors group-hover:bg-brand-700">
              🧭 {t('family.challenge.cta')} <PlayIcon size={18} />
            </span>
          </Card>

          {GAMES.filter((g) => g.game !== 'family-memory').map(({ game, route, titleKey, descKey }) => {
            const recent = recentForGame(state.gameResults, game);
            const prev = currentDifficulty(state.gameResults, game, 1);
            const d = adaptDifficulty(prev, recent);
            const Icon = GAME_ICONS[game];

            return (
              <Card
                key={game}
                onClick={() => navigate(route)}
                className="group relative flex flex-col items-start gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex w-full items-start justify-between">
                  <span className="inline-flex rounded-2xl bg-brand-50 p-3 text-brand-700 transition-colors group-hover:bg-brand-100">
                    <Icon size={26} />
                  </span>
                  <Chip tone="brand">
                    {t('games.level')} {d.nextDifficulty}
                  </Chip>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-brand-900">{t(titleKey)}</h3>
                  <p className="text-base text-neutral-600">{t(descKey)}</p>
                </div>

                <span className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-3.5 text-lg font-bold text-white shadow-sm transition-colors group-hover:bg-accent-600">
                  <PlayIcon size={18} /> Play
                </span>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex items-start gap-3 rounded-3xl bg-brand-50/80 p-5">
          <span className="mt-0.5 rounded-full bg-brand-100 p-2 text-brand-700">
            <SparkleIcon size={22} />
          </span>
          <div>
            <p className="text-base font-bold text-brand-900">{t('games.adapted.banner')}</p>
            <p className="mt-1 text-sm text-neutral-600">
              NeuroSaathi adapts gently in the background so you get just the right level of challenge.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-3xl bg-warm-50 p-5">
          <span className="mt-0.5 rounded-full bg-warm-100 p-2 text-warm-700">
            <ShieldIcon size={22} />
          </span>
          <div>
            <p className="text-base font-bold text-brand-900">Daily Cognitive Wellness</p>
            <p className="mt-1 text-sm text-warm-800">
              Adaptive games built for gentle daily practice, designed to feel friendly rather than clinical.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
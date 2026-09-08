import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { Card, Chip, SectionTitle } from '@/components/ui';
import { currentDifficulty, recentForGame, adaptDifficulty } from '@/engine/adaptive';
import type { GameKind } from '@/types';
import {
  SparkleIcon,
  BrainIcon,
  CameraIcon,
  TargetIcon,
  ClockIcon,
  UsersIcon,
  HomeIcon,
  LightbulbIcon,
  ShieldIcon,
  PlayIcon,
  SpeakerIcon,
} from '@/components/Icons';

const GAME_ICONS: Record<GameKind, typeof BrainIcon> = {
  'memory-match': BrainIcon,
  'scene-memory': CameraIcon,
  pattern: TargetIcon,
  routine: ClockIcon,
  'family-memory': UsersIcon,
  region: HomeIcon,
};

const GAMES: { game: GameKind; route: string; titleKey: string; descKey: string }[] = [
  { game: 'memory-match', route: '/games/memory', titleKey: 'games.memory', descKey: 'games.memory.desc' },
  { game: 'scene-memory', route: '/games/scene', titleKey: 'games.scene', descKey: 'games.scene.desc' },
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
          {GAMES.map(({ game, route, titleKey, descKey }) => {
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

                <span className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-lg font-bold text-white shadow-sm transition-colors group-hover:bg-accent-600">
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
            <p className="mt-1 text-sm text-brand-700/90">
              NeuroSaathi adapts gently in the background so you get just the right level of challenge.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-3xl bg-warm-50 p-5">
          <span className="mt-0.5 rounded-full bg-warm-100 p-2 text-warm-700">
            <ShieldIcon size={22} />
          </span>
          <div>
            <p className="text-base font-bold text-brand-900">Differentiators box</p>
            <p className="mt-1 text-sm text-warm-700">
              Adaptive games built for gentle daily practice, designed to feel friendly rather than clinical.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
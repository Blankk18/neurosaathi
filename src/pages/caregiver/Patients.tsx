import { useState, useEffect } from 'react';
import { useApp } from '@/state/AppContext';
import { Card, Chip, SectionTitle, StatTile, Disclaimer } from '@/components/ui';
import { difficultyLabel } from '@/engine/adaptive';
import { BrainIcon, TargetIcon, ClockIcon, HeartIcon } from '@/components/Icons';
import { ElderSelector } from '@/components/caregiver/ElderSelector';
import { gameService } from '@/services/gameService';
import type { DbElderProfile, DbGameSession } from '@/types/database';

const GAME_TITLE: Record<string, string> = {
  'memory-match': 'games.memory',
  'scene-memory': 'games.scene',
  pattern: 'games.pattern',
  routine: 'games.routine',
  'family-memory': 'games.family',
  region: 'games.region',
};

export default function Patients() {
  const { t, state } = useApp();
  const [selectedElder, setSelectedElder] = useState<DbElderProfile | null>(null);
  const activeElderId = selectedElder?.id || state.patient?.id || 'e0000000-0000-0000-0000-000000000001';
  const elderName = selectedElder?.name || state.patient?.name || 'Asha Sharma';
  const [dbSessions, setDbSessions] = useState<DbGameSession[]>([]);

  useEffect(() => {
    gameService.getSessions(activeElderId, 15).then((sessions) => {
      setDbSessions(sessions);
    });
  }, [activeElderId]);

  const recentSessions = dbSessions.length > 0
    ? dbSessions.map((s) => ({
        id: s.id,
        game: s.game_type as any,
        accuracy: s.accuracy,
        responseTimeSec: s.average_response_time,
        mistakes: s.mistakes,
        nextDifficulty: s.difficulty as any,
        playedAt: s.completed_at,
      }))
    : [...state.gameResults]
        .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
        .slice(0, 8);

  return (
    <div className="fade-in">
      {/* Multi-Elder Selector bar */}
      <div className="mb-5 rounded-3xl bg-white p-3 shadow-card">
        <ElderSelector
          selectedElderId={activeElderId}
          onSelectElder={setSelectedElder}
        />
      </div>
      {/* patient identity hero */}
      <Card className="mb-5 overflow-hidden p-0 ring-1 ring-black/[0.04]">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 px-6 py-6 text-white sm:px-8 sm:py-7">
          <div aria-hidden className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full bg-white/10" />
          <div aria-hidden className="pointer-events-none absolute -bottom-28 right-32 h-48 w-48 rounded-full bg-warm-300/25" />
          <div className="relative flex flex-wrap items-center gap-5">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 text-4xl font-extrabold text-white ring-2 ring-white/25">
              {elderName[0]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-3xl font-extrabold leading-tight">{elderName}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-brand-100">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon size={15} /> {t('cg.age')}: {selectedElder?.age ?? state.patient?.age ?? 68}
                </span>
                <span className="opacity-50" aria-hidden>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <HeartIcon size={15} /> {t('onboard.caregiver')}:{' '}
                  <b className="text-white">{state.caregiver?.name || 'Priya Sharma'}</b> ({state.caregiver?.relationship || 'Daughter'})
                </span>
              </div>
              <div className="mt-1 text-sm font-semibold text-brand-100/90">
                💫 {t('cg.patients.interests')}: {(selectedElder?.interests || state.patient?.interests || ['Music', 'Gardening']).join(', ')}
              </div>
            </div>
            <div className="shrink-0">
              <Chip tone="warm">
                {t('cg.lastActive')}: {t('cg.patients.today')}
              </Chip>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-6 py-4 sm:px-8">
          <Chip tone="brand">
            {t('cg.language')}: {(selectedElder?.preferred_language || state.patient?.language || 'hi').toUpperCase()}
          </Chip>
          <Chip tone="warm">{t('cg.region')}: {selectedElder?.region ?? state.patient?.region ?? 'assam'}</Chip>
        </div>
      </Card>

      {/* baseline cognitive profile */}
      <Card className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <BrainIcon size={18} />
          </span>
          <h3 className="text-lg font-extrabold tracking-tight text-brand-900">{t('baseline.title')}</h3>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              [t('baseline.memory'), state.profile?.baseline.memory ?? 72, '🧠'],
              [t('baseline.attention'), state.profile?.baseline.attention ?? 81, '👀'],
              [t('baseline.recall'), state.profile?.baseline.recall ?? 68, '💭'],
              [t('baseline.speed'), state.profile?.baseline.responseSpeed ?? 74, '⚡'],
            ] as const
          ).map(([label, v, icon]) => (
            <StatTile key={label} label={label} value={`${v}%`} icon={icon} />
          ))}
        </div>
        <div className="mt-4">
          <Disclaimer>{t('baseline.disclaimer')}</Disclaimer>
        </div>
      </Card>

      {/* per-game difficulty */}
      <Card className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warm-50 text-warm-600 ring-1 ring-warm-200">
            <TargetIcon size={18} />
          </span>
          <h3 className="text-lg font-extrabold tracking-tight text-brand-900">{t('cg.patients.diff.per')}</h3>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {state.profile &&
            (Object.entries(state.profile.difficulty) as [string, number][]).map(([g, d]) => (
              <Chip key={g} tone="brand">
                {t(GAME_TITLE[g] ?? g)} <span className="opacity-60">→</span> {difficultyLabel(d as never)}
              </Chip>
            ))}
        </div>
      </Card>

      {/* recent sessions */}
      <SectionTitle icon="🎮">{t('cg.patients.recent')}</SectionTitle>
      <Card className="ring-1 ring-black/[0.04]">
        {recentSessions.length === 0 ? (
          <p className="text-neutral-500">{t('cg.patients.noSessions')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="text-xs font-extrabold uppercase tracking-widest text-brand-500">
                  <th scope="col" className="py-2 pr-4">{t('cg.table.game')}</th>
                  <th scope="col" className="py-2 pr-4">{t('cg.table.accuracy')}</th>
                  <th scope="col" className="py-2 pr-4">{t('cg.table.time')}</th>
                  <th scope="col" className="py-2 pr-4">{t('cg.table.mistakes')}</th>
                  <th scope="col" className="py-2">{t('cg.table.level')}</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((r) => (
                  <tr key={r.id} className="border-t border-brand-100 transition hover:bg-brand-50/50">
                    <td className="py-3 pr-4 font-bold capitalize text-brand-900">{t(GAME_TITLE[r.game] ?? r.game)}</td>
                    <td className="py-3 pr-4 font-extrabold text-brand-700">{r.accuracy}%</td>
                    <td className="py-3 pr-4 text-neutral-600">{r.responseTimeSec}s</td>
                    <td className="py-3 pr-4 text-neutral-600">{r.mistakes}</td>
                    <td className="py-3">
                      <span className="chip bg-brand-50 text-brand-700">{difficultyLabel(r.nextDifficulty)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

import { useApp } from '@/state/AppContext';
import { Card, Chip, SectionTitle } from '@/components/ui';
import { difficultyLabel } from '@/engine/adaptive';

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
  const patient = state.patient;

  const recentSessions = [...state.gameResults]
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
    .slice(0, 8);

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        {/* patient card */}
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl font-extrabold text-brand-700">
              {patient?.name?.[0]}
            </span>
            <div>
              <div className="text-xl font-extrabold text-brand-900">{patient?.name}</div>
              <div className="text-sm font-semibold text-neutral-500">{t('cg.age')}: {patient?.age}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="brand">{t('cg.language')}: {patient?.language?.toUpperCase()}</Chip>
            <Chip tone="warm">{t('cg.region')}: {patient?.region}</Chip>
            <Chip tone="neutral">{t('cg.lastActive')}: {t('cg.patients.today')}</Chip>
          </div>
          <div className="mt-4 space-y-1 text-base text-neutral-700">
            <div>🛟 {t('onboard.caregiver')}: <b>{patient?.caregiverName}</b> ({patient?.caregiverRelationship})</div>
            <div>💫 {t('cg.patients.interests')}: {patient?.interests?.join(', ')}</div>
          </div>
        </Card>

        {/* profile */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-extrabold text-brand-900">{t('baseline.title')}</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                [t('baseline.memory'), state.profile?.baseline.memory ?? 72],
                [t('baseline.attention'), state.profile?.baseline.attention ?? 81],
                [t('baseline.recall'), state.profile?.baseline.recall ?? 68],
                [t('baseline.speed'), state.profile?.baseline.responseSpeed ?? 74],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="rounded-2xl bg-brand-50 p-3 text-center">
                <div className="text-2xl font-extrabold text-brand-900">{v}%</div>
                <div className="text-xs font-bold text-brand-600">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold uppercase tracking-wide text-brand-600">{t('cg.patients.diff.per')}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {state.profile &&
                (Object.entries(state.profile.difficulty) as [string, number][]).map(([g, d]) => (
                  <Chip key={g} tone="brand">
                    {t(GAME_TITLE[g] ?? g)} → {difficultyLabel(d as never)}
                  </Chip>
                ))}
            </div>
          </div>
        </Card>
      </div>

      <SectionTitle icon="🎮">{t('cg.patients.recent')}</SectionTitle>
      <Card>
        {recentSessions.length === 0 ? (
          <p className="text-neutral-500">{t('cg.patients.noSessions')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="text-sm font-bold uppercase text-brand-600">
                  <th className="py-2">{t('cg.table.game')}</th>
                  <th>{t('cg.table.accuracy')}</th>
                  <th>{t('cg.table.time')}</th>
                  <th>{t('cg.table.mistakes')}</th>
                  <th>{t('cg.table.level')}</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((r) => (
                  <tr key={r.id} className="border-t border-brand-100">
                    <td className="py-2 font-bold capitalize text-brand-900">{t(GAME_TITLE[r.game] ?? r.game)}</td>
                    <td>{r.accuracy}%</td>
                    <td>{r.responseTimeSec}s</td>
                    <td>{r.mistakes}</td>
                    <td>{difficultyLabel(r.nextDifficulty)}</td>
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
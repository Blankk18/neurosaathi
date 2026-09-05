import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useApp } from '@/state/AppContext';
import { Card, StatTile, SectionTitle, Chip } from '@/components/ui';
import { AiEnginePanel } from './AiEnginePanel';
import * as stats from './stats';
import { pastWeek, blendTrend } from './charts';

export default function CaregiverOverview() {
  const { t, state } = useApp();
  const patient = state.patient;

  const kpis = useMemo(
    () => ({
      engagement: stats.engagement(state),
      memory: stats.memoryPerformance(state),
      attention: stats.attentionLevel(state),
      adherence: stats.adherence(state),
      weekly: stats.weeklyActiveDays(state),
    }),
    [state],
  );

  const memory = useMemo(() => blendTrend(pastWeek(), stats.memoryTrend(state)), [state]);
  const accTime = useMemo(() => stats.accuracyVsTime(state), [state]);
  const adherenceData = useMemo(() => stats.adherenceChart(state), [state]);
  const freq = useMemo(() => stats.activityFreq(state), [state]);

  return (
    <div>
      {/* patient card */}
      <Card className="mb-5 flex flex-wrap items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl font-extrabold text-brand-700">
          {patient?.name?.[0] ?? 'A'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xl font-extrabold text-brand-900">{patient?.name ?? 'Asha Sharma'}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-neutral-500">
            <span>{t('cg.age')}: {patient?.age ?? 68}</span>
            <span>·</span>
            <span>{t('cg.language')}: {patient?.language ? patient.language.toUpperCase() : 'HI'}</span>
            <span>·</span>
            <span>{t('cg.region')}: {patient?.region ?? 'assam'}</span>
            <span>·</span>
            <span>{t('cg.lastActive')}: {stats.lastActiveLabel(state)}</span>
          </div>
        </div>
        <Chip tone="warm">
          {t('cg.relationship')}: {state.caregiver.relationship}
        </Chip>
      </Card>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label={t('cg.engagement')} value={`${kpis.engagement}%`} icon="🎯" />
        <StatTile label={t('cg.memory')} value={`${kpis.memory}%`} icon="🧠" />
        <StatTile label={t('cg.attention')} value={`${kpis.attention}%`} icon="👀" />
        <StatTile label={t('cg.adherence')} value={`${kpis.adherence}%`} icon="🔔" />
        <StatTile label={t('cg.weekly')} value={`${kpis.weekly}/7`} icon="📅" hint={t('cg.days.active')} />
      </div>

      {/* charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-lg font-extrabold text-brand-900">📈 {t('cg.7day.memory')}</h3>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={memory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7eee2" />
              <XAxis dataKey="label" stroke="#4e7040" />
              <YAxis domain={[40, 100]} stroke="#4e7040" />
              <Tooltip />
              <Line type="monotone" dataKey="memory" name="Memory %" stroke="#638c52" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-2 text-lg font-extrabold text-brand-900">⚖️ {t('cg.acc.vs.time')}</h3>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={accTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7eee2" />
              <XAxis dataKey="name" stroke="#4e7040" />
              <YAxis stroke="#4e7040" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#638c52" strokeWidth={3} />
              <Line type="monotone" dataKey="time" name="Response time (s)" stroke="#c9442a" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-2 text-lg font-extrabold text-brand-900">✔️ {t('cg.adherence.chart')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={adherenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7eee2" />
              <XAxis dataKey="day" stroke="#4e7040" />
              <YAxis domain={[0, 100]} stroke="#4e7040" />
              <Tooltip />
              <Bar dataKey="adherence" name="Adherence %" fill="#7fa66e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-2 text-lg font-extrabold text-brand-900">🗓️ {t('cg.activity.freq')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={freq}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7eee2" />
              <XAxis dataKey="name" stroke="#4e7040" />
              <YAxis allowDecimals={false} stroke="#4e7040" />
              <Tooltip />
              <Bar dataKey="plays" name="Plays" fill="#b98545" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* weekly trend + adaptation panel */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-lg font-extrabold text-brand-900">📊 {t('cg.weekly.trend')}</h3>
          <div className="flex flex-wrap gap-2">
            {stats.memoryTrend(state).map((d) => (
              <div key={d.day} className="flex flex-col items-center rounded-2xl bg-brand-50 px-3 py-2">
                <span className="text-sm font-bold text-brand-600">{d.day}</span>
                <span className="text-xl font-extrabold text-brand-900">{d.memory}%</span>
              </div>
            ))}
          </div>
        </Card>

        <AiEnginePanel />
      </div>

      <SectionTitle icon="⚜️">{t('cg.differentiators.title')}</SectionTitle>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ['🧠', 'cg.diff.adaptive', 'cg.diff.adaptive.sub'],
          ['🏡', 'cg.diff.cultural', 'cg.diff.cultural.sub'],
          ['👨‍👩‍👧', 'cg.diff.family', 'cg.diff.family.sub'],
          ['🟠', 'cg.diff.offline', 'cg.diff.offline.sub'],
        ].map(([ic, title, sub]) => (
          <div key={title} className="rounded-2xl bg-white p-3 text-center shadow-card">
            <div className="text-2xl">{ic}</div>
            <div className="text-sm font-extrabold text-brand-900">{t(title)}</div>
            <div className="text-xs text-neutral-500">{t(sub)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
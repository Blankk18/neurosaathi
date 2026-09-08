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
    <div className="fade-in space-y-6">
      {/* patient identity card */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-4 bg-gradient-to-br from-brand-50 via-white to-warm-50 p-5 sm:p-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-600 text-2xl font-extrabold text-white shadow-soft ring-4 ring-white/70">
            {patient?.name?.[0] ?? 'A'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-extrabold text-brand-900">{patient?.name ?? 'Asha Sharma'}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip tone="brand">{t('cg.age')}: {patient?.age ?? 68}</Chip>
              <Chip tone="brand">{t('cg.language')}: {patient?.language ? patient.language.toUpperCase() : 'HI'}</Chip>
              <Chip tone="brand">{t('cg.region')}: {patient?.region ?? 'assam'}</Chip>
              <Chip tone="info">{t('cg.lastActive')}: {stats.lastActiveLabel(state)}</Chip>
            </div>
          </div>
          <Chip tone="warm">{t('cg.relationship')}: {state.caregiver.relationship}</Chip>
        </div>
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
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="fade-up">
          <h3 className="mb-3 text-lg font-extrabold text-brand-900">📈 {t('cg.7day.memory')}</h3>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={memory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e3" />
              <XAxis dataKey="label" stroke="#5f7d6e" tickLine={false} axisLine={false} />
              <YAxis domain={[40, 100]} stroke="#5f7d6e" tickLine={false} axisLine={false} width={34} />
              <Tooltip />
              <Line type="monotone" dataKey="memory" name="Memory %" stroke="#638c52" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="fade-up">
          <h3 className="mb-3 text-lg font-extrabold text-brand-900">⚖️ {t('cg.acc.vs.time')}</h3>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={accTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e3" />
              <XAxis dataKey="name" stroke="#5f7d6e" tickLine={false} axisLine={false} />
              <YAxis stroke="#5f7d6e" tickLine={false} axisLine={false} width={34} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#638c52" strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="time" name="Response time (s)" stroke="#c98b45" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="fade-up">
          <h3 className="mb-3 text-lg font-extrabold text-brand-900">✔️ {t('cg.adherence.chart')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={adherenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e3" vertical={false} />
              <XAxis dataKey="day" stroke="#5f7d6e" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="#5f7d6e" tickLine={false} axisLine={false} width={34} />
              <Tooltip cursor={{ fill: 'rgba(99,140,82,0.06)' }} />
              <Bar dataKey="adherence" name="Adherence %" fill="#7fa66e" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="fade-up">
          <h3 className="mb-3 text-lg font-extrabold text-brand-900">🗓️ {t('cg.activity.freq')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={freq}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e3" vertical={false} />
              <XAxis dataKey="name" stroke="#5f7d6e" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="#5f7d6e" tickLine={false} axisLine={false} width={34} />
              <Tooltip cursor={{ fill: 'rgba(201,139,69,0.06)' }} />
              <Bar dataKey="plays" name="Plays" fill="#c98b45" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* weekly trend + adaptation panel */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="fade-up">
          <h3 className="mb-4 text-lg font-extrabold text-brand-900">📊 {t('cg.weekly.trend')}</h3>
          <div className="flex flex-wrap gap-2">
            {stats.memoryTrend(state).map((d) => (
              <div key={d.day} className="flex flex-col items-center rounded-2xl bg-brand-50 px-3.5 py-2.5 ring-1 ring-brand-100/60">
                <span className="text-xs font-bold text-brand-600">{d.day}</span>
                <span className="mt-0.5 text-xl font-extrabold text-brand-900">{d.memory}%</span>
              </div>
            ))}
          </div>
        </Card>

        <AiEnginePanel />
      </div>

      <SectionTitle icon="⚜️">{t('cg.differentiators.title')}</SectionTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['🧠', 'cg.diff.adaptive', 'cg.diff.adaptive.sub'],
          ['🏡', 'cg.diff.cultural', 'cg.diff.cultural.sub'],
          ['👨‍👩‍👧', 'cg.diff.family', 'cg.diff.family.sub'],
          ['🟠', 'cg.diff.offline', 'cg.diff.offline.sub'],
        ].map(([ic, title, sub]) => (
          <div key={title} className="flex flex-col items-center gap-1.5 rounded-3xl bg-white p-4 text-center shadow-card transition-shadow hover:shadow-soft">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warm-50 text-2xl">{ic}</span>
            <div className="text-sm font-extrabold text-brand-900">{t(title)}</div>
            <div className="text-xs leading-relaxed text-neutral-500">{t(sub)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
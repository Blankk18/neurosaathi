import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, Button, ProgressRing, Chip, Disclaimer } from '@/components/ui';
import { simulateDecline, evaluateAttentionIndicator } from '@/engine/alerts';
import { generatedInsights } from '../caregiver/stats';

interface Step {
  id: number;
  icon: string;
  titleKey: string;
  descKey: string;
}

const STEPS: Step[] = [
  { id: 1, icon: '👋', titleKey: 'demo.step1.title', descKey: 'demo.step1.desc' },
  { id: 2, icon: '🎤', titleKey: 'demo.step2.title', descKey: 'demo.step2.desc' },
  { id: 3, icon: '🧠', titleKey: 'demo.step3.title', descKey: 'demo.step3.desc' },
  { id: 4, icon: '🧮', titleKey: 'demo.step4.title', descKey: 'demo.step4.desc' },
  { id: 5, icon: '🤖', titleKey: 'demo.step5.title', descKey: 'demo.step5.desc' },
  { id: 6, icon: '💊', titleKey: 'demo.step6.title', descKey: 'demo.step6.desc' },
  { id: 7, icon: '👨‍👩‍👧', titleKey: 'demo.step7.title', descKey: 'demo.step7.desc' },
  { id: 8, icon: '🟠', titleKey: 'demo.step8.title', descKey: 'demo.step8.desc' },
  { id: 9, icon: '🔄', titleKey: 'demo.step9.title', descKey: 'demo.step9.desc' },
  { id: 10, icon: '📊', titleKey: 'demo.step10.title', descKey: 'demo.step10.desc' },
  { id: 11, icon: '💡', titleKey: 'demo.step11.title', descKey: 'demo.step11.desc' },
  { id: 12, icon: '⚠️', titleKey: 'demo.step12.title', descKey: 'demo.step12.desc' },
];

export default function DemoMode() {
  const { t, state, dispatch, speakText, runSync, resetAll } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [miniMatched, setMiniMatched] = useState(false);

  const cur = STEPS[step];

  useEffect(() => {
    dispatch({ type: 'SET_DEMO', active: true, step: step + 1 });
  }, [step, dispatch]);

  useEffect(() => {
    // auto-speak each step intro (voice demonstration)
    speakText(`${t(STEPS[step].titleKey)}. ${t(STEPS[step].descKey)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const advance = () => {
    if (step >= STEPS.length - 1) {
      dispatch({ type: 'SET_DEMO', active: false, completed: true });
      navigate('/');
      return;
    }
    setStep((s) => s + 1);
  };

  const insights = useMemo(() => generatedInsights(state.gameResults), [state.gameResults]);

  const clockIcon = (t: string, done: boolean) => `${done ? '✅' : '○'} ${t}`;

  const demoSync = async () => {
    await runSync();
  };

  const renderStep = (s: Step) => {
    switch (s.id) {
      case 1:
        return (
          <StepShell>
            <p className="text-lg font-semibold text-brand-700">{t('demo.onboard.collected')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone="brand">Name: Asha Sharma</Chip>
              <Chip tone="brand">Age 68</Chip>
              <Chip tone="warm">Language: हिन्दी</Chip>
              <Chip tone="brand">Caregiver: Rohan (Son)</Chip>
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-500">{t('demo.onboard.after')}</p>
          </StepShell>
        );
      case 2:
        return (
          <StepShell>
            <div className="mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full bg-accent-400 text-white shadow-lift pulse-soft" style={{ fontSize: 44 }}>
              🎤
            </div>
            <div className="mt-4 space-y-2 text-left">
              <div className="rounded-2xl bg-brand-100 px-4 py-2 text-right font-semibold text-brand-900">{t('demo.voice.user')}</div>
              <div className="rounded-2xl bg-brand-600 px-4 py-2 font-semibold text-white">
                {t('demo.voice.reply')}
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-500">{t('demo.voice.fallback')}</p>
            <Button variant="secondary" size="md" className="mt-3" onClick={() => navigate('/voice')}>
              {t('demo.voice.try')}
            </Button>
          </StepShell>
        );
      case 3:
        return (
          <StepShell>
            <button onClick={() => setMiniMatched(true)} className="mt-2 grid w-full grid-cols-4 gap-2">
              {['🍵', '🎒', '🍵', '🎒'].map((e, i) => (
                <span
                  key={i}
                  className={`flex aspect-square items-center justify-center rounded-2xl text-3xl transition ${miniMatched ? 'bg-brand-50' : 'bg-brand-600'}`}
                >
                  {miniMatched ? e : '❓'}
                </span>
              ))}
            </button>
            <p className="mt-2 text-sm font-semibold text-neutral-500">
              {miniMatched ? t('demo.memory.matched') : t('demo.memory.reveal')}
            </p>
            <p className="mt-2 text-sm font-semibold text-neutral-500">{t('demo.memory.scale')}</p>
          </StepShell>
        );
      case 4:
        return (
          <StepShell>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center rounded-2xl bg-brand-50 p-3">
                <ProgressRing value={88} size={84} />
                <span className="mt-1 text-sm font-bold">{t('games.accuracy')}</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-brand-50 p-3">
                <span className="text-3xl font-extrabold text-brand-900">4.2s</span>
                <span className="text-sm font-bold">{t('games.time')}</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-brand-50 p-3">
                <span className="text-3xl font-extrabold text-brand-900">1</span>
                <span className="text-sm font-bold">{t('games.mistakes')}</span>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-500">
              {t('demo.score.write')} {clockIcon('', true)}
            </p>
          </StepShell>
        );
      case 5:
        return (
          <StepShell>
            <div className="mt-2 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                <span className="text-3xl">📊</span>
                <div className="flex-1">
                  <div className="font-bold text-brand-900">{t('demo.adapt.trend')}</div>
                  <div className="text-sm text-neutral-500">82% → 80% → 84% → 88%</div>
                </div>
              </div>
              <div className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-4">
                <div className="font-extrabold text-brand-900">{t('demo.adapt.decision')}</div>
                <div className="text-2xl font-extrabold text-brand-800">{t('demo.adapt.level', { a: 2, b: 3 })}</div>
                <p className="mt-1 text-sm font-semibold text-brand-700">{t('demo.adapt.quote')}</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-500">{t('demo.adapt.window')}</p>
          </StepShell>
        );
      case 6:
        return (
          <StepShell>
            <div className="mt-2 space-y-2">
              {[
                ['💊', 'Medicine', '1:00 PM', 'done'],
                ['💧', 'Drink Water', '2:00 PM', 'done'],
                ['🚶', 'Evening Walk', '5:00 PM', 'pending'],
              ].map(([ic, name, time, st]) => (
                <div key={name as string} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                  <span className="text-2xl">{ic}</span>
                  <span className="flex-1 font-bold text-brand-900">{name}</span>
                  <span className="font-bold text-brand-600">{time}</span>
                  <Chip tone={st === 'done' ? 'brand' : 'warm'}>{st === 'done' ? '✓ Taken' : '• pending'}</Chip>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-500">{t('demo.reminder.actions')}</p>
          </StepShell>
        );
      case 7:
        return (
          <StepShell>
            <div className="mt-2 flex flex-col items-center gap-3 rounded-2xl bg-white p-4 shadow-card">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-extrabold text-brand-700">RI</span>
              <div className="text-xl font-extrabold text-brand-900">{t('demo.family.who')}</div>
              <div className="grid w-full grid-cols-1 gap-2">
                {['Riya', 'Meena', 'Arjun'].map((o, i) => (
                  <div key={o} className={`flex items-center justify-between rounded-xl px-4 py-2 text-lg font-bold ${i === 0 ? 'bg-brand-50 text-brand-800' : 'text-neutral-600'}`}>
                    {o} {i === 0 && <span className="text-brand-600">✓</span>}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-500">{t('demo.family.generated')}</p>
          </StepShell>
        );
      case 8:
        return (
          <StepShell>
            <button
              onClick={() => { dispatch({ type: 'UPDATE_SETTINGS', settings: { simulateOffline: true } }); setStep((s) => s); }}
              className="btn-huge mt-2"
            >
              🟠 {t('common.simulate.offline')}
            </button>
            <div className="mt-3 rounded-2xl border-2 border-warm-300 bg-warm-100 px-4 py-3 font-bold text-warm-500">
              {t('demo.offline.banner')}
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-500">{t('demo.offline.works')}</p>
            <Button variant="secondary" size="md" className="mt-3" onClick={() => { dispatch({ type: 'UPDATE_SETTINGS', settings: { simulateOffline: false } }); }}>
              {t('demo.offline.off')}
            </Button>
          </StepShell>
        );
      case 9:
        return (
          <StepShell>
            <div className="mt-2 space-y-2">
              {[
                ['🎮', 'Memory Game', 'Score 80%', 'pending'],
                ['🎮', 'Pattern Game', 'Score 90%', 'pending'],
                ['🔔', 'Reminder', 'Completed', 'pending'],
              ].map(([ic, label, det, st]) => (
                <div key={label as string} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                  <span className="text-2xl">{ic}</span>
                  <div className="flex-1">
                    <div className="font-bold text-brand-900">{label}</div>
                    <div className="text-sm text-neutral-500">{det}</div>
                  </div>
                  <Chip tone={st === 'pending' ? 'warm' : 'brand'}>{st === 'pending' ? '⏳ waiting' : '✓ synced'}</Chip>
                </div>
              ))}
            </div>
            <Button variant="primary" size="md" className="mt-3" onClick={() => demoSync()}>
              🔄 {t('common.sync')}
            </Button>
            <p className="mt-2 text-sm font-semibold text-neutral-500">
              {t('demo.sync.records', { n: state.syncRecords.filter((r) => r.status === 'synced').length })}
            </p>
          </StepShell>
        );
      case 10:
        return (
          <StepShell>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {[
                ['🎯', 'Engagement', '78%'],
                ['🧠', 'Memory', '74%'],
                ['👀', 'Attention', '82%'],
                ['🔔', 'Adherence', '91%'],
                ['📅', 'Weekly', '5/7'],
              ].map(([ic, label, v]) => (
                <div key={label as string} className="rounded-2xl bg-brand-50 p-3 text-center">
                  <div className="text-2xl">{ic}</div>
                  <div className="text-xl font-extrabold text-brand-900">{v}</div>
                  <div className="text-xs font-bold text-brand-600">{label}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-500">{t('demo.dash.charts')}</p>
            <Button variant="secondary" size="md" className="mt-3" onClick={() => navigate('/caregiver')}>
              {t('demo.dash.open')}
            </Button>
          </StepShell>
        );
      case 11:
        return (
          <StepShell>
            <div className="mt-2 space-y-2">
              {insights.slice(0, 3).map((ins, i) => (
                <div key={i} className="rounded-2xl bg-brand-50 p-3 text-left font-semibold text-brand-800">
                  💡 {ins}
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Disclaimer>{t('cg.insight.label')}</Disclaimer>
            </div>
          </StepShell>
        );
      case 12:
        return (
          <StepShell>
            <button
              onClick={() => {
                const decline = simulateDecline();
                const ev = evaluateAttentionIndicator([...state.gameResults, ...decline], state.reminders);
                dispatch({ type: 'ADD_RESULTS', results: decline });
                if (ev.alert) dispatch({ type: 'ADD_ALERT', alert: ev.alert });
              }}
              className="btn-huge mt-2"
            >
              ⚠️ {t('cg.triggered')}
            </button>
            <div className="mt-3 rounded-2xl border-2 border-accent-300 bg-accent-50 p-4">
              <div className="font-extrabold text-accent-400">{t('cg.attention.title')}</div>
              <p className="text-sm font-semibold text-brand-800">
                {t('cg.attention.msg')} <b>{t('cg.attention.notdiagnosis')}</b>
              </p>
              <div className="mt-2 text-sm font-bold text-brand-700">
                {t('cg.attention.why')}
              </div>
              <ul className="list-inside text-sm text-brand-800">
                <li>• {t('cg.reason.accDecrease')}</li>
                <li>• {t('cg.reason.rt')}</li>
                <li>• {t('cg.reason.skipped')}</li>
              </ul>
            </div>
          </StepShell>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-900">🎬 {t('demo.title')}</h1>
            <p className="text-lg font-semibold text-brand-700">{t('demo.guide')}</p>
          </div>
          <button onClick={() => { dispatch({ type: 'SET_DEMO', active: false }); navigate('/'); }} className="rounded-full bg-white px-4 py-2 font-bold text-brand-800 shadow-card">
            ✕ {t('demo.exit')}
          </button>
        </header>

        {/* progress */}
        <div className="mt-5 rounded-2xl bg-white p-3 shadow-card">
          <div className="flex items-center justify-between text-sm font-bold text-brand-700">
            <span>
              {t('demo.step')} {step + 1}/{STEPS.length}
            </span>
            <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-brand-100">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {/* step chips */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={`rounded-full px-3 py-1 text-sm font-bold ${i <= step ? 'bg-brand-600 text-white' : 'bg-white text-neutral-400'}`}
            >
              {i < step ? '✓' : s.icon}
            </button>
          ))}
        </div>

        <Card className="mt-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden>{cur.icon}</span>
            <div>
              <div className="text-xl font-extrabold text-brand-900">{t(cur.titleKey)}</div>
              <div className="text-base font-semibold text-neutral-600">{t(cur.descKey)}</div>
            </div>
          </div>
          <div className="mt-4">{renderStep(cur)}</div>
        </Card>

        {/* controls */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => { resetAll(); setStep(0); }} disabled={step === 0 && state.demo.step <= 1}>
            ↺ {t('demo.restart')}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="secondary" size="md" onClick={() => setStep((s) => s - 1)}>
                ← {t('demo.back')}
              </Button>
            )}
            <Button variant="huge" size="md" onClick={advance} className="!py-4">
              {step >= STEPS.length - 1 ? `🏁 ${t('demo.finish')}` : `${t('demo.next')} →`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepShell({ children }: { children: React.ReactNode }) {
  return <div className="text-center">{children}</div>;
}
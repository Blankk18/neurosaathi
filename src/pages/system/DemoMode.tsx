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
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Chip tone="brand">Name: Asha Sharma</Chip>
              <Chip tone="brand">Age 68</Chip>
              <Chip tone="warm">Language: हिन्दी</Chip>
              <Chip tone="brand">Caregiver: Rohan (Son)</Chip>
            </div>
            <div className="mx-auto mt-5 max-w-xl rounded-2xl bg-brand-50/70 px-4 py-3 ring-1 ring-brand-100">
              <p className="text-sm font-semibold leading-relaxed text-neutral-600">{t('demo.onboard.after')}</p>
            </div>
          </StepShell>
        );
      case 2:
        return (
          <StepShell>
            <div className="mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent-400 to-accent-500 text-white shadow-lift ring-4 ring-accent-100 pulse-soft" style={{ fontSize: 42 }}>
              🎤
            </div>
            <div className="mx-auto mt-5 max-w-md space-y-2.5 text-left">
              <div className="rounded-2xl rounded-br-md bg-brand-50 px-4 py-3 text-right font-semibold text-brand-900 ring-1 ring-brand-100">{t('demo.voice.user')}</div>
              <div className="rounded-2xl rounded-bl-md bg-brand-700 px-4 py-3 font-semibold text-white shadow-card">
                {t('demo.voice.reply')}
              </div>
            </div>
            <p className="mx-auto mt-4 max-w-md text-sm font-semibold leading-relaxed text-neutral-500">{t('demo.voice.fallback')}</p>
            <Button variant="secondary" size="md" className="mt-4 rounded-full" onClick={() => navigate('/voice')}>
              {t('demo.voice.try')}
            </Button>
          </StepShell>
        );
      case 3:
        return (
          <StepShell>
            <button onClick={() => setMiniMatched(true)} className="mx-auto mt-2 grid w-full max-w-[280px] grid-cols-4 gap-2.5">
              {['🍵', '🎒', '🍵', '🎒'].map((e, i) => (
                <span
                  key={i}
                  className={`flex aspect-square items-center justify-center rounded-2xl text-3xl shadow-card ring-1 transition-all duration-300 ${miniMatched ? 'bg-white ring-brand-200' : 'bg-brand-600 ring-brand-700 text-white'}`}
                >
                  {miniMatched ? e : '❓'}
                </span>
              ))}
            </button>
            <p className="mt-3 text-sm font-bold text-brand-700">
              {miniMatched ? t('demo.memory.matched') : t('demo.memory.reveal')}
            </p>
            <p className="mx-auto mt-2 max-w-md rounded-xl bg-canvas px-3 py-2 text-sm font-semibold text-neutral-500 ring-1 ring-brand-100/60">{t('demo.memory.scale')}</p>
          </StepShell>
        );
      case 4:
        return (
          <StepShell>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center rounded-2xl bg-brand-50 p-3 ring-1 ring-brand-100">
                <ProgressRing value={88} size={84} />
                <span className="mt-1.5 text-sm font-bold text-brand-700">{t('games.accuracy')}</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3 shadow-card ring-1 ring-brand-100">
                <span className="text-3xl font-extrabold tracking-tight text-brand-900">4.2s</span>
                <span className="text-sm font-bold text-neutral-500">{t('games.time')}</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3 shadow-card ring-1 ring-brand-100">
                <span className="text-3xl font-extrabold text-brand-900">1</span>
                <span className="text-sm font-bold text-neutral-500">{t('games.mistakes')}</span>
              </div>
            </div>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-neutral-600 ring-1 ring-brand-100">
              {t('demo.score.write')} {clockIcon('', true)}
            </p>
          </StepShell>
        );
      case 5:
        return (
          <StepShell>
            <div className="mt-2 space-y-3 text-left">
              <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-brand-100">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-xl ring-1 ring-brand-100">📊</span>
                <div className="flex-1">
                  <div className="font-extrabold text-brand-900">{t('demo.adapt.trend')}</div>
                  <div className="text-sm font-semibold text-neutral-500">82% → 80% → 84% → 88%</div>
                </div>
              </div>
              <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4 shadow-sm">
                <div className="text-sm font-extrabold tracking-wide text-brand-600">{t('demo.adapt.decision')}</div>
                <div className="text-2xl font-extrabold tracking-tight text-brand-800">{t('demo.adapt.level', { a: 2, b: 3 })}</div>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-brand-700">{t('demo.adapt.quote')}</p>
              </div>
            </div>
            <p className="mx-auto mt-3 max-w-md rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">{t('demo.adapt.window')}</p>
          </StepShell>
        );
      case 6:
        return (
          <StepShell>
            <div className="mt-2 space-y-2.5 text-left">
              {[
                ['💊', 'Medicine', '1:00 PM', 'done'],
                ['💧', 'Drink Water', '2:00 PM', 'done'],
                ['🚶', 'Evening Walk', '5:00 PM', 'pending'],
              ].map(([ic, name, time, st]) => (
                <div key={name as string} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card ring-1 ring-brand-100">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-xl ring-1 ring-brand-100">{ic}</span>
                  <span className="flex-1 font-bold text-brand-900">{name}</span>
                  <span className="text-sm font-bold text-brand-600">{time}</span>
                  <Chip tone={st === 'done' ? 'brand' : 'warm'}>{st === 'done' ? '✓ Taken' : '• pending'}</Chip>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-neutral-500">{t('demo.reminder.actions')}</p>
          </StepShell>
        );
      case 7:
        return (
          <StepShell>
            <div className="mx-auto mt-2 flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-white p-5 shadow-card ring-1 ring-brand-100">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-50 text-2xl font-extrabold text-brand-700 ring-1 ring-brand-200">RI</span>
              <div className="text-xl font-extrabold tracking-tight text-brand-900">{t('demo.family.who')}</div>
              <div className="grid w-full grid-cols-1 gap-2">
                {['Riya', 'Meena', 'Arjun'].map((o, i) => (
                  <div key={o} className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-base font-bold ring-1 ${i === 0 ? 'bg-brand-600 text-white ring-brand-700 shadow-sm' : 'bg-canvas text-neutral-600 ring-brand-100'}`}>
                    {o} {i === 0 && <span className={i === 0 ? 'text-white' : 'text-brand-600'}>✓</span>}
                  </div>
                ))}
              </div>
            </div>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-neutral-500">{t('demo.family.generated')}</p>
          </StepShell>
        );
      case 8:
        return (
          <StepShell>
            <button
              onClick={() => { dispatch({ type: 'UPDATE_SETTINGS', settings: { simulateOffline: true } }); setStep((s) => s); }}
              className="btn-huge mt-2 shadow-lift"
            >
              🟠 {t('common.simulate.offline')}
            </button>
            <div className="mx-auto mt-4 max-w-md rounded-2xl border border-warm-200 bg-gradient-to-br from-warm-50 to-white px-4 py-3.5 font-bold leading-relaxed text-warm-700 shadow-sm">
              {t('demo.offline.banner')}
            </div>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-neutral-500">{t('demo.offline.works')}</p>
            <Button variant="secondary" size="md" className="mt-4 rounded-full" onClick={() => { dispatch({ type: 'UPDATE_SETTINGS', settings: { simulateOffline: false } }); }}>
              {t('demo.offline.off')}
            </Button>
          </StepShell>
        );
      case 9:
        return (
          <StepShell>
            <div className="mt-2 space-y-2.5 text-left">
              {[
                ['🎮', 'Memory Game', 'Score 80%', 'pending'],
                ['🎮', 'Pattern Game', 'Score 90%', 'pending'],
                ['🔔', 'Reminder', 'Completed', 'pending'],
              ].map(([ic, label, det, st]) => (
                <div key={label as string} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card ring-1 ring-brand-100">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-xl ring-1 ring-brand-100">{ic}</span>
                  <div className="flex-1">
                    <div className="font-bold leading-none text-brand-900">{label}</div>
                    <div className="text-sm font-semibold text-neutral-500">{det}</div>
                  </div>
                  <Chip tone={st === 'pending' ? 'warm' : 'brand'}>{st === 'pending' ? '⏳ waiting' : '✓ synced'}</Chip>
                </div>
              ))}
            </div>
            <Button variant="primary" size="md" className="mt-4 rounded-full shadow-sm" onClick={() => demoSync()}>
              🔄 {t('common.sync')}
            </Button>
            <p className="mt-3 inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-neutral-600 ring-1 ring-brand-100">
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
                <div key={label as string} className="rounded-2xl bg-gradient-to-br from-white to-brand-50/60 p-3.5 text-center shadow-card ring-1 ring-brand-100">
                  <div className="text-2xl">{ic}</div>
                  <div className="text-xl font-extrabold tracking-tight text-brand-900">{v}</div>
                  <div className="text-xs font-bold tracking-wide text-brand-600">{label}</div>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-neutral-500">{t('demo.dash.charts')}</p>
            <Button variant="secondary" size="md" className="mt-4 rounded-full" onClick={() => navigate('/caregiver')}>
              {t('demo.dash.open')}
            </Button>
          </StepShell>
        );
      case 11:
        return (
          <StepShell>
            <div className="mt-2 space-y-2.5 text-left">
              {insights.slice(0, 3).map((ins, i) => (
                <div key={i} className="rounded-2xl bg-gradient-to-br from-brand-50 to-white p-4 text-left font-semibold leading-relaxed text-brand-800 ring-1 ring-brand-100">
                  <span className="mr-1.5">💡</span>{ins}
                </div>
              ))}
            </div>
            <div className="mx-auto mt-4 max-w-xl">
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
              className="btn-huge mt-2 shadow-lift"
            >
              ⚠️ {t('cg.triggered')}
            </button>
            <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-accent-200 bg-gradient-to-br from-accent-50 to-white p-5 text-left shadow-sm">
              <div className="font-extrabold tracking-tight text-accent-600">{t('cg.attention.title')}</div>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-brand-800">
                {t('cg.attention.msg')} <b className="text-brand-900">{t('cg.attention.notdiagnosis')}</b>
              </p>
              <div className="mt-3 text-sm font-bold text-brand-700">
                {t('cg.attention.why')}
              </div>
              <ul className="mt-1.5 list-inside space-y-1 text-sm font-semibold text-brand-800">
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

  const percent = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-canvas bg-gradient-to-b from-brand-50/70 via-canvas to-white">
      {/* top brand bar */}
      <header className="sticky top-0 z-20 border-b border-brand-100/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/neurosaathi-header.png" alt="NeuroSaathi" className="h-9 w-auto shrink-0 object-contain" />
            <span className="hidden h-6 w-px shrink-0 bg-brand-100 sm:block" aria-hidden />
            <div className="hidden min-w-0 text-left sm:block">
              <div className="truncate text-sm font-extrabold leading-none tracking-tight text-brand-900">🎬 {t('demo.title')}</div>
              <div className="truncate text-xs font-semibold text-neutral-500">{t('demo.guide')}</div>
            </div>
          </div>
          <button
            onClick={() => { dispatch({ type: 'SET_DEMO', active: false }); navigate('/'); }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow-card ring-1 ring-brand-100 transition hover:bg-brand-50"
          >
            ✕ {t('demo.exit')}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pb-10 pt-6 sm:pt-8">
        {/* mobile title */}
        <div className="text-center sm:hidden fade-up">
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">🎬 {t('demo.title')}</h1>
          <p className="mt-1 text-sm font-semibold text-neutral-500">{t('demo.guide')}</p>
        </div>

        {/* progress */}
        <div className="mt-6 rounded-3xl bg-white p-4 shadow-card ring-1 ring-brand-100 sm:p-5 fade-up">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-extrabold tracking-wide text-brand-800">
              {t('demo.step')} <span className="text-brand-600">{step + 1}</span><span className="font-semibold text-neutral-400"> / {STEPS.length}</span>
            </span>
            <span className="shrink-0 rounded-full bg-brand-700 px-3 py-1 text-xs font-extrabold tracking-wide text-white shadow-sm">{percent}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-brand-50 ring-1 ring-brand-100/60">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 transition-all duration-500 ease-out" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <p className="mt-2.5 text-xs font-semibold text-neutral-400">Step {step + 1} of {STEPS.length} · {t(cur.titleKey)} · auto-voice walkthrough</p>
        </div>

        {/* step chips — clean top stepper */}
        <nav aria-label="Demo steps" className="mt-5 -mx-4 overflow-x-auto px-4 pb-1 scrollbar-none">
          <div className="flex min-w-max items-center gap-2">
            {STEPS.map((s, i) => {
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={s.id}
                  onClick={() => setStep(i)}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Go to step ${i + 1}: ${t(s.titleKey)}`}
                  className={`group inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm font-bold transition sm:px-3.5 sm:py-2 ${
                    isActive
                      ? 'border-brand-700 bg-brand-700 text-white shadow-lift'
                      : isDone
                        ? 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700'
                        : 'border-brand-100 bg-white text-neutral-500 hover:border-brand-200 hover:bg-brand-50/60'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm transition ${isActive ? 'bg-white/20 text-white' : isDone ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600 group-hover:bg-brand-100'}`}
                    aria-hidden
                  >
                    {isDone ? '✓' : s.icon}
                  </span>
                  <span className="hidden max-w-[160px] truncate sm:inline">{t(s.titleKey)}</span>
                  <span className="sm:hidden text-xs font-extrabold">{i + 1}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <Card className="mt-5 overflow-hidden rounded-[28px] border-brand-100 p-0 shadow-lift ring-1 ring-brand-100/40 fade-up">
          <div className="border-b border-brand-50 bg-gradient-to-br from-brand-50/90 via-white to-warm-50/50 px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[30px] shadow-card ring-1 ring-brand-100" aria-hidden>{cur.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-brand-700 px-3 py-1 text-xs font-extrabold tracking-wide text-white shadow-sm">{t('demo.step')} {step + 1}</span>
                  <span className="text-xs font-bold text-neutral-400">{percent}% complete</span>
                </div>
                <div className="mt-2 text-xl font-extrabold leading-tight tracking-tight text-brand-900 sm:text-[26px]">{t(cur.titleKey)}</div>
                <div className="mt-1 text-[15px] font-semibold leading-relaxed text-neutral-600">{t(cur.descKey)}</div>
              </div>
            </div>
          </div>
          <div className="px-5 py-6 sm:px-8 sm:py-7">
            {renderStep(cur)}
          </div>
        </Card>

        {/* controls — one clear primary CTA */}
        <div className="mt-6 flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-card ring-1 ring-brand-100 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <Button variant="ghost" onClick={() => { resetAll(); setStep(0); }} disabled={step === 0 && state.demo.step <= 1} className="!font-bold">
            ↺ {t('demo.restart')}
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            {step > 0 && (
              <Button variant="secondary" size="md" onClick={() => setStep((s) => s - 1)} className="min-w-[96px] rounded-full">
                ← {t('demo.back')}
              </Button>
            )}
            <Button variant="huge" size="md" onClick={advance} className="!rounded-full !px-7 !py-4 text-[16px] shadow-lift">
              {step >= STEPS.length - 1 ? `🏁 ${t('demo.finish')}` : `${t('demo.next')} →`}
            </Button>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs font-semibold leading-relaxed text-neutral-400">
          Auto-playing product tour with live state · Voice walkthrough speaks each step · All demo controls use the same stores as the real app — no mock screens.
        </p>
      </div>
    </div>
  );
}

function StepShell({ children }: { children: React.ReactNode }) {
  return <div className="text-center">{children}</div>;
}

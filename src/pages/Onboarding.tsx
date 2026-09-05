import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Button } from '@/components/ui';
import { languageNames } from '@/i18n';
import { speak } from '@/services/voice';
import type { LanguageCode, ReminderType } from '@/types';
import { uid } from '@/data/demoData';

const REMINDER_OPTIONS: { key: ReminderType; emoji: string }[] = [
  { key: 'medicine', emoji: '💊' },
  { key: 'water', emoji: '💧' },
  { key: 'meal', emoji: '🍚' },
  { key: 'walk', emoji: '🚶' },
  { key: 'appointment', emoji: '📅' },
  { key: 'sleep', emoji: '😴' },
];

const INTERESTS = ['🫖 Tea', '🌸 Flowers', '🎶 Music', '📿 Worship', '👨‍👩‍👧 Family', '🧶 Crafts', '🌾 Cooking', '🎣 Fishing'];

export default function Onboarding() {
  const { t, dispatch, state } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(state.patient?.name ?? '');
  const [age, setAge] = useState(state.patient?.age ? String(state.patient.age) : '');
  const [language, setLanguage] = useState<LanguageCode>(state.patient?.language ?? 'en');
  const [caregiver, setCaregiver] = useState(state.patient?.caregiverName ?? '');
  const [relationship, setRelationship] = useState(state.patient?.caregiverRelationship ?? '');
  const [reminders, setReminders] = useState<ReminderType[]>(['medicine', 'water', 'walk']);
  const [interests, setInterests] = useState<string[]>(state.patient?.interests ?? []);
  const [speakSel, setSpeakSel] = useState<'yes' | 'no' | null>(null);
  const [error, setError] = useState('');

  const speakStep = (msg: string) => {
    if (state.settings.voiceOn) speak(msg, language);
  };

  useEffect(() => {
    if (state.patient && state.patient.onboarded && step <= 5) {
      // already onboarded — go straight to baseline if needed
      if (state.patient.baselineDone) navigate('/home');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const next = () => {
    setError('');
    if (step === 1) {
      if (!name.trim() || !age.trim() || Number(age) < 50) {
        setError(t('err.missing'));
        return;
      }
    }
    if (step === 3) {
      if (!caregiver.trim()) {
        setError(t('err.missing'));
        return;
      }
    }
    if (step === 5) {
      if (!speakSel) {
        setError(t('err.missing'));
        return;
      }
      dispatch({ type: 'UPDATE_SETTINGS', settings: { speakInstructions: speakSel === 'yes', voiceOn: true } });
      // build patient + caregiver records
      dispatch({
        type: 'COMPLETE_ONBOARDING',
        patient: {
          id: uid('patient'),
          name: name.trim(),
          age: Number(age),
          language,
          region: 'assam',
          caregiverName: caregiver.trim(),
          caregiverRelationship: relationship.trim() || t('common.familyMember'),
          interests,
          onboarded: true,
          baselineDone: false,
        },
        caregiver: {
          id: uid('caregiver'),
          name: caregiver.trim(),
          relationship: relationship.trim() || t('common.familyMember'),
        },
      });
      navigate('/baseline');
      return;
    }
    setStep((s) => s + 1);
  };

  const stepTitle = (n: number) => {
    if (n === 1) return `👋 ${t('onboard.name')}`;
    if (n === 2) return `🌐 ${t('onboard.language')}`;
    if (n === 3) return `🛟 ${t('onboard.caregiver')}`;
    if (n === 4) return `🔔 ${t('onboard.reminders.pref')}`;
    return `🔊 ${t('onboard.speak')}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-8">
      <div className="w-full max-w-lg fade-up">
        <div className="card">
          {/* progress dots */}
          <div className="mb-5 flex items-center justify-center gap-2" aria-hidden>
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={`h-3 w-3 rounded-full ${s <= step ? 'bg-brand-500' : 'bg-brand-100'}`} />
            ))}
          </div>
          <h1 className="text-center text-2xl font-extrabold text-brand-900">{stepTitle(step)}</h1>
          <button
            onClick={() => speakStep(t(`${['onboard.name', 'onboard.language', 'onboard.caregiver', 'onboard.reminders.pref', 'onboard.speak'][step - 1]}`))}
            className="mx-auto mt-2 block rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700"
          >
            🔊 {t('voice.listen')}
          </button>

          <div className="mt-6 min-h-[220px]">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="label">{t('onboard.name')}</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Asha Sharma" autoFocus />
                </div>
                <div>
                  <label className="label">{t('onboard.age')}</label>
                  <input className="input" type="number" min="50" max="110" value={age} onChange={(e) => setAge(e.target.value)} placeholder="68" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(languageNames).map(([code, label]) => (
                  <button
                    key={code}
                    onClick={() => {
                      setLanguage(code as LanguageCode);
                      speak(`Hello! I will use ${label} from now.`, code);
                    }}
                    className={`rounded-2xl border-2 px-4 py-3 text-left text-lg font-bold ${
                      language === code ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-brand-100 bg-white text-neutral-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="label">{t('onboard.caregiver')}</label>
                  <input className="input" value={caregiver} onChange={(e) => setCaregiver(e.target.value)} placeholder="e.g. Rohan Sharma" autoFocus />
                </div>
                <div>
                  <label className="label">{t('onboard.relationship')}</label>
                  <input className="input" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder={t('cg.relationship')} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {REMINDER_OPTIONS.map(({ key, emoji }) => {
                    const active = reminders.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => setReminders((r) => toggle(r, key))}
                        className={`rounded-2xl border-2 px-5 py-3 text-lg font-bold ${active ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-brand-100 bg-white text-neutral-600'}`}
                      >
                        {emoji} {t(`reminders.${key}`)}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label className="label">{t('onboard.interests')}</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map((i) => {
                      const active = interests.includes(i);
                      return (
                        <button
                          key={i}
                          onClick={() => setInterests((arr) => toggle(arr, i))}
                          className={`rounded-2xl border-2 px-4 py-2 text-base font-semibold ${active ? 'border-warm-300 bg-warm-50 text-warm-500' : 'border-brand-100 bg-white text-neutral-600'}`}
                        >
                          {i}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setSpeakSel('yes')}
                  className={`rounded-2xl border-2 px-6 py-5 text-xl font-extrabold ${speakSel === 'yes' ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-brand-100 bg-white text-neutral-600'}`}
                >
                  🔊 {t('onboard.speak.yes')}
                </button>
                <button
                  onClick={() => setSpeakSel('no')}
                  className={`rounded-2xl border-2 px-6 py-5 text-xl font-extrabold ${speakSel === 'no' ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-brand-100 bg-white text-neutral-600'}`}
                >
                  🤫 {t('onboard.speak.no')}
                </button>
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-center font-bold text-accent-500">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                ← {t('common.back')}
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => navigate('/')}>
                ← {t('common.back')}
              </Button>
            )}
            <Button onClick={next} variant={step === 5 ? 'primary' : 'primary'}>
              {step === 5 ? `✅ ${t('common.continue')}` : `${t('common.next')} →`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Button } from '@/components/ui';

export default function RoleSelect() {
  const { t, dispatch, state } = useApp();
  const navigate = useNavigate();

  const pick = (role: 'elder' | 'caregiver') => {
    dispatch({ type: 'SET_ROLE', role });
    // elder without a profile → start onboarding
    if (role === 'elder' && !state.patient?.onboarded) navigate('/onboarding');
    else if (role === 'elder') navigate('/home');
    else navigate('/caregiver');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4">
      <div className="w-full max-w-lg fade-up">
        <div className="mb-6 text-center">
          <span className="text-4xl" aria-hidden>
            🍃
          </span>
          <h1 className="font-display text-3xl font-bold text-brand-900">NEUROSAATHI</h1>
        </div>
        <h2 className="mb-5 text-center text-2xl font-extrabold text-brand-900">{t('login.title')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => pick('elder')} className="card flex flex-col items-center gap-2 p-6 text-center hover:shadow-lift transition">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-4xl" aria-hidden>
              🧓
            </span>
            <span className="text-xl font-extrabold text-brand-900">{t('landing.continue.elder')}</span>
            <span className="text-sm text-neutral-600">{t('login.elder.desc')}</span>
          </button>
          <button onClick={() => pick('caregiver')} className="card flex flex-col items-center gap-2 p-6 text-center hover:shadow-lift transition">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-warm-100 text-4xl" aria-hidden>
              👨‍👩‍👧
            </span>
            <span className="text-xl font-extrabold text-brand-900">{t('landing.continue.caregiver')}</span>
            <span className="text-sm text-neutral-600">{t('login.caregiver.desc')}</span>
          </button>
        </div>
        <p className="mt-4 text-center text-sm font-semibold text-neutral-500">{t('login.demo.hint')}</p>
        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={() => navigate('/')}>
            ← {t('common.back')}
          </Button>
        </div>
      </div>
    </div>
  );
}
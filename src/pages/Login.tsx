// ============================================================================
// LOGIN PAGE
//
// Elder path: Face-first. No email or password.
//   - Returning elder (patient in state): 🛡️ Face Login button → FaceLogin modal
//   - New elder (no patient in state): ✨ Register button → Onboarding
//
// Caregiver path: Demo password login (unchanged).
// ============================================================================

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { LanguageSelector } from '@/components/common';
import { FaceLogin } from '@/face/FaceLogin';
import { DEMO_PATIENT_ID } from '@/data/demoData';
import type { Role } from '@/types';

/**
 * Returns true only when the patient has a REAL Supabase elder_profiles UUID.
 * A UUID is 36 chars in 8-4-4-4-12 format.
 * Rejects: undefined, 'patient-asha', 'patient-1', any uid('patient') strings.
 */
function isRealElderUuid(id: string | undefined): boolean {
  if (!id) return false;
  if (id === DEMO_PATIENT_ID) return false;
  if (id.startsWith('patient-') || id.startsWith('caregiver-')) return false;
  // UUID v4: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ---------------------------------------------------------------------------
// Elder card — face-first, no password
// ---------------------------------------------------------------------------

function ElderCard({
  onFace,
  onRegister,
}: {
  onFace: () => void;
  onRegister: () => void;
}) {
  const { state, t } = useApp();
  const hasRealElderProfile = isRealElderUuid(state.patient?.id);
  const name = hasRealElderProfile ? state.patient?.name?.split(' ')[0] : undefined;

  return (
    <div className="card border-2 border-brand-100/70 p-5 sm:p-6 shadow-card hover:shadow-lift hover:border-brand-200 transition-all duration-200">
      {/* header */}
      <div className="flex items-center gap-3.5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100 text-[1.65rem] shadow-soft">
          👵
        </span>
        <div className="min-w-0">
          <div className="font-display text-[1.2rem] font-extrabold leading-none tracking-tight text-brand-900">
            {t('login.elder.title')}
          </div>
          <div className="mt-1 text-sm font-semibold leading-snug text-neutral-500">
            {hasRealElderProfile
              ? `Welcome back${name ? `, ${name}` : ''}! Use your face to sign in.`
              : 'New here? Set up your profile in 2 minutes.'}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {hasRealElderProfile ? (
          /* Returning elder — face login is primary */
          <>
            <button
              type="button"
              id="btn-elder-face-login"
              onClick={onFace}
              className="flex w-full items-center justify-center gap-3 rounded-[20px] bg-brand-700 px-5 py-4 text-[17px] font-extrabold text-white shadow-lift transition hover:bg-brand-800 hover:shadow-float active:scale-[0.98]"
            >
              🛡️ {t('face.login.button')}
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="mt-1 text-sm font-semibold text-neutral-400 hover:text-brand-700 transition text-center"
            >
              Not you? Register a new elder profile →
            </button>
          </>
        ) : (
          /* New elder — show registration CTA and face login below */
          <>
            <button
              type="button"
              id="btn-elder-register"
              onClick={onRegister}
              className="flex w-full items-center justify-center gap-3 rounded-[20px] bg-brand-700 px-5 py-4 text-[17px] font-extrabold text-white shadow-lift transition hover:bg-brand-800 hover:shadow-float active:scale-[0.98]"
            >
              ✨ Register as Elder
            </button>
            <button
              type="button"
              id="btn-elder-face-login-returning"
              onClick={onFace}
              className="flex w-full items-center justify-center gap-2 rounded-[20px] border-2 border-brand-100 bg-brand-50/60 px-5 py-3.5 text-base font-extrabold text-brand-700 transition hover:bg-brand-50 hover:shadow-card"
            >
              🛡️ Already registered? Face Login
            </button>
          </>
        )}

        {/* privacy note */}
        <div className="mt-1 flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/60 px-3.5 py-2.5">
          <span className="text-base shrink-0" aria-hidden>🔒</span>
          <p className="text-xs font-semibold leading-relaxed text-brand-800">
            No passwords needed. Your face is matched locally — only the derived face descriptors are stored in the cloud.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Caregiver card — demo password (unchanged)
// ---------------------------------------------------------------------------

const CAREGIVER_DEMO_PASSWORD = 'care123';

function CaregiverCard({ onFace }: { onFace: () => void }) {
  const { t, dispatch, speakText } = useApp();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (password.trim() === CAREGIVER_DEMO_PASSWORD) {
      speakText(`${t('login.patient.name')}. ${t('login.success.caregiver')}`);
      dispatch({ type: 'SET_ROLE', role: 'caregiver' });
      navigate('/caregiver');
      return;
    }
    setError(true);
    setPassword('');
    speakText(t('login.error'));
  };

  return (
    <form
      onSubmit={submit}
      className="card flex flex-col gap-4 p-5 sm:p-6 border-2 border-brand-100/70 shadow-card hover:shadow-lift hover:border-brand-200 transition-all duration-200"
    >
      <div className="flex items-center gap-3.5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100 text-[1.65rem] shadow-soft">
          👨‍👩‍👧
        </span>
        <div className="min-w-0">
          <div className="font-display text-[1.2rem] font-extrabold leading-none tracking-tight text-brand-900">
            {t('login.caregiver.title')}
          </div>
          <div className="mt-1 text-sm font-semibold leading-snug text-neutral-500">
            {t('login.caregiver.desc')}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-warm-50/60 border border-brand-100 px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold tracking-widest text-brand-700 uppercase">Demo</span>
        <span className="text-base font-extrabold text-brand-900">👤 {t('login.patient.name')}</span>
      </div>

      <div>
        <label className="label" htmlFor="pw-caregiver">🔐 {t('login.password')}</label>
        <input
          id="pw-caregiver"
          className={`input ${error ? '!border-danger-300 !ring-2 !ring-danger-100' : ''}`}
          type="password"
          autoComplete="off"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          placeholder={t('login.password.placeholder')}
        />
        <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-warm-600">
          <span aria-hidden>💡</span> {t('login.caregiver.hint')}
        </p>
      </div>

      {error && (
        <p className="rounded-2xl bg-danger-50 border border-danger-200 px-3.5 py-2.5 text-sm font-bold text-danger-700 flex items-center gap-2" role="alert">
          <span aria-hidden>⚠️</span> {t('login.error')}
        </p>
      )}

      <button type="submit" className="btn-huge !bg-accent-500 hover:!bg-accent-600 shadow-lift mt-1">
        🔓 {t('common.start')}
      </button>

      <button
        type="button"
        onClick={onFace}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand-100 bg-brand-50/60 px-4 py-3 text-base font-extrabold text-brand-700 transition hover:bg-brand-50 hover:shadow-card"
      >
        🛡️ {t('face.login.button')}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main Login page
// ---------------------------------------------------------------------------

export default function Login() {
  const { state, dispatch, speakText, t } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [faceOpen, setFaceOpen] = useState(params.get('face') === '1');
  const [faceRole, setFaceRole] = useState<Role>('elder');

  const handleRegister = () => {
    dispatch({ type: 'SET_ROLE', role: 'elder' });
    navigate('/onboarding?register=1');
  };

  const handleElderFace = () => {
    setFaceRole('elder');
    setFaceOpen(true);
  };

  const handleCaregiverFace = () => {
    setFaceRole('caregiver');
    setFaceOpen(true);
  };

  // Face Login success → authenticate role
  const handleFaceSuccess = (photo?: string) => {
    const r = faceRole;
    const patientName = state.patient?.name || t('login.patient.name');
    const now = new Date();

    if (photo) {
      dispatch({
        type: 'RECORD_FACE_LOGIN',
        record: { photo, timestamp: now.toISOString(), role: r, name: patientName },
      });
    }

    const msg = r === 'elder' ? t('login.success.elder') : t('login.success.caregiver');
    speakText(`${patientName}. ${msg}`);

    if (r === 'elder') {
      // dispatch SET_ROLE so PatientGate allows through
      dispatch({ type: 'SET_ROLE', role: 'elder' });
      navigate('/home');
    } else {
      dispatch({ type: 'SET_ROLE', role: 'caregiver' });
      navigate('/caregiver');
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* top bar */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:py-5">
        <img src="/neurosaathi-header.png" alt="NeuroSaathi" className="h-11 w-auto object-contain sm:h-[52px]" />
        <LanguageSelector />
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-10 sm:pb-14">
        <div className="grid gap-6 lg:grid-cols-[1.02fr_1.22fr] lg:gap-8 items-start">
          {/* left — brand story */}
          <div className="relative overflow-hidden rounded-[2rem] bg-white p-6 sm:p-8 shadow-card border border-brand-100/60">
            <div aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-brand-50 blur-2xl opacity-80" />
            <div aria-hidden className="pointer-events-none absolute -left-10 bottom-0 h-44 w-44 rounded-full bg-warm-50 blur-2xl opacity-70" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-100 px-3.5 py-1.5 text-xs font-extrabold tracking-wide text-brand-700">
                <span aria-hidden>🍃</span> Calm · Private · Face-first
              </span>

              <div className="mt-5 flex justify-center lg:justify-start">
                <img src="/neurosaathi-full.png" alt="NeuroSaathi" className="h-40 w-auto object-contain sm:h-48" />
              </div>

              <h1 className="font-display mt-4 text-center text-[2.1rem] font-extrabold tracking-tight text-brand-900 lg:text-left">
                NEUROSAATHI
              </h1>
              <p className="mt-2 text-center text-[1.05rem] font-bold leading-snug text-brand-700 lg:text-left">
                {t('brand.tagline')}
              </p>
              <p className="mx-auto mt-3 max-w-md text-center text-[15px] leading-relaxed text-neutral-500 lg:mx-0 lg:text-left">
                {t('brand.blurb')}
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                <span className="chip bg-brand-50 text-brand-700 border border-brand-100">🔒 {t('landing.privacy')}</span>
                <span className="chip bg-warm-50 text-warm-700 border border-warm-100">📴 {t('landing.offline')}</span>
                <span className="chip bg-white text-brand-700 border border-brand-100 shadow-soft">🌐 {t('landing.multilingual')}</span>
                <span className="chip bg-accent-50 text-accent-700 border border-accent-100">🤖 {t('landing.adaptive')}</span>
              </div>

              {/* face-first explanation */}
              <div className="mt-6 rounded-2xl bg-brand-50/70 border border-brand-100 px-4 py-3.5 space-y-1.5">
                <p className="text-sm font-extrabold text-brand-900">🛡️ Face-first authentication</p>
                <p className="text-sm leading-relaxed text-neutral-500">
                  Elders register once with their face — no passwords, no email addresses.
                  Caregivers sign in with the demo password on the right.
                </p>
              </div>
            </div>
          </div>

          {/* right — auth cards */}
          <div className="fade-up">
            <div className="rounded-[2rem] bg-white p-6 sm:p-7 shadow-card border border-brand-100/60">
              <div className="text-center lg:text-left">
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-brand-900 sm:text-[1.7rem]">
                  {t('login.choose')}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-neutral-500">
                  {t('login.demo.note')}
                </p>
              </div>

              <div className="mt-6 grid gap-5">
                <ElderCard onFace={handleElderFace} onRegister={handleRegister} />
                <CaregiverCard onFace={handleCaregiverFace} />
              </div>

              <p className="mt-5 text-center text-xs font-semibold text-neutral-400">
                Private by design · Voice-assisted · Built for families
              </p>
            </div>
          </div>
        </div>
      </main>

      <FaceLogin
        open={faceOpen}
        onClose={() => setFaceOpen(false)}
        onSuccess={handleFaceSuccess}
        onUsePin={() => setFaceOpen(false)}
      />
    </div>
  );
}

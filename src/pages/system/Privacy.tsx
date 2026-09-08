import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, Button, Chip } from '@/components/ui';
import { ShieldIcon, LockIcon, CheckCircleIcon } from '@/components/Icons';

const POINTS = [
  { icon: '🤝', key: 'privacy.consent', descKey: 'privacy.point.consent' },
  { icon: '📉', key: 'privacy.minimal', descKey: 'privacy.point.minimal' },
  { icon: '💾', key: 'privacy.local', descKey: 'privacy.point.local' },
  { icon: '🗝️', key: 'privacy.encrypted', descKey: 'privacy.point.encrypted' },
  { icon: '👥', key: 'privacy.roles', descKey: 'privacy.point.roles' },
  { icon: '🔐', key: 'privacy.auth', descKey: 'privacy.point.auth' },
  { icon: '⚕️', key: 'privacy.nodiag', descKey: 'privacy.point.nodiag' },
  { icon: '🛡️', key: 'privacy.control', descKey: 'privacy.point.control' },
];

export default function Privacy() {
  const { t } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => navigate('/caregiver/settings')}
          className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-bold text-brand-800 shadow-card transition hover:bg-brand-50"
        >
          ← {t('common.back')}
        </button>

        {/* Document header — reassuring brand moment */}
        <div className="text-center fade-up">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-100 shadow-card" aria-hidden>
            <ShieldIcon size={38} className="text-brand-600" />
          </div>
          <h1 className="mt-5 text-4xl font-extrabold text-brand-900">{t('privacy.title')}</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-semibold text-brand-700">{t('privacy.tagline')}</p>

          {/* Trust markers — local-first / no-upload / offline-ready */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Chip tone="brand">
              <LockIcon size={14} aria-hidden /> {t('landing.privacy')}
            </Chip>
            <Chip tone="warm">💾 {t('privacy.local')}</Chip>
            <Chip tone="info">
              <CheckCircleIcon size={14} aria-hidden /> {t('landing.offline')}
            </Chip>
          </div>
        </div>

        <div className="divider my-9" aria-hidden />

        {/* Privacy commitments */}
        <div className="grid gap-4 sm:grid-cols-2">
          {POINTS.map((p, i) => (
            <Card key={p.key} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl ring-1 ring-brand-100"
                  aria-hidden
                >
                  {p.icon}
                </span>
                <span className="text-lg font-extrabold tracking-tight text-brand-200" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="text-lg font-extrabold text-brand-900">{t(p.key)}</div>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-brand-700">{t(p.descKey)}</p>
            </Card>
          ))}
        </div>

        {/* Data-stays-on-device callout */}
        <Card className="mt-8 border-l-4 border-l-warm-300 bg-brand-50">
          <div className="flex items-start gap-4">
            <span className="hidden shrink-0 sm:flex" aria-hidden>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft">
                <LockIcon size={24} />
              </span>
            </span>
            <p className="text-base font-semibold leading-relaxed text-brand-900">{t('privacy.proto')}</p>
          </div>
        </Card>

        <div className="mt-10 text-center">
          <Button variant="ghost" onClick={() => navigate('/caregiver/settings')}>
            {t('common.continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
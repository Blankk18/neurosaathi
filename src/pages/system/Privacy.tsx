import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, Button } from '@/components/ui';

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
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <button onClick={() => navigate('/caregiver/settings')} className="mb-4 rounded-full bg-white px-4 py-2 font-bold text-brand-800 shadow-card">
          ← {t('common.back')}
        </button>
        <div className="mb-6 text-center">
          <span className="text-5xl" aria-hidden>🔒</span>
          <h1 className="mt-2 text-3xl font-extrabold text-brand-900">{t('privacy.title')}</h1>
          <p className="mt-2 text-lg font-semibold text-brand-700">{t('privacy.tagline')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {POINTS.map((p) => (
            <Card key={p.key}>
              <div className="flex items-start gap-3">
                <span className="text-3xl" aria-hidden>{p.icon}</span>
                <div>
                  <div className="text-lg font-extrabold text-brand-900">{t(p.key)}</div>
                  <p className="text-sm font-semibold text-neutral-600">{t(p.descKey)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-l-4 border-l-brand-400">
          <p className="text-base font-semibold text-brand-900">{t('privacy.proto')}</p>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => navigate('/caregiver/settings')}>
            {t('common.continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
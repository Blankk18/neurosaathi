import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, Button, Toggle, SectionTitle } from '@/components/ui';
import { AccessibilityControls, LanguageSelector } from '@/components/common';

export default function Settings() {
  const { t, state, dispatch, runSync, resetAll, speakText } = useApp();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);

  const setSim = (v: boolean) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings: { simulateOffline: v } });
    speakText(v ? t('offline.banner') : `${t('offline.restored')} ${t('common.synced')}`);
  };

  return (
    <div>
      <SectionTitle icon="♿">{t('cg.settings.access')}</SectionTitle>

      <AccessibilityControls />

      <SectionTitle icon="🌐">{t('a11y.language')}</SectionTitle>
      <Card className="flex items-center justify-between">
        <span className="text-lg font-semibold">{t('cg.settings.language.shared')}</span>
        <LanguageSelector />
      </Card>

      <SectionTitle icon="📴">{t('cg.settings.connectivity')}</SectionTitle>
      <Card>
        <Toggle checked={state.settings.simulateOffline} onChange={setSim} label={`🟠 ${t('common.simulate.offline')}`} />
        <p className="mt-2 text-sm font-semibold text-neutral-500">
          {t('cg.settings.offline.hint')}
        </p>
        <div className="mt-3">
          <Button variant="secondary" size="md" onClick={() => runSync()}>
            🔄 {t('common.sync')}
          </Button>
        </div>
      </Card>

      <SectionTitle icon="🔗">{t('cg.settings.platform')}</SectionTitle>
      <Card className="space-y-3">
        <button onClick={() => navigate('/architecture')} className="flex w-full items-center gap-3 rounded-2xl bg-brand-50 p-3 text-left hover:bg-brand-100">
          <span className="text-2xl">🏗️</span>
          <span className="text-lg font-bold text-brand-900">{t('arch.title')}</span>
        </button>
        <button onClick={() => navigate('/privacy')} className="flex w-full items-center gap-3 rounded-2xl bg-brand-50 p-3 text-left hover:bg-brand-100">
          <span className="text-2xl">🔒</span>
          <span className="text-lg font-bold text-brand-900">{t('privacy.title')}</span>
        </button>
        <button onClick={() => navigate('/demo')} className="flex w-full items-center gap-3 rounded-2xl bg-brand-50 p-3 text-left hover:bg-brand-100">
          <span className="text-2xl">🎬</span>
          <span className="text-lg font-bold text-brand-900">{t('demo.title')}</span>
        </button>
      </Card>

      <SectionTitle icon="🗃️">{t('cg.settings.data')}</SectionTitle>
      <Card>
        <p className="text-sm font-semibold text-neutral-500">
          {t('cg.settings.data.hint')}
        </p>
        {!confirmReset ? (
          <Button variant="danger" size="md" className="mt-3" onClick={() => setConfirmReset(true)}>
            {t('cg.settings.reset')}
          </Button>
        ) : (
          <div className="mt-3 flex gap-2">
            <Button variant="danger" size="md" onClick={() => { resetAll(); setConfirmReset(false); }}>
              {t('cg.settings.reset.confirm')}
            </Button>
            <Button variant="ghost" size="md" onClick={() => setConfirmReset(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
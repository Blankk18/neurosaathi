import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, Button, Toggle, SectionTitle } from '@/components/ui';
import { AccessibilityControls, LanguageSelector } from '@/components/common';
import { ChevronRightIcon } from '@/components/Icons';

export default function Settings() {
  const { t, state, dispatch, runSync, resetAll, speakText } = useApp();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);

  const setSim = (v: boolean) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings: { simulateOffline: v } });
    speakText(v ? t('offline.banner') : `${t('offline.restored')} ${t('common.synced')}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-0 pb-8">
      {/* Accessibility — care settings */}
      <div className="fade-up">
        <SectionTitle icon="♿">{t('cg.settings.access')}</SectionTitle>
        <AccessibilityControls />
      </div>

      {/* Language — shared across views */}
      <div className="fade-up" style={{ animationDelay: '60ms' }}>
        <SectionTitle icon="🌐">{t('a11y.language')}</SectionTitle>
        <Card className="flex flex-wrap items-center justify-between gap-4 !py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl sm:inline-flex" aria-hidden>
              🌐
            </span>
            <span className="text-[15px] font-bold leading-tight text-brand-900">
              {t('cg.settings.language.shared')}
            </span>
          </div>
          <LanguageSelector />
        </Card>
      </div>

      {/* Connectivity — offline toggle + sync */}
      <div className="fade-up" style={{ animationDelay: '110ms' }}>
        <SectionTitle icon="📴">{t('cg.settings.connectivity')}</SectionTitle>
        <Card className="space-y-0">
          <Toggle
            checked={state.settings.simulateOffline}
            onChange={setSim}
            label={`🟠 ${t('common.simulate.offline')}`}
          />
          <div className="divider my-4" />
          <p className="text-sm font-semibold leading-relaxed text-neutral-500">
            {t('cg.settings.offline.hint')}
          </p>
          <div className="pt-4">
            <Button variant="secondary" size="md" onClick={() => runSync()}>
              🔄 {t('common.sync')}
            </Button>
          </div>
        </Card>
      </div>

      {/* Platform — architecture / privacy / demo */}
      <div className="fade-up" style={{ animationDelay: '160ms' }}>
        <SectionTitle icon="🔗">{t('cg.settings.platform')}</SectionTitle>
        <Card className="!p-2">
          <button
            onClick={() => navigate('/architecture')}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left transition hover:bg-brand-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">
              🏗️
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-bold text-brand-900">{t('arch.title')}</span>
            <ChevronRightIcon size={18} className="shrink-0 text-brand-300" />
          </button>
          <div className="divider mx-3 my-1" />
          <button
            onClick={() => navigate('/privacy')}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left transition hover:bg-brand-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">
              🔒
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-bold text-brand-900">{t('privacy.title')}</span>
            <ChevronRightIcon size={18} className="shrink-0 text-brand-300" />
          </button>
          <div className="divider mx-3 my-1" />
          <button
            onClick={() => navigate('/demo')}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left transition hover:bg-brand-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">
              🎬
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-bold text-brand-900">{t('demo.title')}</span>
            <ChevronRightIcon size={18} className="shrink-0 text-brand-300" />
          </button>
        </Card>
      </div>

      {/* Prototype data — reset */}
      <div className="fade-up" style={{ animationDelay: '210ms' }}>
        <SectionTitle icon="🗃️">{t('cg.settings.data')}</SectionTitle>
        <Card className="space-y-4">
          <p className="text-sm font-semibold leading-relaxed text-neutral-500">
            {t('cg.settings.data.hint')}
          </p>
          {!confirmReset ? (
            <Button variant="danger" size="md" onClick={() => setConfirmReset(true)}>
              {t('cg.settings.reset')}
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="danger"
                size="md"
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                }}
              >
                {t('cg.settings.reset.confirm')}
              </Button>
              <Button variant="ghost" size="md" onClick={() => setConfirmReset(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

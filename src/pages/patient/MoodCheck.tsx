import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, Button, Disclaimer } from '@/components/ui';
import { PageHeader } from '@/components/common';
import { WikipediaTwemoji } from '@/components/Twemoji';
import type { Mood } from '@/types';

const MOODS: { mood: Mood; emoji: string; labelKey: string }[] = [
  { mood: 'happy', emoji: '😊', labelKey: 'mood.happy' },
  { mood: 'good', emoji: '🙂', labelKey: 'mood.good' },
  { mood: 'okay', emoji: '😐', labelKey: 'mood.okay' },
  { mood: 'sad', emoji: '😔', labelKey: 'mood.sad' },
  { mood: 'worried', emoji: '😟', labelKey: 'mood.worried' },
];

export default function MoodCheck() {
  const { t, dispatch, speakText } = useApp();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<Mood | null>(null);

  const support = (m: Mood): string => t(`mood.support.${m}`);

  const choose = (m: Mood) => {
    setPicked(m);
    dispatch({ type: 'ADD_MOOD', mood: m });
    speakText(support(m));
  };

  return (
    <div>
      <PageHeader title={t('mood.title')} />
      {!picked && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {MOODS.map(({ mood, emoji, labelKey }) => (
            <button key={mood} onClick={() => choose(mood)} className="card flex flex-col items-center gap-2 p-6 text-center hover:shadow-lift transition">
              <WikipediaTwemoji emoji={emoji} size={64} />
              <span className="text-lg font-extrabold text-brand-900">{t(labelKey)}</span>
            </button>
          ))}
        </div>
      )}

      {picked && (
        <Card className="pop mt-6 text-center">
          <div className="mx-auto mb-2 text-5xl">
            <WikipediaTwemoji emoji={MOODS.find((m) => m.mood === picked)!.emoji} size={64} />
          </div>
          <h2 className="text-2xl font-extrabold text-brand-900">💚 {t('mood.thanks')}</h2>
          <p className="mt-3 text-lg font-semibold text-brand-700">{support(picked)}</p>
          <div className="mt-5 flex flex-col gap-3">
            <Button variant="huge" onClick={() => navigate('/games/memory')}>
              🧠 {t('games.memory')}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/voice')}>
              🎤 {t('home.talk')}
            </Button>
            <Button variant="ghost" onClick={() => setPicked(null)}>
              📗 {t('common.back')}
            </Button>
          </div>
          <div className="mt-4">
            <Disclaimer>{t('mood.disclaimer')}</Disclaimer>
          </div>
        </Card>
      )}
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, Button, Disclaimer } from '@/components/ui';
import { PageHeader } from '@/components/common';
import { WikipediaTwemoji } from '@/components/Twemoji';
import {
  MoodHappyIcon,
  MoodGoodIcon,
  MoodOkayIcon,
  MoodSadIcon,
  MoodWorriedIcon,
  CheckCircleIcon,
  BrainIcon,
  MicIcon,
  SparkleIcon,
  HeartIcon,
} from '@/components/Icons';
import type { Mood } from '@/types';

const MOODS: { mood: Mood; emoji: string; labelKey: string }[] = [
  { mood: 'happy', emoji: '😊', labelKey: 'mood.happy' },
  { mood: 'good', emoji: '🙂', labelKey: 'mood.good' },
  { mood: 'okay', emoji: '😐', labelKey: 'mood.okay' },
  { mood: 'sad', emoji: '😔', labelKey: 'mood.sad' },
  { mood: 'worried', emoji: '😟', labelKey: 'mood.worried' },
];

const MOOD_ICON: Record<Mood, React.FC<{ size?: number; className?: string }>> = {
  happy: MoodHappyIcon,
  good: MoodGoodIcon,
  okay: MoodOkayIcon,
  sad: MoodSadIcon,
  worried: MoodWorriedIcon,
};

const MOOD_STYLES: Record<Mood, { bg: string; ring: string; iconWrap: string; iconColor: string }> = {
  happy: {
    bg: 'bg-warm-50',
    ring: 'ring-warm-200 hover:ring-warm-300',
    iconWrap: 'bg-warm-100',
    iconColor: 'text-warm-600',
  },
  good: {
    bg: 'bg-brand-50',
    ring: 'ring-brand-100 hover:ring-brand-200',
    iconWrap: 'bg-brand-100',
    iconColor: 'text-brand-600',
  },
  okay: {
    bg: 'bg-neutral-50',
    ring: 'ring-neutral-200 hover:ring-neutral-300',
    iconWrap: 'bg-white',
    iconColor: 'text-neutral-500',
  },
  sad: {
    bg: 'bg-info-50',
    ring: 'ring-info-100 hover:ring-info-200',
    iconWrap: 'bg-info-100',
    iconColor: 'text-info-600',
  },
  worried: {
    bg: 'bg-danger-50',
    ring: 'ring-danger-100 hover:ring-danger-200',
    iconWrap: 'bg-danger-100',
    iconColor: 'text-danger-500',
  },
};

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

  const pickedMeta = picked ? MOODS.find((m) => m.mood === picked) : null;
  const PickedIcon = picked ? MOOD_ICON[picked] : null;

  return (
    <div>
      <PageHeader title={t('mood.title')} />

      {!picked && (
        <div className="fade-up">
          {/* reassuring subtitle */}
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <HeartIcon size={16} />
            </span>
            <p className="text-base font-semibold text-neutral-600">
              Tap the one that feels closest — there is no wrong answer
            </p>
          </div>

          {/* mood grid — large warm tiles */}
          <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {MOODS.map(({ mood, emoji, labelKey }) => {
              const style = MOOD_STYLES[mood];
              const Icon = MOOD_ICON[mood];
              const isFirst = mood === 'happy';
              return (
                <button
                  key={mood}
                  onClick={() => choose(mood)}
                  aria-label={t(labelKey)}
                  className={`group relative flex flex-col items-center gap-3 rounded-3xl px-4 py-7 text-center shadow-card ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${style.bg} ${style.ring} ${isFirst ? 'col-span-2 sm:col-span-1 lg:col-span-1' : ''}`}
                >
                  {/* stroke icon badge top-right for premium consistency */}
                  <span
                    className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full ${style.iconWrap} ${style.iconColor}`}
                    aria-hidden
                  >
                    <Icon size={18} />
                  </span>

                  {/* main warm emoji — substantive content, keep Twemoji */}
                  <span className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-white shadow-sm transition group-hover:shadow">
                    <WikipediaTwemoji emoji={emoji} size={52} />
                  </span>

                  <span className="text-xl font-extrabold tracking-tight text-brand-900">
                    {t(labelKey)}
                  </span>

                  {/* tiny supportive hint per mood — elderly-friendly reassurance */}
                  <span className="text-sm font-semibold leading-none text-neutral-600">
                    {mood === 'happy' && 'Feeling bright'}
                    {mood === 'good' && 'Doing well'}
                    {mood === 'okay' && 'Steady day'}
                    {mood === 'sad' && 'Need comfort'}
                    {mood === 'worried' && 'Need calm'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* gentle footer hint */}
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-card">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-50 text-accent-700">
              <SparkleIcon size={14} />
            </span>
            <p className="text-sm font-semibold text-neutral-600">
              Whatever you choose, NeuroSaathi is here with you
            </p>
          </div>
        </div>
      )}

      {picked && pickedMeta && PickedIcon && (
        <div className="pop">
          <Card className="mt-6 overflow-hidden border-0 p-0 text-center">
            {/* soft hero band */}
            <div className="bg-gradient-to-br from-brand-50 via-white to-warm-50 px-6 pb-6 pt-8">
              <div className="mx-auto flex flex-col items-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-[2rem] bg-brand-200/40 blur-xl" aria-hidden />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.7rem] bg-white shadow-card ring-1 ring-brand-100">
                    <WikipediaTwemoji emoji={pickedMeta.emoji} size={56} />
                  </div>
                  <span className="absolute -bottom-2 -right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-card ring-4 ring-white" aria-hidden>
                    <CheckCircleIcon size={18} />
                  </span>
                </div>

                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-brand-700 shadow-sm ring-1 ring-brand-100">
                  <span className="text-brand-600">
                    <PickedIcon size={16} />
                  </span>
                  {t(pickedMeta.labelKey)}
                  <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden />
                  <span className="font-semibold text-neutral-400">noted</span>
                </div>

                <h2 className="mt-4 flex items-center justify-center gap-2 text-2xl font-extrabold leading-tight text-brand-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white">
                    <HeartIcon size={16} />
                  </span>
                  {t('mood.thanks')}
                </h2>

                <p className="mx-auto mt-3 max-w-[32rem] rounded-2xl bg-white px-4 py-3 text-[1.05rem] font-semibold leading-relaxed text-brand-800 shadow-sm ring-1 ring-brand-100">
                  {support(picked)}
                </p>
              </div>
            </div>

            {/* actions */}
            <div className="px-6 pb-6 pt-5">
              <p className="text-sm font-bold uppercase tracking-widest text-neutral-400">What would you like to do next?</p>

              <div className="mt-4 grid gap-3">
                <Button
                  variant="huge"
                  onClick={() => navigate('/games/memory')}
                  className="justify-center gap-2.5 !rounded-2xl shadow-lift"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                    <BrainIcon size={20} />
                  </span>
                  {t('games.memory')}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => navigate('/voice')}
                  className="justify-center gap-2 !rounded-2xl bg-brand-700 !text-white hover:!bg-brand-800"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                    <MicIcon size={18} />
                  </span>
                  {t('home.talk')}
                </Button>

                <button
                  onClick={() => setPicked(null)}
                  className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-5 py-2.5 text-base font-bold text-neutral-600 transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  aria-label={t('common.back')}
                >
                  <span aria-hidden>↩</span> {t('common.back')}
                </button>
              </div>

              <div className="mt-5">
                <Disclaimer>{t('mood.disclaimer')}</Disclaimer>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

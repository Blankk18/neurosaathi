import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, Button, ProgressRing, Disclaimer } from '@/components/ui';
import { SpeakText } from '@/components/common';
import { SparkleIcon, ClockIcon, TargetIcon, BrainIcon } from '@/components/Icons';
import { difficultyLabel, type AdaptationDecision } from '@/engine/adaptive';
import type { GameResult } from '@/types';

export default function GameResultScreen({
  result,
  decision,
  onPlayAgain,
  extraNote,
}: {
  result: GameResult;
  decision?: AdaptationDecision;
  onPlayAgain: () => void;
  extraNote?: string;
}) {
  const { t } = useApp();
  const navigate = useNavigate();

  const isHigh = result.accuracy >= 85;
  const isMid = result.accuracy >= 60 && result.accuracy < 85;
  const ringColor = isHigh ? '#6b9b6a' : isMid ? '#c49a4a' : '#d08a7a';
  const ringBgTint = isHigh
    ? 'bg-brand-50/60'
    : isMid
    ? 'bg-warm-50/70'
    : 'bg-accent-50/60';
  const encourageTone = isHigh
    ? 'text-brand-600 border-brand-200 bg-brand-50/70'
    : isMid
    ? 'text-warm-600 border-warm-200 bg-warm-50/70'
    : 'text-accent-500 border-accent-200 bg-accent-50/60';

  return (
    <div className="pop fade-up">
      {/* Soft ambient wash behind the result — brand tint that fades into canvas */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(520px 360px at 50% 0%, rgba(143,182,155,0.16) 0%, rgba(250,245,232,0.0) 62%)',
        }}
      />
      <Card className="!p-0 overflow-hidden">
        {/* ── Celebratory header — soft gradient band, sparkle emblem + Fraunces headline ── */}
        <div className="border-b border-brand-100/70 bg-gradient-to-b from-brand-50/90 via-brand-50/40 to-white px-6 pb-6 pt-7 text-center sm:px-8">
          <div className="mx-auto flex flex-col items-center">
            {/* Gentle emblem: soft circle with sparkle */}
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border shadow-card ${
                isHigh
                  ? 'border-brand-200 bg-white text-brand-600'
                  : isMid
                  ? 'border-warm-200 bg-white text-warm-500'
                  : 'border-accent-200 bg-white text-accent-400'
              }`}
              aria-hidden
            >
              <SparkleIcon size={26} />
            </div>
            <h2 className="mt-3 text-[30px] font-extrabold leading-none tracking-tight text-brand-900 sm:text-[34px]">
              {t('games.complete')}
            </h2>
            <p className="mt-2 max-w-[28ch] text-sm font-semibold leading-relaxed text-neutral-500">
              {isHigh
                ? t('games.encourage.high')
                : isMid
                ? t('games.encourage.medium')
                : t('games.encourage.low')}
            </p>
          </div>
        </div>

        {/* ── Main result body ── */}
        <div className="px-5 pb-6 pt-6 sm:px-7">
          {/* Big ring + stat stack: stacked on mobile, side-by-side on wider cards */}
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
            {/* Accuracy ring — the hero metric */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={`rounded-[28px] border border-white px-5 py-4 shadow-card ${ringBgTint}`}
              >
                <ProgressRing
                  value={result.accuracy}
                  size={128}
                  stroke={10}
                  color={ringColor}
                />
              </div>
              <span className="text-sm font-extrabold tracking-wide text-brand-700">
                {t('games.accuracy')}
              </span>
              {/* Read-aloud stays right under the metric it describes */}
              <SpeakText text={`${t('games.complete')} ${result.accuracy}% accuracy.`} />
            </div>

            {/* Pill stats — clearly separated, icon + value + label */}
            <div className="flex w-full max-w-[280px] flex-col gap-2.5 sm:w-[220px] sm:shrink-0">
              <div className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/80 px-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-card">
                  <ClockIcon size={20} />
                </span>
                <div className="min-w-0">
                  <div className="text-xl font-extrabold leading-none text-brand-900">
                    {result.responseTimeSec}s
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                    {t('games.time')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/80 px-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-card">
                  <TargetIcon size={20} />
                </span>
                <div className="min-w-0">
                  <div className="text-xl font-extrabold leading-none text-brand-900">
                    {result.mistakes}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                    {t('games.mistakes')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/80 px-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-card">
                  <BrainIcon size={20} />
                </span>
                <div className="min-w-0">
                  <div className="text-[15px] font-extrabold leading-none text-brand-900">
                    {difficultyLabel(decision?.nextDifficulty ?? result.nextDifficulty)}
                  </div>
                  <div className="mt-0.5 text-xs font-bold uppercase tracking-wide text-neutral-500">
                    {t('cg.adaptation')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Adaptation note — only when difficulty actually shifts ── */}
          {(decision?.action ?? 'maintain') !== 'maintain' && (
            <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3.5 text-left sm:px-5">
              <div className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide text-brand-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand-600 shadow-card">
                  <SparkleIcon size={14} />
                </span>
                {t('cg.adaptation')}
              </div>
              <div className="mt-2 text-sm font-bold text-brand-800">
                {decision?.action === 'increase'
                  ? `${difficultyLabel(decision.previousDifficulty)} → ${difficultyLabel(decision.nextDifficulty)}`
                  : decision?.action === 'decrease'
                    ? `${difficultyLabel(decision.previousDifficulty)} → ${difficultyLabel(decision.nextDifficulty)}`
                    : ''}
              </div>
              <div className="mt-1 text-sm font-semibold leading-relaxed text-brand-700/90">
                {decision?.reason}
              </div>
            </div>
          )}

          {extraNote && (
            <div className="mt-3 rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-3 text-sm font-semibold leading-relaxed text-neutral-600">
              {extraNote}
            </div>
          )}

          {/* ── Encouragement — soft bordered quote block, tone-matched to ring ── */}
          {result.accuracy >= 85 && (
            <p
              className={`mt-5 rounded-2xl border px-4 py-3 text-center text-[15px] font-bold leading-relaxed ${encourageTone}`}
            >
              {t('games.encourage.high')}
            </p>
          )}
          {result.accuracy >= 60 && result.accuracy < 85 && (
            <p
              className={`mt-5 rounded-2xl border px-4 py-3 text-center text-[15px] font-bold leading-relaxed ${encourageTone}`}
            >
              {t('games.encourage.medium')}
            </p>
          )}
          {result.accuracy < 60 && (
            <p
              className={`mt-5 rounded-2xl border px-4 py-3 text-center text-[15px] font-bold leading-relaxed ${encourageTone}`}
            >
              {t('games.encourage.low')}
            </p>
          )}

          <div className="divider my-6" aria-hidden />

          {/* ── Actions — one clear primary + calm secondary ── */}
          <div className="flex flex-col gap-3">
            <Button variant="huge" onClick={onPlayAgain}>
              {t('games.play.again')}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/games')}>
              {t('games.home')}
            </Button>
          </div>

          <div className="mt-5">
            <Disclaimer>{t('baseline.disclaimer')}</Disclaimer>
          </div>
        </div>
      </Card>
    </div>
  );
}

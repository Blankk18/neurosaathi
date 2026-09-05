import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { Card, Button, ProgressRing, Disclaimer } from '@/components/ui';
import { SpeakText } from '@/components/common';
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

  return (
    <div className="pop fade-up">
      <Card className="text-center">
        <span className="text-6xl" aria-hidden>
          🎉
        </span>
        <h2 className="mt-2 text-3xl font-extrabold text-brand-900">{t('games.complete')}</h2>
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <ProgressRing value={result.accuracy} size={104} color={result.accuracy >= 85 ? '#638c52' : result.accuracy >= 60 ? '#b98545' : '#c9442a'} />
            <span className="font-bold text-brand-800">{t('games.accuracy')}</span>
          </div>
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-2 text-lg font-bold text-brand-900">
              <span>⏱</span> {result.responseTimeSec}s <span className="text-sm font-semibold text-neutral-500">{t('games.time')}</span>
            </div>
            <div className="flex items-center gap-2 text-lg font-bold text-brand-900">
              <span>❌</span> {result.mistakes} <span className="text-sm font-semibold text-neutral-500">{t('games.mistakes')}</span>
            </div>
            <div className="flex items-center gap-2 text-lg font-bold text-brand-900">
              <span>⚙️</span> {difficultyLabel(decision?.nextDifficulty ?? result.nextDifficulty)}
            </div>
          </div>
        </div>
        <SpeakText text={`${t('games.complete')} ${result.accuracy}% accuracy.`} />

        {(decision?.action ?? 'maintain') !== 'maintain' && (
          <div className="mt-4 rounded-2xl border-2 border-brand-200 bg-brand-50 p-3 text-left">
            <div className="text-base font-extrabold text-brand-800">🤖 {t('cg.adaptation')}</div>
            <div className="text-sm font-semibold text-brand-700">
              {decision?.action === 'increase'
                ? `${difficultyLabel(decision.previousDifficulty)} → ${difficultyLabel(decision.nextDifficulty)}`
                : decision?.action === 'decrease'
                  ? `${difficultyLabel(decision.previousDifficulty)} → ${difficultyLabel(decision.nextDifficulty)}`
                  : ''}
            </div>
            <div className="mt-1 text-sm text-brand-800">{decision?.reason}</div>
          </div>
        )}
        {extraNote && <div className="mt-2 text-sm font-semibold text-neutral-500">{extraNote}</div>}

        {result.accuracy >= 85 && (
          <p className="mt-3 text-lg font-bold text-brand-600">{t('games.encourage.high')}</p>
        )}
        {result.accuracy >= 60 && result.accuracy < 85 && (
          <p className="mt-3 text-lg font-bold text-warm-500">{t('games.encourage.medium')}</p>
        )}
        {result.accuracy < 60 && (
          <p className="mt-3 text-lg font-bold text-accent-500">{t('games.encourage.low')}</p>
        )}

        <div className="mt-5 flex flex-col gap-3">
          <Button variant="huge" onClick={onPlayAgain}>
            🔄 {t('games.play.again')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/games')}>
            {t('games.home')}
          </Button>
        </div>

        <div className="mt-4">
          <Disclaimer>{t('baseline.disclaimer')}</Disclaimer>
        </div>
      </Card>
    </div>
  );
}
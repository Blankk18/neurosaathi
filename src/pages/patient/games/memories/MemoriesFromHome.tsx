import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { Button, Card } from '@/components/ui';
import {
  HeartIcon,
  PlayIcon,
  SpeakerIcon,
  CheckCircleIcon,
  BackIcon,
  SparkleIcon,
} from '@/components/Icons';
import { memoryService } from '@/services/memoryService';
import { loadImage } from '@/services/storage';
import { useGameSession } from '@/pages/patient/games/useGameSession';
import type { ActivityChoice, ActivityRound, GameState, VisitedMemorySummary } from './types';
import { buildMemoriesFromHomeRounds, BUNDLED_FALLBACK_ROUNDS, getPersonName, getPlaceName } from './engine';
import { MemoryPhotoFrame } from './MemoryPhotoFrame';

export default function MemoriesFromHome() {
  const { t, state, speakText } = useApp();
  const navigate = useNavigate();
  const { finish } = useGameSession('memories-from-home');

  const elderId = state.patient?.id || 'e0000000-0000-0000-0000-000000000001';

  // Game lifecycle states
  const [gameState, setGameState] = useState<GameState>('intro');
  const [rounds, setRounds] = useState<ActivityRound[]>(BUNDLED_FALLBACK_ROUNDS);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);

  // Interaction states
  const [selectedChoice, setSelectedChoice] = useState<ActivityChoice | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [isCorrectFeedback, setIsCorrectFeedback] = useState(true);

  // Results tracking
  const [visitedMemories, setVisitedMemories] = useState<VisitedMemorySummary[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const roundStartTimeRef = useRef<number>(Date.now());

  // Image preloader helper
  const preloadImage = (url: string) => {
    if (!url || typeof url !== 'string') return;
    const img = new Image();
    img.src = url;
  };

  // Load memories and photos for the current elder
  const loadElderMemories = async () => {
    setGameState('loading');
    try {
      // 1. Fetch memories for the authenticated elder
      const remote = await memoryService.getMemories(elderId);
      const list = remote.length > 0 ? remote : state.familyMemories;

      // 2. Resolve image URLs (Supabase storage or IndexedDB blob)
      const photoMap: Record<string, string | null> = {};
      if (list && list.length > 0) {
        for (const m of list) {
          if (m.photo) {
            photoMap[m.id] = m.photo;
          } else {
            try {
              const blob = await loadImage(`fam-${m.id}`);
              if (blob) photoMap[m.id] = URL.createObjectURL(blob);
            } catch {
              photoMap[m.id] = null;
            }
          }
        }
      }

      // 3. Build deterministic activity rounds (prioritizes real memories with photos,
      // falls back to the guaranteed visual rounds if elder has no photo-backed memories)
      const builtRounds = buildMemoriesFromHomeRounds(list || [], photoMap, 3);
      setRounds(builtRounds);

      // Preload the first two rounds' images
      if (builtRounds[0]?.image) preloadImage(builtRounds[0].image);
      if (builtRounds[1]?.image) preloadImage(builtRounds[1].image);

      setGameState('intro');
    } catch {
      // Guaranteed visual fallback
      setRounds(BUNDLED_FALLBACK_ROUNDS);
      if (BUNDLED_FALLBACK_ROUNDS[0]?.image) preloadImage(BUNDLED_FALLBACK_ROUNDS[0].image);
      if (BUNDLED_FALLBACK_ROUNDS[1]?.image) preloadImage(BUNDLED_FALLBACK_ROUNDS[1].image);
      setGameState('intro');
    }
  };

  useEffect(() => {
    void loadElderMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderId]);

  // Preload upcoming round's image
  useEffect(() => {
    if (rounds[currentRoundIndex + 1]?.image) {
      preloadImage(rounds[currentRoundIndex + 1].image);
    }
  }, [currentRoundIndex, rounds]);

  // Start the game session
  const startGame = () => {
    setCurrentRoundIndex(0);
    setSelectedChoice(null);
    setIsLocked(false);
    setFeedbackText(null);
    setVisitedMemories([]);
    setCorrectCount(0);
    setResponseTimes([]);
    roundStartTimeRef.current = Date.now();
    setGameState('playing');

    if (rounds[0] && state.settings.speakInstructions) {
      speakText(`${rounds[0].prompt}. ${rounds[0].subtitle || ''}`);
    }
  };

  // Handle player choice selection
  const handleSelectChoice = (choice: ActivityChoice) => {
    if (isLocked) return; // Prevent double-tap race conditions
    setIsLocked(true);
    setSelectedChoice(choice);

    const timeSpent = (Date.now() - roundStartTimeRef.current) / 1000;
    setResponseTimes((prev) => [...prev, timeSpent]);

    const currentRound = rounds[currentRoundIndex];
    const isCorrect = choice.isCorrect;

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      setIsCorrectFeedback(true);
      setFeedbackText(currentRound.correctFeedback);
    } else {
      setIsCorrectFeedback(false);
      setFeedbackText(currentRound.gentleFeedback);
    }

    // Keep track of visited memories for the warm completion summary
    const person = getPersonName(currentRound.memory);
    const place = getPlaceName(currentRound.memory);
    setVisitedMemories((prev) => {
      if (prev.some((item) => item.id === currentRound.memory.id)) return prev;
      return [
        ...prev,
        {
          id: currentRound.memory.id,
          title: currentRound.alt || currentRound.memory.name || 'Family memory',
          image: currentRound.image,
          detail: person ? `With ${person}` : place ? `In ${place}` : currentRound.memory.relationship,
        },
      ];
    });

    // Advance to next round or completion with gentle pacing
    window.setTimeout(() => {
      if (currentRoundIndex + 1 < rounds.length) {
        const nextIndex = currentRoundIndex + 1;
        setCurrentRoundIndex(nextIndex);
        setSelectedChoice(null);
        setFeedbackText(null);
        setIsLocked(false);
        roundStartTimeRef.current = Date.now();

        if (rounds[nextIndex] && state.settings.speakInstructions) {
          speakText(`${rounds[nextIndex].prompt}. ${rounds[nextIndex].subtitle || ''}`);
        }
      } else {
        // Session Complete!
        setGameState('complete');
        const finalCorrect = isCorrect ? correctCount + 1 : correctCount;
        const finalTimes = [...responseTimes, timeSpent];

        finish({
          total: rounds.length,
          correct: finalCorrect,
          mistakes: rounds.length - finalCorrect,
          responseTimes: finalTimes,
        });

        if (state.settings.speakInstructions) {
          speakText(t('memoriesHome.completeTitle') + '. ' + t('memoriesHome.wonderful'));
        }
      }
    }, 1300);
  };

  const currentRound = rounds[currentRoundIndex];

  return (
    <div className="relative min-h-dvh max-w-4xl mx-auto px-4 pb-28 pt-3 sm:px-6">
      {/* Visual background texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-25"
        style={{
          backgroundImage: "url('/assets/memories-game/bg_paper.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* =================================================================== */}
        {/* 1. LOADING STATE                                                    */}
        {/* =================================================================== */}
        {gameState === 'loading' && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warm-100 text-3xl shadow-soft animate-pulse">
              📖
            </div>
            <h2 className="mt-5 text-2xl font-extrabold text-brand-900">
              {t('memoriesHome.loading')}
            </h2>
            <p className="mt-2 text-base font-semibold text-neutral-600">
              Gathering your family moments…
            </p>
          </div>
        )}

        {/* =================================================================== */}
        {/* 2. EMPTY STATE                                                      */}
        {/* =================================================================== */}
        {gameState === 'empty' && (
          <div className="mx-auto max-w-lg pt-6 text-center">
            <Card className="overflow-hidden p-0 border border-warm-200/80 shadow-lift">
              <div className="aspect-[4/3] w-full overflow-hidden bg-warm-100">
                <img
                  src="/assets/memories-game/empty_art.jpg"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-900">
                  {t('memoriesHome.emptyTitle')}
                </h2>
                <p className="mt-3 text-base sm:text-lg font-semibold leading-relaxed text-neutral-700">
                  {t('memoriesHome.emptyDesc')}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate('/memories')}
                    className="w-full justify-center !text-lg"
                  >
                    📖 {t('memoriesHome.viewMemories')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => navigate('/games')}
                    className="w-full justify-center !text-lg text-brand-800"
                  >
                    ← {t('memoriesHome.backToGames')}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* =================================================================== */}
        {/* 3. ERROR STATE                                                      */}
        {/* =================================================================== */}
        {gameState === 'error' && (
          <div className="mx-auto max-w-md pt-12 text-center">
            <Card className="p-6 sm:p-8">
              <span className="text-4xl" aria-hidden="true">
                💛
              </span>
              <h2 className="mt-4 text-2xl font-extrabold text-brand-900">
                {t('memoriesHome.errorTitle')}
              </h2>
              <p className="mt-2 text-base text-neutral-600">{t('memoriesHome.errorDesc')}</p>
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => void loadElderMemories()}
                  className="w-full justify-center"
                >
                  🔄 {t('memoriesHome.tryAgain')}
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => navigate('/games')}
                  className="w-full justify-center text-brand-800"
                >
                  ← {t('memoriesHome.backToGames')}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* =================================================================== */}
        {/* 4. INTRO STATE (Warm, beautiful welcoming cover)                    */}
        {/* =================================================================== */}
        {gameState === 'intro' && (
          <div className="fade-in mx-auto max-w-2xl pt-2">
            <PageHeader
              backTo="/games"
              title={t('memoriesHome.title')}
              showHome
              right={
                <button
                  onClick={() =>
                    speakText(
                      `${t('memoriesHome.title')}. ${t('memoriesHome.subtitle')}. ${t('memoriesHome.reassurance')}`
                    )
                  }
                  className="rounded-full bg-white p-3 text-xl shadow-card transition hover:bg-brand-50"
                  aria-label="Listen"
                >
                  <SpeakerIcon size={22} className="text-brand-700" />
                </button>
              }
            />

            <Card className="mt-4 overflow-hidden p-0 border border-warm-200/80 shadow-lift">
              {/* 16:9 Cover Banner Artwork */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-warm-100">
                <img
                  src="/assets/memories-game/cover_16_9.jpg"
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                  <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-bold tracking-wider backdrop-blur-sm">
                    ✨ {t('memoriesHome.tag.personal')}
                  </span>
                  <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-bold tracking-wider backdrop-blur-sm">
                    {rounds.length} Moments Ready
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-100 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-warm-800">
                  <HeartIcon size={14} /> {t('memoriesHome.tag.gentle')}
                </span>

                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-900">
                  {t('memoriesHome.title')}
                </h1>

                <p className="mx-auto mt-3 max-w-lg text-lg sm:text-xl font-semibold leading-relaxed text-brand-800">
                  {t('memoriesHome.subtitle')}
                </p>

                <p className="mx-auto mt-2 max-w-md text-sm sm:text-base font-semibold text-neutral-600">
                  {t('memoriesHome.reassurance')}
                </p>

                <div className="mt-8 flex justify-center">
                  <Button
                    variant="huge"
                    onClick={startGame}
                    className="w-full sm:w-auto sm:px-14 !text-xl shadow-lift"
                  >
                    <PlayIcon size={24} /> {t('memoriesHome.begin')}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* =================================================================== */}
        {/* 5. PLAYING STATE (Image-driven memory activity)                      */}
        {/* =================================================================== */}
        {gameState === 'playing' && currentRound && (
          <div className="fade-in mx-auto max-w-3xl pt-2">
            {/* Header bar with Back button, listen button, and calm step dots */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-warm-200/70">
              <button
                onClick={() => setGameState('intro')}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-base font-bold text-brand-800 shadow-soft transition hover:bg-brand-50"
                aria-label="Back to intro"
              >
                <BackIcon size={18} />
                <span className="hidden sm:inline">{t('common.back')}</span>
              </button>

              {/* Gentle step progress dots without ticking timers */}
              <div className="flex items-center gap-2" aria-label={`Step ${currentRoundIndex + 1} of ${rounds.length}`}>
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {rounds.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-3 w-3 rounded-full transition-all duration-300 ${
                        idx === currentRoundIndex
                          ? 'bg-brand-600 scale-125 shadow-soft'
                          : idx < currentRoundIndex
                          ? 'bg-brand-400'
                          : 'bg-warm-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-1 text-sm font-extrabold text-brand-800">
                  {currentRoundIndex + 1}/{rounds.length}
                </span>
              </div>

              {/* Audio Listen button */}
              <button
                onClick={() =>
                  speakText(
                    `${currentRound.prompt}. ${currentRound.subtitle || ''}`
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-brand-800 shadow-soft transition hover:bg-brand-50"
                aria-label="Read question aloud"
              >
                <SpeakerIcon size={18} className="text-brand-600" />
                <span className="hidden sm:inline">{t('memoriesHome.listen')}</span>
              </button>
            </div>

            {/* Layout: Desktop 2-column or Mobile stack */}
            <div className="mt-5 grid items-start gap-6 lg:grid-cols-12">
              {/* Image viewport (Left column on desktop, or top in standard mode) */}
              {currentRound.mode !== 'which' && (
                <div className="lg:col-span-6">
                  <MemoryPhotoFrame
                    image={currentRound.image}
                    alt={currentRound.alt}
                    caption={currentRound.memory.relationship ? `Your ${currentRound.memory.relationship}` : undefined}
                    tag={currentRound.memory.place || currentRound.memory.event}
                  />
                </div>
              )}

              {/* Question and Choices area */}
              <div
                className={
                  currentRound.mode === 'which' ? 'lg:col-span-12' : 'lg:col-span-6'
                }
              >
                <Card className="border border-warm-200/80 bg-white/95 p-5 sm:p-6 shadow-card">
                  {/* Mode badge */}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-700">
                    <SparkleIcon size={13} /> {t('memoriesHome.title')}
                  </span>

                  {/* Primary Question Prompt */}
                  <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-900 leading-tight">
                    {currentRound.prompt}
                  </h2>

                  {/* Gentle Context Subtitle */}
                  {currentRound.subtitle && (
                    <p className="mt-1.5 text-base font-semibold text-neutral-600">
                      {currentRound.subtitle}
                    </p>
                  )}

                  {/* Standard Text Choices */}
                  {currentRound.mode !== 'which' ? (
                    <div className="mt-6 flex flex-col gap-3">
                      {currentRound.choices.map((choice, idx) => {
                        const isChosen = selectedChoice?.id === choice.id;
                        return (
                          <button
                            key={choice.id}
                            disabled={isLocked}
                            onClick={() => handleSelectChoice(choice)}
                            className={`group relative flex min-h-[56px] w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all duration-200 active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 ${
                              isChosen
                                ? choice.isCorrect
                                  ? 'border-brand-500 bg-brand-50/90 shadow-soft ring-2 ring-brand-400'
                                  : 'border-warm-400 bg-warm-50/90 shadow-soft'
                                : 'border-warm-200/90 bg-white shadow-soft hover:border-brand-300 hover:bg-brand-50/30'
                            }`}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warm-100 text-sm font-extrabold text-brand-800 transition group-hover:bg-brand-100">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="flex-1 text-lg sm:text-xl font-extrabold text-brand-900">
                              {choice.text}
                            </span>
                            {isChosen && (
                              <span
                                className={`text-xl ${
                                  choice.isCorrect ? 'text-brand-600' : 'text-warm-600'
                                }`}
                              >
                                {choice.isCorrect ? '✓' : '💛'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Multi-Photo Choices (Mode 5) */
                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {currentRound.choices.map((choice) => {
                        const isChosen = selectedChoice?.id === choice.id;
                        return (
                          <button
                            key={choice.id}
                            disabled={isLocked}
                            onClick={() => handleSelectChoice(choice)}
                            className={`group flex flex-col overflow-hidden rounded-2xl border-2 text-center transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 ${
                              isChosen
                                ? choice.isCorrect
                                  ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-400'
                                  : 'border-warm-400 bg-warm-50'
                                : 'border-warm-200/90 bg-white hover:border-brand-300'
                            }`}
                          >
                            <div className="aspect-[4/3] w-full overflow-hidden bg-warm-100">
                              {choice.image ? (
                                <img
                                  src={choice.image}
                                  alt={choice.text}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-3xl">
                                  🖼️
                                </div>
                              )}
                            </div>
                            <span className="p-3 text-base font-extrabold text-brand-900 line-clamp-1">
                              {choice.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Feedback Message Bar */}
                  <div className="mt-5 min-h-[44px] flex items-center justify-center">
                    {feedbackText && (
                      <div
                        className={`fade-in flex items-center gap-2 rounded-2xl px-4 py-2.5 text-base sm:text-lg font-bold shadow-soft ${
                          isCorrectFeedback
                            ? 'bg-brand-50 text-brand-800 border border-brand-200'
                            : 'bg-warm-50 text-warm-900 border border-warm-200'
                        }`}
                        role="status"
                        aria-live="polite"
                      >
                        <CheckCircleIcon
                          size={20}
                          className={isCorrectFeedback ? 'text-brand-600' : 'text-warm-600'}
                        />
                        <span>{feedbackText}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 6. COMPLETION STATE                                                 */}
        {/* =================================================================== */}
        {gameState === 'complete' && (
          <div className="fade-in mx-auto max-w-2xl pt-2 text-center">
            <Card className="overflow-hidden p-0 border border-warm-200/80 shadow-lift">
              {/* Celebratory Keepsake Artwork */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-warm-100">
                <img
                  src="/assets/memories-game/completion_art.jpg"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-6 sm:p-8">
                <span className="text-3xl sm:text-4xl" aria-hidden="true">
                  ❤️
                </span>
                <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-900">
                  {t('memoriesHome.completeTitle')}
                </h2>

                <p className="mt-2 text-lg sm:text-xl font-bold text-brand-800">
                  You revisited {rounds.length} {rounds.length === 1 ? 'memory' : 'memories'} from home.
                </p>

                <p className="mx-auto mt-2 max-w-md text-sm sm:text-base font-semibold text-neutral-600">
                  {t('memoriesHome.wonderful')}
                </p>

                {/* Thumbnails of memories visited during this session */}
                {visitedMemories.length > 0 && (
                  <div className="mt-6 rounded-3xl bg-warm-50/70 p-4 border border-warm-200/70">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-brand-700 mb-3">
                      Moments Explored Today
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {visitedMemories.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-2.5 rounded-2xl bg-white p-2 pr-3.5 shadow-card border border-warm-100"
                        >
                          <div className="h-10 w-10 overflow-hidden rounded-xl bg-warm-100">
                            <img
                              src={v.image}
                              alt={v.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-extrabold text-brand-900 leading-tight">
                              {v.title}
                            </div>
                            {v.detail && (
                              <div className="text-xs font-semibold text-neutral-600">
                                {v.detail}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={startGame}
                    className="w-full sm:w-auto sm:px-8 !text-lg shadow-lift"
                  >
                    🔄 {t('memoriesHome.playAgain')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => navigate('/games')}
                    className="w-full sm:w-auto sm:px-8 !text-lg"
                  >
                    ← {t('memoriesHome.backToGames')}
                  </Button>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => navigate('/memories')}
                    className="text-sm font-bold text-brand-700 hover:text-brand-900 underline underline-offset-4"
                  >
                    📖 {t('memoriesHome.viewMemories')}
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

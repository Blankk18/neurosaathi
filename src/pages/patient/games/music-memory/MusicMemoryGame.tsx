import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { Button, Card, Chip } from '@/components/ui';
import {
  MusicIcon,
  HeadphonesIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  RepeatIcon,
  VolumeIcon,
  VolumeMuteIcon,
  CheckCircleIcon,
  SparkleIcon,
} from '@/components/Icons';
import { useGameSession } from '@/pages/patient/games/useGameSession';
import { MUSIC_SONGS, pickRandomClip, type MusicSong, type MusicClip } from './musicData';

type GamePhase = 'intro' | 'playingClip' | 'clipPaused' | 'question' | 'feedback' | 'complete' | 'error';

export default function MusicMemoryGame() {
  const { t } = useApp();
  const navigate = useNavigate();
  const { finish } = useGameSession('music-memory');

  // Multi-song progress
  const [songIndex, setSongIndex] = useState(0);
  const currentSong: MusicSong = MUSIC_SONGS[songIndex] || MUSIC_SONGS[0];

  // Clip state
  const [currentClip, setCurrentClip] = useState<MusicClip>(() => pickRandomClip(currentSong));

  // Lifecycle
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  // Audio player state
  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Screen reader announcer
  const [announcement, setAnnouncement] = useState('');

  // Performance metrics tracking
  const [roundStartTime, setRoundStartTime] = useState<number>(Date.now());
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Single controlled audio element
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);

  // Format seconds to mm:ss
  const formatTime = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Helper to announce for screen reader
  const announce = (msg: string) => {
    setAnnouncement(msg);
  };

  // Teardown audio on unmount or route change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Smooth scroll to full-song player when unlocked
  useEffect(() => {
    if (phase === 'feedback' && playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [phase]);

  // Sync volume and loop settings with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume;
      audio.loop = isLooping;
    }
  }, [volume, isMuted, isLooping]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);

    // Check if we are in clip mode and reached clip.endTime
    if (phase === 'playingClip' && currentClip) {
      if (audio.currentTime >= currentClip.endTime) {
        audio.pause();
        setPhase('question');
        announce('Song paused. What comes next?');
      }
    }
  };

  const handleEnded = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.loop) {
      audio.currentTime = 0;
      void audio.play();
    } else {
      setIsPlayingFull(false);
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const audio = e.currentTarget;
    if (!audio || !audio.src || audio.src === window.location.href) return;
    const mediaError = audio.error;
    if (!mediaError || mediaError.code === 1 /* MEDIA_ERR_ABORTED */) return;

    // eslint-disable-next-line no-console
    console.warn('[MusicMemory] Audio error:', mediaError.code, mediaError.message);
    if (phase === 'playingClip') {
      setAudioError('We could not play this song right now.');
      setPhase('error');
    }
  };

  // Start the game activity (initial user interaction enables autoplay)
  const startGame = () => {
    const clip = pickRandomClip(currentSong);
    setCurrentClip(clip);
    setSelectedChoice(null);
    setIsLocked(false);
    setIsCorrect(null);
    setIsPlayingFull(false);
    setAudioError(null);

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = clip.startTime;
      audio
        .play()
        .then(() => {
          setPhase('playingClip');
          setRoundStartTime(Date.now());
          announce(`Listening to ${currentSong.title}`);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[MusicMemory] Autoplay prevented:', err);
          setPhase('clipPaused');
        });
    }
  };

  // Replay the SAME clip
  const replayClip = () => {
    const audio = audioRef.current;
    if (!audio || !currentClip) return;
    audio.pause();
    audio.currentTime = currentClip.startTime;
    audio
      .play()
      .then(() => {
        setPhase('playingClip');
        announce('Listening again');
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[MusicMemory] Replay error:', err);
        setPhase('clipPaused');
      });
  };

  // User chooses an answer
  const handleAnswer = (choice: string) => {
    if (isLocked) return;
    setIsLocked(true);
    setSelectedChoice(choice);

    const rt = (Date.now() - roundStartTime) / 1000;
    setResponseTimes((prev) => [...prev, rt]);

    const correct = choice === currentClip.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      setCorrectCount((c) => c + 1);
      announce('Correct answer! Beautiful remembering. Full song is now available.');
    } else {
      setMistakes((m) => m + 1);
      announce(`That is okay. The next line was: ${currentClip.continuation || currentClip.correctAnswer}. Full song is now available.`);
    }

    setPhase('feedback');
  };

  // Full Player Controls
  const togglePlayFullSong = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlayingFull) {
      audio.pause();
      setIsPlayingFull(false);
      announce('Song paused.');
    } else {
      audio
        .play()
        .then(() => {
          setIsPlayingFull(true);
          announce('Playing full song.');
        })
        .catch(() => {
          setIsPlayingFull(false);
        });
    }
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleRestartSong = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    audio
      .play()
      .then(() => {
        setIsPlayingFull(true);
        announce('Restarting song.');
      })
      .catch(() => {});
  };

  const toggleLoop = () => {
    const audio = audioRef.current;
    const next = !isLooping;
    setIsLooping(next);
    if (audio) {
      audio.loop = next;
    }
    announce(next ? 'Loop enabled.' : 'Loop disabled.');
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = volume > 0 ? volume : 0.8;
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  // Advance to next song or finish
  const handleNextSong = () => {
    // Teardown current audio playback
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingFull(false);

    if (songIndex < MUSIC_SONGS.length - 1) {
      const nextIndex = songIndex + 1;
      setSongIndex(nextIndex);
      const nextSong = MUSIC_SONGS[nextIndex];
      const nextClip = pickRandomClip(nextSong);
      setCurrentClip(nextClip);
      setSelectedChoice(null);
      setIsLocked(false);
      setIsCorrect(null);
      setPhase('intro');
      announce(`Song ${nextIndex + 1} of ${MUSIC_SONGS.length}`);
    } else {
      // Record complete session to NeuroSaathi engine & Supabase
      const totalRounds = MUSIC_SONGS.length;
      finish({
        correct: correctCount,
        total: totalRounds,
        responseTimes: responseTimes.length > 0 ? responseTimes : [4.5],
        mistakes,
      });

      setPhase('complete');
      announce('That was lovely! You finished listening to both songs.');
    }
  };

  // Play again from beginning
  const handlePlayAgain = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setSongIndex(0);
    const s1 = MUSIC_SONGS[0];
    setCurrentClip(pickRandomClip(s1));
    setSelectedChoice(null);
    setIsLocked(false);
    setIsCorrect(null);
    setCorrectCount(0);
    setMistakes(0);
    setResponseTimes([]);
    setPhase('intro');
  };

  // Visual equalizer animation state
  const isAudioActive = phase === 'playingClip' || isPlayingFull;

  return (
    <div className="mx-auto w-full max-w-2xl px-2 sm:px-4 pb-36 sm:pb-40 pt-2">
      {/* Controlled HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={currentSong.audioSrc}
        preload="auto"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
          setAudioError(null);
        }}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
      />

      {/* Hidden Live Region for Accessibility Announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      <PageHeader
        backTo="/games"
        showHome
        title={t('games.musicMemory') || 'Guess the Next Lyric'}
        right={
          <Chip tone="brand">
            <SparkleIcon size={14} className="text-brand-600" />
            <span className="font-bold">Gentle</span>
          </Chip>
        }
      />

      {/* ============================================================ */}
      {/* 1. INTRO / WELCOME MODAL                                      */}
      {/* ============================================================ */}
      {phase === 'intro' && (
        <div
          className="mt-4 fade-up"
          role="dialog"
          aria-labelledby="intro-title"
          aria-describedby="intro-desc"
        >
          <Card className="overflow-hidden border border-warm-300/80 bg-gradient-to-b from-warm-50 via-white to-warm-50 p-6 sm:p-8 text-center shadow-card">
            <div className="relative mx-auto h-48 w-full max-w-md overflow-hidden rounded-2xl bg-warm-100 shadow-soft">
              {!imageError[songIndex === 0 ? 'hero' : currentSong.id] ? (
                <img
                  src={songIndex === 0 ? '/assets/music-game/hero.jpg' : currentSong.coverImage}
                  alt={songIndex === 0 ? 'Nostalgic vintage radio with microphone and gentle musical notes' : currentSong.altText}
                  className="h-full w-full object-cover"
                  onError={() => setImageError((prev) => ({ ...prev, [songIndex === 0 ? 'hero' : currentSong.id]: true }))}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-700">
                  <MusicIcon size={56} />
                </div>
              )}
              <div className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-brand-800 shadow-sm backdrop-blur-sm">
                🎵 Song {songIndex + 1} of {MUSIC_SONGS.length}
              </div>
            </div>

            <h2 id="intro-title" className="mt-6 text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-900">
              {currentSong.title}
            </h2>

            <p id="intro-desc" className="mx-auto mt-3 max-w-md text-base sm:text-lg font-medium leading-relaxed text-brand-800/90">
              Let&apos;s listen to a familiar musical memory. We&apos;ll play a short clip, and you can guess what comes next!
            </p>

            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="huge"
                onClick={startGame}
                className="w-full sm:w-auto px-10 py-4 text-xl shadow-lift"
              >
                <PlayIcon size={22} /> {t('common.start') || 'Start'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. ACTIVE QUIZ & PLAYER LAYOUT                                */}
      {/* ============================================================ */}
      {(phase === 'playingClip' ||
        phase === 'clipPaused' ||
        phase === 'question' ||
        phase === 'feedback') && (
        <div className="mt-4 space-y-5 fade-up">
          {/* Progress Banner */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-800">
                {songIndex + 1}
              </span>
              <span className="text-sm font-bold text-neutral-600">
                Song {songIndex + 1} of {MUSIC_SONGS.length}
              </span>
            </div>

            {/* Dots */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {MUSIC_SONGS.map((_, i) => (
                <span
                  key={i}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    i === songIndex
                      ? 'w-6 bg-brand-600'
                      : i < songIndex
                      ? 'w-2.5 bg-brand-400'
                      : 'w-2.5 bg-neutral-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Desktop Responsive Grid (Left Art / Right Quiz) */}
          <div className="grid gap-5 md:grid-cols-12 items-start">
            {/* Song Cover Artwork */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-warm-200 bg-warm-100 shadow-card">
                {!imageError[currentSong.id] ? (
                  <img
                    src={currentSong.coverImage}
                    alt={currentSong.altText}
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                    onError={() => setImageError((prev) => ({ ...prev, [currentSong.id]: true }))}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-brand-50 p-4 text-center text-brand-700">
                    <MusicIcon size={48} />
                    <span className="mt-2 text-xs font-semibold">{currentSong.title}</span>
                  </div>
                )}

                {/* Subtle Equalizer Overlay when playing */}
                {isAudioActive && (
                  <div className="absolute bottom-3 right-3 flex items-end gap-1 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm shadow-soft">
                    <span className="h-3 w-1 animate-pulse rounded-full bg-accent-400" />
                    <span className="h-5 w-1 animate-bounce rounded-full bg-warm-300 delay-100" />
                    <span className="h-4 w-1 animate-pulse rounded-full bg-accent-300 delay-75" />
                    <span className="h-2 w-1 animate-bounce rounded-full bg-white delay-150" />
                  </div>
                )}
              </div>

              <h3 className="mt-3 text-center text-lg sm:text-xl font-extrabold text-brand-900">
                {currentSong.title}
              </h3>
            </div>

            {/* Right Column: Listening / Question State */}
            <div className="md:col-span-7 flex flex-col space-y-4">
              {/* Status Header */}
              {phase === 'playingClip' && (
                <Card className="flex items-center justify-between border-brand-200 bg-brand-50/90 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shadow-soft">
                      <HeadphonesIcon size={22} />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-brand-900">Listening to the song...</p>
                      <p className="text-xs font-semibold text-brand-700/80">Listen closely to the melody</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-brand-600 animate-ping" />
                  </div>
                </Card>
              )}

              {phase === 'clipPaused' && (
                <Card className="flex flex-col sm:flex-row items-center justify-between gap-3 border-warm-200 bg-warm-50 p-4">
                  <p className="text-sm font-bold text-warm-900">Tap play to listen to the clip</p>
                  <Button variant="primary" size="md" onClick={replayClip}>
                    <PlayIcon size={16} /> Play Clip
                  </Button>
                </Card>
              )}

              {/* Question & Answer Cards */}
              {(phase === 'question' || phase === 'feedback') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl sm:text-2xl font-extrabold text-brand-900">
                      What comes next?
                    </h4>
                    {/* Listen again button */}
                    <button
                      onClick={replayClip}
                      disabled={isLocked && phase !== 'feedback'}
                      className="inline-flex items-center gap-1.5 rounded-full border border-warm-300 bg-white px-3.5 py-1.5 text-xs font-bold text-brand-800 shadow-soft transition-colors hover:bg-warm-50 disabled:opacity-50"
                      aria-label="Listen again to the quiz clip"
                    >
                      <RotateCcwIcon size={14} /> Listen again
                    </button>
                  </div>

                  {/* Lyric prompt hint */}
                  <div className="rounded-2xl bg-warm-50/80 px-4 py-2.5 border border-warm-200/60">
                    <p className="text-sm font-medium italic text-neutral-700">
                      &ldquo;{currentClip.promptLyric}&rdquo;
                    </p>
                  </div>

                  {/* 3 Large Answer Choices */}
                  <div className="space-y-2.5 pt-1" role="group" aria-label="Answer choices">
                    {currentClip.choices.map((choice, idx) => {
                      const isSelected = selectedChoice === choice;
                      const isAnswerCorrect = choice === currentClip.correctAnswer;

                      let btnStyle = 'border-warm-200 bg-white text-neutral-800 hover:border-brand-300 hover:bg-brand-50/40';

                      if (isLocked) {
                        if (isSelected && isAnswerCorrect) {
                          btnStyle = 'border-green-500 bg-green-50 text-green-900 font-extrabold ring-2 ring-green-400';
                        } else if (isSelected && !isAnswerCorrect) {
                          btnStyle = 'border-warm-400 bg-warm-100 text-warm-900 font-semibold';
                        } else if (!isSelected && isAnswerCorrect && phase === 'feedback') {
                          btnStyle = 'border-green-300 bg-green-50/50 text-green-900';
                        } else {
                          btnStyle = 'border-neutral-200 bg-neutral-50/60 text-neutral-500 opacity-60';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAnswer(choice)}
                          disabled={isLocked}
                          className={`w-full min-h-[54px] rounded-2xl border-2 px-5 py-3.5 text-left text-base sm:text-lg transition-all duration-200 shadow-sm focus:outline-none focus:ring-4 focus:ring-brand-200 ${btnStyle}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="leading-snug">{choice}</span>
                            {isLocked && isAnswerCorrect && (
                              <span className="text-green-600 shrink-0">
                                <CheckCircleIcon size={22} />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback Message */}
                  {phase === 'feedback' && (
                    <div
                      className={`mt-3 rounded-2xl p-4 transition-all duration-300 ${
                        isCorrect
                          ? 'border border-green-200 bg-green-50/90 text-green-900'
                          : 'border border-warm-200 bg-warm-50 text-warm-900'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl" aria-hidden="true">
                          {isCorrect ? '😊' : '💛'}
                        </span>
                        <div>
                          <p className="text-base font-extrabold">
                            {isCorrect
                              ? 'Yes! You remembered it. Beautiful remembering!'
                              : "That's okay! Music is all about enjoying the melody."}
                          </p>
                          {!isCorrect && currentClip.continuation && (
                            <p className="mt-1 text-sm font-semibold text-neutral-700">
                              The next line is: &ldquo;{currentClip.continuation}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* 3. FULL SONG PLAYER (UNLOCKED AFTER ATTEMPT)                  */}
          {/* ============================================================ */}
          {phase === 'feedback' && (
            <div ref={playerRef} id="full-song-player" className="fade-up">
              <Card className="mt-6 border border-brand-200/80 bg-gradient-to-br from-brand-50/60 via-white to-warm-50/50 p-5 sm:p-6 shadow-card">
              <div className="flex items-center justify-between pb-3 border-b border-warm-200/60">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-brand-100 p-2 text-brand-700">
                    <MusicIcon size={18} />
                  </span>
                  <div>
                    <h4 className="text-base font-extrabold text-brand-900">
                      Listen to the full song
                    </h4>
                    <p className="text-xs text-neutral-600">
                      Enjoy {currentSong.title} from beginning to end
                    </p>
                  </div>
                </div>

                {/* Advance Button */}
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleNextSong}
                  className="px-5 shadow-soft"
                >
                  {songIndex < MUSIC_SONGS.length - 1 ? (
                    <>Next Song →</>
                  ) : (
                    <>Complete 🎵</>
                  )}
                </Button>
              </div>

              {/* Player UI */}
              <div className="mt-4 space-y-4">
                {/* Seek Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-neutral-500">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={1}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    aria-label="Seek position in song"
                  />
                </div>

                {/* Player Buttons Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {/* Left Controls: Loop & Restart */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRestartSong}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-warm-200 bg-white text-neutral-700 shadow-soft hover:bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      aria-label="Restart song from the beginning"
                      title="Restart song"
                    >
                      <RotateCcwIcon size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={toggleLoop}
                      aria-pressed={isLooping}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-soft transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 ${
                        isLooping
                          ? 'border-brand-500 bg-brand-100 text-brand-800'
                          : 'border-warm-200 bg-white text-neutral-700 hover:bg-warm-50'
                      }`}
                      aria-label="Loop song"
                      title={isLooping ? 'Loop is ON' : 'Loop is OFF'}
                    >
                      <RepeatIcon size={18} />
                    </button>
                  </div>

                  {/* Center: Large Play / Pause Button */}
                  <button
                    type="button"
                    onClick={togglePlayFullSong}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lift transition-transform duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-brand-300"
                    aria-label={isPlayingFull ? 'Pause song' : 'Play song'}
                  >
                    {isPlayingFull ? <PauseIcon size={24} /> : <PlayIcon size={24} className="ml-1" />}
                  </button>

                  {/* Right: Volume Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-warm-200 bg-white text-neutral-700 shadow-soft hover:bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeMuteIcon size={18} /> : <VolumeIcon size={18} />}
                    </button>

                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="h-2 w-20 sm:w-24 cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-brand-600 focus:outline-none"
                      aria-label="Volume"
                    />
                  </div>
                </div>
              </div>
            </Card>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. COMPLETION SCREEN                                          */}
      {/* ============================================================ */}
      {phase === 'complete' && (
        <div className="mt-4 fade-up" role="region" aria-labelledby="completion-title">
          <Card className="overflow-hidden border border-warm-300/80 bg-gradient-to-b from-warm-50 via-white to-warm-50 p-6 sm:p-8 text-center shadow-card">
            <div className="relative mx-auto h-48 w-full max-w-md overflow-hidden rounded-2xl bg-warm-100 shadow-soft">
              {!imageError['completion'] ? (
                <img
                  src="/assets/music-game/completion.jpg"
                  alt="Gramophone with brass horn and fresh flowers in warm morning sunlight"
                  className="h-full w-full object-cover"
                  onError={() => setImageError((prev) => ({ ...prev, completion: true }))}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-700">
                  <MusicIcon size={56} />
                </div>
              )}
            </div>

            <h2 id="completion-title" className="mt-6 text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-900">
              That was lovely! 🎵
            </h2>

            <p className="mx-auto mt-2 max-w-md text-base sm:text-lg font-semibold text-neutral-600">
              You listened to two familiar nostalgic songs:
            </p>

            {/* List of songs enjoyed */}
            <div className="mx-auto mt-5 max-w-md space-y-2 text-left">
              {MUSIC_SONGS.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center gap-3 rounded-2xl border border-warm-200 bg-white p-3.5 shadow-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <MusicIcon size={18} />
                  </span>
                  <div>
                    <p className="text-base font-extrabold text-brand-900">{song.title}</p>
                    <p className="text-xs text-neutral-500">Full classic audio available</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="huge"
                onClick={handlePlayAgain}
                className="w-full sm:w-auto px-8 py-3.5 text-lg shadow-lift"
              >
                <RotateCcwIcon size={20} /> Play Again
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/games')}
                className="w-full sm:w-auto px-8"
              >
                Back to Games
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. ERROR STATE FALLBACK                                       */}
      {/* ============================================================ */}
      {phase === 'error' && (
        <Card className="mt-6 border-red-200 bg-red-50/50 p-6 text-center">
          <p className="text-lg font-bold text-red-900">
            {audioError || "We couldn't play this song right now."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="primary" onClick={startGame}>
              Try Again
            </Button>
            <Button variant="secondary" onClick={() => navigate('/games')}>
              Back to Games
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

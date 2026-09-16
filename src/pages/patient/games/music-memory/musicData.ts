// ============================================================================
// MUSIC MEMORY GAME — DATA MODEL & APPROVED CANDIDATE CLIPS
// Curated lyric-rich segments with natural musical phrasing and verified
// lyric continuations. No transcription or external APIs required.
// ============================================================================

export interface MusicClip {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  question: string;
  promptLyric: string; // The sung lyric line that just played
  choices: string[];
  correctAnswer: string;
  continuation?: string;
}

export interface MusicSong {
  id: string;
  title: string;
  audioSrc: string;
  coverImage: string;
  altText: string;
  clips: MusicClip[];
}

export const MUSIC_SONGS: MusicSong[] = [
  {
    id: 'zindagi-ek-safar',
    title: 'Zindagi Ek Safar Hai Suhana',
    audioSrc: '/music/zindagi-ek-safar.mp3',
    coverImage: '/assets/music-game/zindagi.jpg',
    altText: 'Warm nostalgic Indian road journey at sunset with vintage radio',
    clips: [
      {
        id: 'zindagi-clip-01',
        startTime: 21.0,
        endTime: 36.5,
        question: 'What comes next?',
        promptLyric: 'Zindagi ek safar hai suhana...',
        choices: [
          'Yahan kal kya ho kisne jaana',
          'Chalo dildar chalo chand ke paar',
          'Yeh shaam mastani madhosh kiye jaaye',
        ],
        correctAnswer: 'Yahan kal kya ho kisne jaana',
        continuation: 'Yahan kal kya ho kisne jaana',
      },
      {
        id: 'zindagi-clip-02',
        startTime: 97.0,
        endTime: 112.0,
        question: 'What comes next?',
        promptLyric: 'Chand taaron se chalna hai aage, aasmanon se badhna hai aage...',
        choices: [
          'Pichhe reh jayega yeh zamana',
          'Hum bhi agar bachhe hote',
          'Dil kya kare jab kisi se',
        ],
        correctAnswer: 'Pichhe reh jayega yeh zamana',
        continuation: 'Pichhe reh jayega yeh zamana, yahan kal kya ho kisne jaana',
      },
    ],
  },
  {
    id: 'yeh-dosti',
    title: 'Yeh Dosti Hum Nahi Todenge',
    audioSrc: '/music/yeh-dosti.mp3',
    coverImage: '/assets/music-game/yehdosti.jpg',
    altText: 'Two vintage microphones in warm studio golden light',
    clips: [
      {
        id: 'yehdosti-clip-01',
        startTime: 38.0,
        endTime: 53.2,
        question: 'What comes next?',
        promptLyric: 'Yeh dosti hum nahi todenge...',
        choices: [
          'Todenge dam magar tera saath na chhodenge',
          'Tere jaisa yaar kahan kahan aisa yaaraana',
          'Diye jalte hain phool khilte hain',
        ],
        correctAnswer: 'Todenge dam magar tera saath na chhodenge',
        continuation: 'Todenge dam magar tera saath na chhodenge',
      },
      {
        id: 'yehdosti-clip-02',
        startTime: 98.0,
        endTime: 113.5,
        question: 'What comes next?',
        promptLyric: 'Ae meri jeet teri jeet, teri haar meri haar, sun ae mere yaar...',
        choices: [
          'Tera gham mera gham, meri jaan teri jaan',
          'Dosti ka yeh haseen tyohar',
          'Tu hi mera sansaar',
        ],
        correctAnswer: 'Tera gham mera gham, meri jaan teri jaan',
        continuation: 'Tera gham mera gham, meri jaan teri jaan, aisa apna pyaar',
      },
    ],
  },
];

/**
 * Randomly select one candidate clip from the song's approved clips.
 * Shuffles choices so position is not predictable while keeping answers intact.
 */
export function pickRandomClip(song: MusicSong): MusicClip {
  const clips = song.clips;
  const chosen = clips[Math.floor(Math.random() * clips.length)] || clips[0];
  // Shuffle choices
  const shuffledChoices = [...chosen.choices].sort(() => Math.random() - 0.5);
  return {
    ...chosen,
    choices: shuffledChoices,
  };
}

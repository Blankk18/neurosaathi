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
        startTime: 29.0,
        endTime: 44.0,
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
        startTime: 100.0,
        endTime: 115.0,
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
      {
        id: 'zindagi-clip-03',
        startTime: 159.0,
        endTime: 174.0,
        question: 'What comes next?',
        promptLyric: 'Haste gaate jahan se guzar, duniya ki tu parwah na kar...',
        choices: [
          'Muskuraate hue din bitana',
          'Pal pal dil ke paas tum rehti ho',
          'Kahin door jab din dhal jaaye',
        ],
        correctAnswer: 'Muskuraate hue din bitana',
        continuation: 'Muskuraate hue din bitana, yahan kal kya ho kisne jaana',
      },
      {
        id: 'zindagi-clip-04',
        startTime: 204.0,
        endTime: 219.0,
        question: 'What comes next?',
        promptLyric: 'Maut aani hai aayegi ek din, jaan jaani hai jaayegi ek din...',
        choices: [
          'Aisi baaton se kya ghabrana',
          'Aanewala pal jaanewala hai',
          'Ek ladki ko dekha toh aisa laga',
        ],
        correctAnswer: 'Aisi baaton se kya ghabrana',
        continuation: 'Aisi baaton se kya ghabrana, yahan kal kya ho kisne jaana',
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
        startTime: 44.0,
        endTime: 58.5,
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
        endTime: 113.0,
        question: 'What comes next?',
        promptLyric: 'Ae meri jeet teri jeet, teri haar meri haar, sun ae mere yaar...',
        choices: [
          'Tera gham mera gham, meri jaan teri jaan',
          'Zindagi ke safar mein guzar jaate hain',
          'Pyaar humko bhi hai pyaar tumko bhi hai',
        ],
        correctAnswer: 'Tera gham mera gham, meri jaan teri jaan',
        continuation: 'Tera gham mera gham, meri jaan teri jaan, aisa apna pyaar',
      },
      {
        id: 'yehdosti-clip-03',
        startTime: 193.0,
        endTime: 208.5,
        question: 'What comes next?',
        promptLyric: 'Logon ko aate hain do nazar hum magar, dekho do nahin...',
        choices: [
          'Arre ho juda ya khafa ae khuda hai dua',
          'Hum dono do premi duniya chhod chale',
          'Yeh raatein yeh mausam nadi ka kinara',
        ],
        correctAnswer: 'Arre ho juda ya khafa ae khuda hai dua',
        continuation: 'Arre ho juda ya khafa ae khuda hai dua, aisa ho nahin',
      },
      {
        id: 'yehdosti-clip-04',
        startTime: 208.5,
        endTime: 222.0,
        question: 'What comes next?',
        promptLyric: 'Khaana peena saath hai, marna jeena saath hai...',
        choices: [
          'Saari zindagi, yeh dosti hum nahi todenge',
          'Raat kali ek khwaab mein aayi',
          'Yeh reshmi zulfein yeh sharbati aankhein',
        ],
        correctAnswer: 'Saari zindagi, yeh dosti hum nahi todenge',
        continuation: 'Saari zindagi, yeh dosti hum nahi todenge',
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

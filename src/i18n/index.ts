import { en } from './en';
import { hi } from './hi';
import { gu } from './gu';
import { as } from './as';
import { bn } from './bn';
import { mni } from './mni';
import { brx } from './brx';
import { miz } from './miz';
import { trp } from './trp';
import { kha } from './kha';
import { grt } from './grt';
import { languageNames } from './partials';
import type { LanguageCode } from '@/types';

export const dictionaries: Record<string, Record<string, string>> = {
  en,
  hi,
  gu,
  as,
  bn,
  mni,
  brx,
  miz,
  trp,
  kha,
  grt,
};

let currentLanguage: LanguageCode = 'en';

export const i18n = {
  changeLanguage: (lang: LanguageCode) => {
    currentLanguage = lang;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  },
  get language(): LanguageCode {
    return currentLanguage;
  },
};

// Translate a key, falling back to English, then the raw key. Optionally
// substitutes {name} / {time} / {heard} / {n} / {color} placeholders.
export function translate(lang: LanguageCode, key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[lang];
  let str = (dict && dict[key]) || en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.split(`{${k}}`).join(String(v));
    }
  }
  return str;
}

export function getLanguageName(code: LanguageCode): string {
  return languageNames[code] ?? code;
}

/**
 * Languages the Browser Web Speech API can recognise for this device.
 * en/hi/gu (and bn) map to the common Indian locales. The remaining
 * Northeast languages are not covered by mainstream ASR today, so speech
 * input gracefully falls back to buttons for them.
 */
export function recognitionLocale(lang: LanguageCode): string | null {
  switch (lang) {
    case 'en':
      return 'en-IN';
    case 'hi':
      return 'hi-IN';
    case 'gu':
      return 'gu-IN';
    case 'bn':
      return 'bn-IN';
    default:
      return null; // as, mni, kha, miz, grt, trp, brx
  }
}

/**
 * Best-effort TTS locale tag for the given language.
 *
 * Returns `null` for languages that have no mainstream browser TTS voice
 * (Manipuri/mni, Khasi/kha, Mizo/miz, Garo/grt, Tripuri/trp, Assamese/as, Bodo/brx).
 * Callers MUST check for null and suppress/fallback rather than letting the
 * browser silently default to an English voice.
 */
export function synthesisLocale(lang: LanguageCode): string | null {
  switch (lang) {
    case 'en':
      return 'en-IN';
    case 'hi':
      return 'hi-IN';
    case 'gu':
      return 'gu-IN';
    case 'bn':
      return 'bn-IN';
    // Northeast / tribal languages — no stable browser TTS voice exists yet.
    // Return null so speak() can suppress rather than falling back to English.
    default:
      return null;
  }
}

export { languageNames };

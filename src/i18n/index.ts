import { en } from './en';
import { hi } from './hi';
import { partials, languageNames } from './partials';
import type { LanguageCode } from '@/types';

const dictionaries: Record<string, Record<string, string>> = {
  en,
  hi,
  ...partials,
};

// Translate a key, falling back English, then the raw key. Optionally
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
 * en/hi map to the common Indian locales; bn is broadly supported.
 * The remaining Northeast languages are not covered by mainstream ASR today,
 * so speech input gracefully falls back to buttons for them.
 */
export function recognitionLocale(lang: LanguageCode): string | null {
  switch (lang) {
    case 'en':
      return 'en-IN';
    case 'hi':
      return 'hi-IN';
    case 'bn':
      return 'bn-IN';
    default:
      return null; // as, mni, kha, miz, grt, trp
  }
}

/** Best-effort TTS locale — the browser picks an available voice. */
export function synthesisLocale(lang: LanguageCode): string {
  switch (lang) {
    case 'en':
      return 'en-IN';
    case 'hi':
      return 'hi-IN';
    case 'bn':
      return 'bn-IN';
    default:
      return 'en-IN';
  }
}

export { languageNames };
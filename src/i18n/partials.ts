// Regional UI translation dictionaries for NeuroSaathi
// All 11 supported languages are fully translated with 100% key parity.

import { as } from './as';
import { bn } from './bn';
import { mni } from './mni';
import { brx } from './brx';
import { miz } from './miz';
import { trp } from './trp';
import { kha } from './kha';
import { grt } from './grt';

export const partials: Record<string, Record<string, string>> = {
  as,
  bn,
  mni,
  brx,
  miz,
  trp,
  kha,
  grt,
};

export const languageNames: Record<string, string> = {
  en: 'English',
  hi: 'हिन्दी (Hindi)',
  gu: 'ગુજરાતી (Gujarati)',
  as: 'অসমীয়া (Assamese)',
  bn: 'বাংলা (Bengali)',
  mni: 'ꯃꯤꯇꯩꯂꯣꯟ (Manipuri)',
  brx: "बर' (Bodo)",
  miz: 'Mizo',
  kha: 'Khasi',
  grt: 'Garo',
  trp: 'ত্রিপুরী / Kokborok',
};

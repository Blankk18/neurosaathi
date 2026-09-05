// ============================================================================
// Voice service — wraps Browser Speech Recognition + Speech Synthesis.
// Everything is capability-checked and fails gracefully; voice never blocks
// the UI. A production service would use a real NLU/ASR provider here.
//
// Language handling: recognition + synthesis always follow the UI language.
// If the browser/device has no recogniser (or the language has no ASR
// coverage), the calling components fall back to text/buttons.
// ============================================================================

import { recognitionLocale, synthesisLocale } from '@/i18n';
import type { LanguageCode } from '@/types';

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

export function speechRecognitionSupported(): boolean {
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * Return a recogniser for the given UI language, or null when the browser
 * does not support speech input at all or this language has no ASR coverage.
 * Callers show a graceful button-based fallback when null is returned.
 */
export function createRecognizer(lang: LanguageCode): RecognitionLike | null {
  const locale = recognitionLocale(lang);
  const w = window as unknown as Record<string, any>;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor || !locale) return null;
  const rec = new Ctor() as RecognitionLike;
  rec.lang = locale;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;
  return rec;
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let lastUtteranceCancelled = false;

export function speak(text: string, lang: LanguageCode | string = 'en', enabled = true): void {
  if (!enabled || !speechSynthesisSupported()) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = synthesisLocale(lang as LanguageCode);
    u.rate = 0.95;
    u.pitch = 1.05;
    // prefer a warm, familiar female Indian voice if one is available
    const voices = synth.getVoices();
    const langBase = u.lang.toLowerCase().split('-')[0];
    const preferred = voices.find(
      (v) =>
        v.lang.replace('_', '-').toLowerCase().startsWith(langBase) &&
        /female|zira|heera|rva/i.test(v.name),
    );
    u.voice = preferred ?? null;
    lastUtteranceCancelled = false;
    u.onend = () => {
      lastUtteranceCancelled = true;
    };
    synth.speak(u);
  } catch {
    // speech synthesis can throw in some embedded browsers — ignore
  }
}

export function stopSpeaking(): void {
  if (speechSynthesisSupported()) {
    window.speechSynthesis.cancel();
    lastUtteranceCancelled = true;
  }
}

export function isSpeaking(): boolean {
  return speechSynthesisSupported() && window.speechSynthesis.speaking && !lastUtteranceCancelled;
}
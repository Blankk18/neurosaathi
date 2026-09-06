// ============================================================================
// Accessibility helper — maps persisted settings to the CSS classes that make
// the whole app honour them (text size, button size, high contrast, reduced
// motion). The same mapping is used at boot (main.tsx) and on every settings
// change (AppContext) so a single source of truth keeps them in sync.
// ============================================================================

import type { Settings } from '@/types';

type SizeSettings = Partial<Settings> &
  Partial<{ largeText?: boolean; largeButtons?: boolean }>;

const ALL_CLASSES = [
  'text-small',
  'text-large',
  'button-large',
  'button-xl',
  'high-contrast',
  'reduced-motion',
] as const;

/** Resolve the 3-state sizes, falling back to the old boolean settings. */
export function resolveTextSize(s: SizeSettings): Settings['textSize'] {
  return s.textSize ?? (s.largeText ? 'large' : 'medium');
}

export function resolveButtonSize(s: SizeSettings): Settings['buttonSize'] {
  return s.buttonSize ?? (s.largeButtons ? 'large' : 'standard');
}

/** Which documentElement classes should be active for these settings. */
export function a11yClasses(s: SizeSettings): string[] {
  const classes: string[] = [];
  const text = resolveTextSize(s);
  const buttons = resolveButtonSize(s);
  if (text === 'small') classes.push('text-small');
  if (text === 'large') classes.push('text-large');
  if (buttons === 'large') classes.push('button-large');
  if (buttons === 'extra') classes.push('button-xl');
  if (s.highContrast) classes.push('high-contrast');
  if (s.reducedMotion) classes.push('reduced-motion');
  return classes;
}

/** Apply/clear all accessibility classes on <html>. Safe to call anytime. */
export function applyAccessibilityClasses(s: SizeSettings): void {
  const html = document.documentElement;
  for (const c of ALL_CLASSES) html.classList.remove(c);
  for (const c of a11yClasses(s)) html.classList.add(c);
}
// ============================================================================
// NEUROSAATHI GUARDIAN — geo / risk engine (pure, deterministic)
//
// Turns a position + configured home/safe zones into a risk posture. This is a
// *location* heuristic for caregiver awareness — it never diagnoses and never
// claims someone is "lost". The caregiver makes the final call.
// ============================================================================

import type { GeoPoint, RiskLevel, SafeLocation } from '@/types';

const EARTH_R = 6371000; // metres

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points in metres (Haversine). */
export function haversineM(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(s));
}

/** Is `p` inside a zone's geofence circle? */
export function pointInZone(p: GeoPoint, zone: SafeLocation): boolean {
  return haversineM(p, zone) <= zone.radiusM;
}

/** First known zone containing `p`, else null. */
export function zoneFor(p: GeoPoint, zones: SafeLocation[]): SafeLocation | null {
  for (const z of zones) if (pointInZone(p, z)) return z;
  return null;
}

export function distanceFromHomeM(p: GeoPoint, home: SafeLocation | null): number | null {
  return home ? Math.round(haversineM(p, home)) : null;
}

/**
 * Decide whether an "out of the home zone" state is still recent enough to be
 * merely ATTENTION, or has lingered into UNUSUAL. An unfamiliar location is not
 * automatically "lost" — it only raises the posture so a caregiver can look.
 */
export const AWAY_UNUSUAL_MS = 20 * 60 * 1000; // 20 minutes in an unknown zone

export function requestStatus(
  prev: RiskLevel,
  wasAtHome: boolean,
  nowInHome: boolean,
  inKnownZone: boolean,
  searchMode: boolean,
  statusSinceMs: number,
): { status: RiskLevel; changed: boolean } {
  if (searchMode) return { status: 'high', changed: prev !== 'high' };

  // Inside a recognised zone (home or known safe place) → SAFE.
  if (nowInHome || inKnownZone) return { status: 'safe', changed: prev !== 'safe' };

  // Outside every recognised zone → the unfamiliar-zone ladder.
  // If the elder was safe at home and just stepped out, that is ATTENTION.
  if (prev === 'safe' || wasAtHome) {
    return { status: 'attention', changed: prev !== 'attention' };
  }
  // Lingering in an unknown zone beyond the threshold → UNUSUAL.
  if (Date.now() - statusSinceMs >= AWAY_UNUSUAL_MS) {
    return { status: 'unusual', changed: prev !== 'unusual' };
  }
  return { status: 'attention', changed: prev !== 'attention' };
}

// ---- Risk metadata (i18n keys — resolved via the app dictionary) ----

export interface RiskMeta {
  icon: string;
  labelKey: string;
  descKey: string;
  chipTone: 'brand' | 'warm' | 'accent' | 'danger';
  dot: string;
}

export const RISK_META: Record<RiskLevel, RiskMeta> = {
  safe: {
    icon: '🟢',
    labelKey: 'guardian.status.safe',
    descKey: 'guardian.status.safe.desc',
    chipTone: 'brand',
    dot: 'bg-brand-500',
  },
  attention: {
    icon: '🟡',
    labelKey: 'guardian.status.attention',
    descKey: 'guardian.status.attention.desc',
    chipTone: 'warm',
    dot: 'bg-warm-500',
  },
  unusual: {
    icon: '🟠',
    labelKey: 'guardian.status.unusual',
    descKey: 'guardian.status.unusual.desc',
    chipTone: 'accent',
    dot: 'bg-accent-500',
  },
  high: {
    icon: '🔴',
    labelKey: 'guardian.status.high',
    descKey: 'guardian.status.high.desc',
    chipTone: 'danger',
    dot: 'bg-danger-500',
  },
};

export function riskMeta(status: RiskLevel): RiskMeta {
  return RISK_META[status];
}

// ---- Small formatting helpers shared by caregiver/elder UI ----

/** "12.34567" → fixed rounding, always sign-kept, compact. */
export function fmtLat(v: number): string {
  return v.toFixed(5);
}
export function fmtLng(v: number): string {
  return v.toFixed(5);
}

export function fmtAccuracy(m: number): string {
  return `±${Math.round(m)}m`;
}

/** Whole metres with a space thousand-separator, e.g. "1 240m". */
export function fmtDistanceM(m: number): string {
  return `${Math.round(m).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}m`;
}
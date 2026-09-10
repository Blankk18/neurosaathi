// ============================================================================
// NEUROSAATHI GUARDIAN — controller / evaluator
//
// Turns a single position fix (real GPS or simulated) into the guardian state
// the UI renders: trail, risk posture, and which recognised zone the elder is
// in. It reports *transitions*; the caller (AppContext) maps a transition to a
// debounced caregiver alert with human copy.
//
// Alert cooldown lives here (module-scope, per session) so a transition that
// repeats is not spammed — a single resolver in the caregiver is all that should
// be used to escalate, unless the caregiver raises Search Mode.
// ============================================================================

import type { GuardianState, LocationUpdate, RiskLevel, SafeLocation } from '@/types';
import { pointInZone, requestStatus } from '@/engine/guardian';

export interface GuardianTransition {
  from: RiskLevel | null; // null = first fix
  to: RiskLevel;
  kind: 'home-exit' | 'unusual' | 'return-home' | 'recognized' | 'none' | 'first';
  zoneId: string | null;
}

export interface EvaluateResult {
  next: GuardianState;
  transition: GuardianTransition;
}

const TRAIL_MAX = 60;

// Debounce windows — home exit & unfamiliar alerts fire at most this often
// unless the caregiver has put the elder in Search Mode.
export const ALERT_COOLDOWN_MS: Record<GuardianTransition['kind'], number> = {
  'home-exit': 5 * 60 * 1000,
  unusual: 5 * 60 * 1000,
  'return-home': 2 * 60 * 1000,
  recognized: 2 * 60 * 1000,
  none: 0,
  first: 0,
};

const lastFiredAt: Record<string, number> = {};

export function alertReady(kind: GuardianTransition['kind'], nowMs: number, force: boolean): boolean {
  if (force) return true;
  const last = lastFiredAt[kind] ?? 0;
  return nowMs - last >= ALERT_COOLDOWN_MS[kind];
}

export function markAlertFired(kind: GuardianTransition['kind'], nowMs: number): void {
  lastFiredAt[kind] = nowMs;
}

export function resetAlertCooldown(): void {
  for (const k of Object.keys(lastFiredAt)) delete lastFiredAt[k];
}

function zonesFor(guardian: GuardianState): { home: SafeLocation | null; known: SafeLocation[] } {
  const home = guardian.home;
  const known = guardian.safeLocations.filter((z) => z.id !== home?.id);
  return { home, known };
}

/**
 * Evaluate a new fix against the current guardian state, producing the next
 * guardian state plus a transition descriptor for alert generation.
 */
export function evaluateFix(guardian: GuardianState, fix: LocationUpdate): EvaluateResult {
  const { home, known } = zonesFor(guardian);

  const nowInHome = !!home && pointInZone(fix, home);
  const inKnownZone = !!known.find((z) => pointInZone(fix, z));
  const wasAtHome = guardian.currentZoneId === home?.id || nowInHome;

  const statusSinceMsLeftAtExit = guardian.statusSince;
  const nowMs = Date.now();
  const prevStatus = guardian.status;
  const { status, changed } = requestStatus(
    prevStatus,
    wasAtHome,
    nowInHome,
    inKnownZone,
    guardian.searchMode,
    new Date(statusSinceMsLeftAtExit).getTime(),
  );

  // Determine the zone id the elder is currently inside.
  let currentZoneId: string | null = null;
  if (nowInHome && home) currentZoneId = home.id;
  else if (inKnownZone) currentZoneId = known.find((z) => pointInZone(fix, z))?.id ?? null;
  // Edge: elder was at home but status says outside (left home) → null.

  const trail = [...guardian.trail, fix].slice(-TRAIL_MAX);

  const next: GuardianState = {
    ...guardian,
    current: fix,
    trail,
    status,
    statusSince: changed ? new Date(nowMs).toISOString() : guardian.statusSince,
    currentZoneId,
    tracking: true,
  };

  // Build a transition descriptor (only used to decide whether/how to alert).
  let transition: GuardianTransition;
  const first = guardian.current === null;
  if (first) {
    transition = { from: null, to: status, kind: 'first', zoneId: currentZoneId };
  } else if (status !== prevStatus && status === 'safe' && (nowInHome || inKnownZone)) {
    transition = { from: prevStatus, to: status, kind: nowInHome ? 'return-home' : 'recognized', zoneId: currentZoneId };
  } else if (status === prevStatus && currentZoneId !== guardian.currentZoneId) {
    // Changed zones without a risk change (e.g. home → grocery, both safe).
    transition = { from: prevStatus, to: status, kind: currentZoneId ? 'recognized' : 'none', zoneId: currentZoneId };
  } else if (status === 'attention' && changed) {
    transition = { from: prevStatus, to: status, kind: 'home-exit', zoneId: currentZoneId };
  } else if (status === 'unusual' && changed) {
    transition = { from: prevStatus, to: status, kind: 'unusual', zoneId: currentZoneId };
  } else {
    transition = { from: prevStatus, to: status, kind: status !== prevStatus ? 'home-exit' : 'none', zoneId: currentZoneId };
  }

  return { next, transition };
}

// ---- Simulated movement (bonus) ----

export function interpolateStep(
  from: Omit<LocationUpdate, 'timestamp' | 'simulated'>,
  to: Omit<LocationUpdate, 'timestamp' | 'simulated'>,
  steps: number,
  startTs: number,
  gapMs = 2500,
): LocationUpdate[] {
  const out: LocationUpdate[] = [];
  for (let i = 1; i <= steps; i += 1) {
    const f = i / steps;
    out.push({
      lat: +(from.lat + (to.lat - from.lat) * f).toFixed(6),
      lng: +(from.lng + (to.lng - from.lng) * f).toFixed(6),
      accuracyM: Math.round(8 + (to.accuracyM - 8) * 0),
      timestamp: new Date(startTs + i * gapMs).toISOString(),
      simulated: true,
    });
  }
  return out;
}
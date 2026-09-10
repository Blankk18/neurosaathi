// ============================================================================
// NEUROSAATHI GUARDIAN — demo location simulator
//
// Deterministic "fancy the elder moved" controls so judges never need to
// physically walk a device. Every simulated fix is marked `simulated:true` and
// the UI labels it "Demo / Simulated location" — it is never presented as a
// real GPS fix.
// ============================================================================

import type { GeoPoint, LocationUpdate } from '@/types';
import { HOME_ZONE, GUARD_SAFE_LOCATIONS } from '@/data/demoData';

export interface SimMove {
  id: string;
  labelKey: string;
  icon: string;
  point: GeoPoint;
  /** Which recognised zone this lands in, if any. */
  zoneId: string | null;
  /** Present only for demo — kept honestly labelled. */
  simulated: true;
  /** How many interpolated trail steps to animate (more = clearer route). */
  trailSteps: number;
}

// A point clearly far outside every seeded zone → "unrecognised location".
const UNKNOWN_POINT: GeoPoint = { lat: HOME_ZONE.lat + 0.06, lng: HOME_ZONE.lng + 0.05 };
// Just past the home geofence (≈180 m) → the "left home" ATTENTION demo.
const LEAVE_POINT: GeoPoint = { lat: HOME_ZONE.lat + 0.0016, lng: HOME_ZONE.lng };

function zonePoint(name: string): GeoPoint {
  const z = GUARD_SAFE_LOCATIONS.find((s) => s.name === name);
  return z ? { lat: z.lat, lng: z.lng } : { lat: HOME_ZONE.lat, lng: HOME_ZONE.lng };
}

export const SIM_MOVES: SimMove[] = [
  { id: 'home', labelKey: 'guardian.sim.home', icon: '🏠', point: { lat: HOME_ZONE.lat, lng: HOME_ZONE.lng }, zoneId: HOME_ZONE.id, simulated: true, trailSteps: 2 },
  { id: 'leave', labelKey: 'guardian.sim.leave', icon: '🚶', point: LEAVE_POINT, zoneId: null, simulated: true, trailSteps: 3 },
  { id: 'temple', labelKey: 'guardian.sim.temple', icon: '🛕', point: zonePoint('Temple'), zoneId: 'guard-temple', simulated: true, trailSteps: 4 },
  { id: 'hospital', labelKey: 'guardian.sim.hospital', icon: '🏥', point: zonePoint('Hospital'), zoneId: 'guard-hospital', simulated: true, trailSteps: 5 },
  { id: 'grocery', labelKey: 'guardian.sim.grocery', icon: '🛒', point: zonePoint('Grocery store'), zoneId: 'guard-grocery', simulated: true, trailSteps: 3 },
  { id: 'unknown', labelKey: 'guardian.sim.unknown', icon: '🚩', point: UNKNOWN_POINT, zoneId: null, simulated: true, trailSteps: 6 },
];

export function simMove(id: string): SimMove | undefined {
  return SIM_MOVES.find((m) => m.id === id);
}

/** Interpolate a graded trail from a current fix to a destination point. */
export function trailToMove(
  from: LocationUpdate,
  move: SimMove,
  gapMs = 3500,
): LocationUpdate[] {
  const steps = move.trailSteps;
  const startTs = Date.now();
  const out: LocationUpdate[] = [];
  for (let i = 1; i <= steps; i += 1) {
    const f = i / steps;
    out.push({
      lat: +(from.lat + (move.point.lat - from.lat) * f).toFixed(6),
      lng: +(from.lng + (move.point.lng - from.lng) * f).toFixed(6),
      accuracyM: Math.round(8 + (from.accuracyM - 8) * (1 - f)),
      timestamp: new Date(startTs + i * gapMs).toISOString(),
      simulated: true,
    });
  }
  return out;
}

export function fixAt(p: GeoPoint, accuracyM = 10): LocationUpdate {
  return {
    lat: p.lat,
    lng: p.lng,
    accuracyM,
    timestamp: new Date().toISOString(),
    simulated: true,
  };
}
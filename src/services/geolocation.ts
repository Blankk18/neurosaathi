// ============================================================================
// NEUROSAATHI GUARDIAN — geolocation service
//
// Thin, defensive wrapper around the browser Geolocation API. It only ever
// requests the caretaker-elder's own location with their (or the caregiver's)
// permission, surfaces the raw accuracy, and reliably cleans up the watch so
// the elder dies not keep broadcasting GPS in the background.
// ============================================================================

export interface GeoFix {
  lat: number;
  lng: number;
  accuracyM: number;
  timestamp: string; // ISO
}

export interface GeoWatchHandle {
  stop: () => void;
  active: boolean;
}

export function geolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export function permissionDenied(e: unknown): boolean {
  return (
    e !== null &&
    typeof e === 'object' &&
    ('code' in e) &&
    (e as { code?: number }).code === 1 /* GeolocationPositionError.PERMISSION_DENIED */
  );
}

function toFix(pos: GeolocationPosition): GeoFix {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracyM: pos.coords.accuracy,
    timestamp: new Date(pos.timestamp).toISOString(),
  };
}

/**
 * Start a location watch. The browser decides update cadence / accuracy — we do
 * NOT pretend it is a live second-by-second stream; the UI shows "updated Ns
 * ago" instead. Returns a handle to stop it (called on unmount / when the
 * caregiver switches to simulating).
 */
export function startWatch({
  onFix,
  onError,
  maxAgeMs = 20000,
}: {
  onFix: (fix: GeoFix) => void;
  onError: (err: unknown) => void;
  maxAgeMs?: number;
}): GeoWatchHandle {
  if (!geolocationSupported()) {
    onError(new Error('Geolocation unsupported'));
    return { stop: () => undefined, active: false };
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onFix(toFix(pos)),
    (err) => onError(err),
    {
      enableHighAccuracy: true,
      maximumAge: maxAgeMs,
      timeout: 15000,
    },
  );
  return {
    stop: () => navigator.geolocation.clearWatch(id),
    active: true,
  };
}

/** One-shot "where are we now?" — used when configuring the home zone. */
export function getCurrentOnce(): Promise<GeoFix | null> {
  return new Promise((resolve) => {
    if (!geolocationSupported()) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toFix(pos)),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  });
}
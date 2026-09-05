// ============================================================================
// Offline service — real connectivity detection + a "Simulate Offline Mode"
// toggle so judges can demo offline behaviour without disconnecting anything.
// ============================================================================

export type Connectivity = 'online' | 'offline';

export function realConnectivity(): Connectivity {
  return typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline';
}

/** Effective connectivity = simulation flag takes precedence over real status. */
export function isEffectivelyOffline(simulateOffline: boolean): boolean {
  return simulateOffline || realConnectivity() === 'offline';
}

export function subscribeConnectivity(cb: (status: Connectivity) => void): () => void {
  const handler = () => cb(realConnectivity());
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}
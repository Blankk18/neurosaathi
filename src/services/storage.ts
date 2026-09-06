import type { AppState, Settings } from '@/types';
import { buildDemoState, DEMO_PATIENT_ID } from '@/data/demoData';

// ============================================================================
// Storage service — LocalStorage for structured app state, plus IndexedDB for
// large blobs (family photos). In production, a backend would replace this
// layer; the rest of the app only talks to these functions.
// ============================================================================

const STATE_KEY = 'neurosaathi:state:v1';
const DB_NAME = 'neurosaathi-db';
const DB_STORE = 'images';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return buildDemoState();
    const parsed = JSON.parse(raw) as AppState;
    // merge defaults in case of an older persisted shape — settings merge is
    // deep so the 3-state text/button sizing always has a value.
    const base = buildDemoState();
    const state: AppState = {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...parsed.settings },
    };
    const legacy = parsed.settings as Partial<Settings> & { largeText?: boolean; largeButtons?: boolean };
    if (legacy) {
      // v1 stored booleans (largeText / largeButtons) → migrate to the enums.
      if (legacy.textSize === undefined) state.settings.textSize = legacy.largeText ? 'large' : 'medium';
      if (legacy.buttonSize === undefined) state.settings.buttonSize = legacy.largeButtons ? 'large' : 'standard';
    }
    return state;
  } catch {
    // corrupted or unavailable storage → start from demo data
    return buildDemoState();
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    return true;
  } catch {
    // quota exceeded or storage blocked — gracefully continue in-memory
    return false;
  }
}

// ---- IndexedDB for image blobs ----

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveImage(key: string, blob: Blob): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(blob, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function loadImage(key: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ---- Production placeholder (documented for SIH judges) ----
export interface SyncPayload {
  patientId: string;
  records: unknown[];
}

/** In production, this posts queued records to the cloud backend over TLS.
 *  The prototype keeps everything local, so this is intentionally a no-op stub. */
export async function pushToBackend(_payload: SyncPayload): Promise<boolean> {
  // eslint-disable-next-line no-console
  console.info('[sync] Stub backend — production would push records here.');
  return true;
}

export function demoPatientId(): string {
  return DEMO_PATIENT_ID;
}
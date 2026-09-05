import type { AppState, SyncRecord, SyncStatus } from '@/types';

// ============================================================================
// Sync queue — records created while offline sit in syncRecords with
// 'pending' status. When connectivity returns (or demo "Sync now"), they are
// marked 'synced'. A real backend would be called here.
// ============================================================================

export function queueSyncRecord(
  state: AppState,
  record: Omit<SyncRecord, 'id' | 'status' | 'createdAt'>,
): AppState {
  const item: SyncRecord = {
    ...record,
    id: `sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  return { ...state, syncRecords: [item, ...state.syncRecords] };
}

export function pendingSyncCount(state: AppState): number {
  return state.syncRecords.filter((r) => r.status === 'pending').length;
}

export function markAllSynced(state: AppState): AppState {
  return {
    ...state,
    syncRecords: state.syncRecords.map((r) =>
      r.status === 'pending' ? { ...r, status: 'synced' as SyncStatus } : r,
    ),
    lastSynced: new Date().toISOString(),
  };
}

export function recentPending(state: AppState): SyncRecord[] {
  return state.syncRecords.filter((r) => r.status === 'pending').slice(0, 50);
}

/** Client-side "push" that toggles a pending file to synced.
 *  Production: call storage.pushToBackend() then mark synced on success. */
export async function attemptSync(state: AppState): Promise<AppState> {
  const pending = pendingSyncCount(state);
  if (pending === 0) return { ...state, lastSynced: new Date().toISOString() };
  // simulate network latency
  await new Promise((r) => setTimeout(r, 600));
  return markAllSynced(state);
}
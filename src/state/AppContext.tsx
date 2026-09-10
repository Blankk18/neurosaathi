import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { AppState } from '@/types';
import { reducer, Action } from './store';
import { loadState, saveState } from '@/services/storage';
import { uid, DEMO_PATIENT_ID } from '@/data/demoData';
import { translate } from '@/i18n';
import { isEffectivelyOffline, realConnectivity, subscribeConnectivity } from '@/services/offline';
import { attemptSync, pendingSyncCount } from '@/services/sync';
import { speak, stopSpeaking } from '@/services/voice';
import { applyAccessibilityClasses } from '@/services/a11y';
import {
  startWatch,
  geolocationSupported,
  permissionDenied,
  type GeoWatchHandle,
} from '@/services/geolocation';
import { evaluateFix, alertReady, markAlertFired, type GuardianTransition } from '@/services/guardian';
import { simMove, trailToMove, fixAt } from '@/services/guardianSimulator';
import { fmtLat, fmtLng, fmtDistanceM, haversineM } from '@/engine/guardian';
import type { GuardianState, LocationUpdate, Alert as GuardAlert } from '@/types';

interface Ctx {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  t: (key: string, params?: Record<string, string | number>) => string;
  lang: AppState['settings']['language'];
  isOffline: boolean;
  simOffline: boolean;
  pendingSync: number;
  lastSyncedAt: string | undefined;
  justConnected: boolean;
  runSync: () => Promise<void>;
  speakText: (text: string, langOverride?: string) => void;
  stopSpeaking: () => void;
  resetAll: () => void;
  connectivity: 'online' | 'offline';
  // ---- GUARDIAN (location safety) ----
  guardianStart: () => void;
  guardianStop: () => void;
  guardianSimulate: (moveId: string) => void;
  toggleSearchMode: (on: boolean) => void;
  triggerAlarm: () => void;
  resolveAlarm: () => void;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [connectivity, setConnectivity] = useState<'online' | 'offline'>(realConnectivity());
  const [justConnected, setJustConnected] = useState(false);
  const wasOffline = useRef(false);
  // Most-recent state snapshot for guardian helpers (avoid stale closures).
  const stateRef = useRef(state);
  stateRef.current = state;
  const geoWatch = useRef<GeoWatchHandle | null>(null);

  // persistence
  useEffect(() => {
    saveState(state);
  }, [state]);

  // keep accessibility preferences applied app-wide (text/button size,
  // high contrast, reduced motion) whenever they change.
  useEffect(() => {
    applyAccessibilityClasses(state.settings);
  }, [state.settings]);

  // connectivity listeners
  useEffect(() => {
    const unsub = subscribeConnectivity((status) => {
      setConnectivity(status);
      if (status === 'online' && wasOffline.current) {
        setJustConnected(true);
        window.setTimeout(() => setJustConnected(false), 5000);
      }
      wasOffline.current = status === 'offline';
    });
    return unsub;
  }, []);

  const isOffline = isEffectivelyOffline(state.settings.simulateOffline);
  const lang = state.settings.language;
  const t = useMemo(
    () => (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang],
  );

  const runSync = async () => {
    await attemptSync({ ...state });
    dispatch({ type: 'SET_SYNCED' });
  };

  const speakText = (text: string, langOverride?: string) =>
    speak(text, langOverride ?? lang, state.settings.voiceOn);

  const resetAll = () => {
    stopSpeaking();
    geoWatch.current?.stop();
    geoWatch.current = null;
    dispatch({ type: 'RESET' });
  };

  // ---- GUARDIAN (location safety) ----

  /** Build + dispatch a debounced caregiver alert for a guardian transition. */
  const guardAlert = (
    kind: Exclude<GuardianTransition['kind'], 'none' | 'first'> | 'search-active',
    severity: GuardAlert['severity'],
    message: string,
    reasons: string[],
    force = false,
  ) => {
    const key = kind === 'search-active' ? 'unusual' : kind;
    const nowMs = Date.now();
    if (!alertReady(key, nowMs, force)) return;
    markAlertFired(key, nowMs);
    const patientId = stateRef.current.patient?.id ?? DEMO_PATIENT_ID;
    dispatch({
      type: 'ADD_ALERT',
      alert: {
        id: uid('alert'),
        patientId,
        severity,
        title: '',
        message,
        reasons,
        createdAt: new Date().toISOString(),
        read: false,
        simulated: stateRef.current.guardian.simulated,
      },
    });
  };

  const commitGuardFix = (
    from: GuardianState,
    fix: LocationUpdate,
    trail: LocationUpdate[],
    simulated: boolean = from.simulated,
  ) => {
    const r = evaluateFix(from, fix);
    dispatch({
      type: 'GUARDIAN_UPDATE',
      current: fix,
      trail: trail.slice(-60),
      status: r.next.status,
      statusSince: r.next.statusSince,
      currentZoneId: r.next.currentZoneId,
    });
    dispatch({ type: 'GUARDIAN_PATCH', patch: { tracking: true, simulated } });

    const patient = stateRef.current.patient?.name ?? '';
    const tr = r.transition;
    const force = from.searchMode;
    if (tr.kind === 'home-exit' && tr.to === 'attention') {
      const dist = from.home ? fmtDistanceM(haversineM(fix, from.home)) : '';
      guardAlert('home-exit', 'attention', t('guardian.alert.homeExit', { name: patient }), [
        t('guardian.alert.homeExit.reason', { dist }),
      ], force);
    }
    if (tr.kind === 'unusual') {
      const who = patient || `${fmtLat(fix.lat)}, ${fmtLng(fix.lng)}`;
      guardAlert('unusual', 'critical', t('guardian.alert.unusual', { name: who }), [
        t('guardian.alert.unusual.reason'),
      ], force);
    }
    if (tr.kind === 'return-home' && tr.to === 'safe') {
      guardAlert('return-home', 'info', t('guardian.alert.returnHome', { name: patient }), [], force);
    }
  };

  const guardianStart = () => {
    if (!geolocationSupported()) {
      dispatch({ type: 'GUARDIAN_PATCH', patch: { accessDenied: true, tracking: true, simulated: false } });
      return;
    }
    geoWatch.current?.stop();
    geoWatch.current = startWatch({
      onFix: (fix) => {
        const prev = stateRef.current.guardian;
        commitGuardFix(prev, fix, [...prev.trail, fix], false);
      },
      onError: (err) => {
        if (permissionDenied(err)) dispatch({ type: 'GUARDIAN_PATCH', patch: { accessDenied: true } });
      },
    });
    dispatch({ type: 'GUARDIAN_PATCH', patch: { accessDenied: false, simulated: false } });
  };

  const guardianStop = () => {
    geoWatch.current?.stop();
    geoWatch.current = null;
    dispatch({ type: 'GUARDIAN_PATCH', patch: { tracking: false } });
  };

  const guardianSimulate = (moveId: string) => {
    const move = simMove(moveId);
    if (!move) return;
    geoWatch.current?.stop();
    geoWatch.current = null;
    const prev = stateRef.current.guardian;
    const base = prev.current ?? fixAt(move.point);
    const path = trailToMove(base, move);
    const dest = path[path.length - 1];
    const seed: GuardianState = { ...prev, current: base };
    commitGuardFix(seed, dest, [...prev.trail, ...path], true);
  };

  const toggleSearchMode = (on: boolean) => {
    const g = stateRef.current.guardian;
    if (on) {
      dispatch({
        type: 'GUARDIAN_PATCH',
        patch: { searchMode: true, status: 'high', statusSince: new Date().toISOString(), tracking: true },
      });
      guardAlert('search-active', 'critical', t('guardian.alert.search', { name: stateRef.current.patient?.name ?? '' }), [], true);
    } else {
      dispatch({ type: 'GUARDIAN_PATCH', patch: { searchMode: false } });
      if (g.current) {
        const r = evaluateFix({ ...g, searchMode: false }, g.current);
        dispatch({
          type: 'GUARDIAN_PATCH',
          patch: { status: r.next.status, statusSince: r.next.statusSince, currentZoneId: r.next.currentZoneId },
        });
      }
    }
  };

  const triggerAlarm = () => {
    dispatch({ type: 'GUARDIAN_PATCH', patch: { alarmActive: true } });
  };

  const resolveAlarm = () => {
    dispatch({ type: 'GUARDIAN_PATCH', patch: { alarmActive: false } });
  };

  const value: Ctx = {
    state,
    dispatch,
    t,
    lang,
    isOffline,
    simOffline: state.settings.simulateOffline,
    pendingSync: pendingSyncCount(state),
    lastSyncedAt: state.lastSynced,
    justConnected,
    runSync,
    speakText,
    stopSpeaking,
    resetAll,
    connectivity,
    guardianStart,
    guardianStop,
    guardianSimulate,
    toggleSearchMode,
    triggerAlarm,
    resolveAlarm,
  };

  // Stop any active geolocation watch when the app shell unmounts.
  useEffect(() => () => geoWatch.current?.stop(), []);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
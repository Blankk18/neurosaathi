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
import { translate } from '@/i18n';
import { isEffectivelyOffline, realConnectivity, subscribeConnectivity } from '@/services/offline';
import { attemptSync, pendingSyncCount } from '@/services/sync';
import { speak, stopSpeaking } from '@/services/voice';

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
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [connectivity, setConnectivity] = useState<'online' | 'offline'>(realConnectivity());
  const [justConnected, setJustConnected] = useState(false);
  const wasOffline = useRef(false);

  // persistence
  useEffect(() => {
    saveState(state);
  }, [state]);

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
    dispatch({ type: 'RESET' });
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
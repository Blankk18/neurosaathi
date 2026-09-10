// ============================================================================
// FACE STATUS — calm status line overlaid on the camera (i18n-aware).
// ============================================================================

import { useApp } from '@/state/AppContext';
import type { FaceStatusInfo } from './types';

function statusVisual(state: FaceStatusInfo['state']): { emoji: string; textClass: string } {
  switch (state) {
    case 'loadingModels':
    case 'requestingCamera':
    case 'cameraReady':
      return { emoji: '⏳', textClass: 'text-white/90' };
    case 'detecting':
      return { emoji: '👁️', textClass: 'text-white/90' };
    case 'faceDetected':
      return { emoji: '✅', textClass: 'text-emerald-200' };
    case 'guiding':
      return { emoji: '↔️', textClass: 'text-amber-200' };
    case 'liveness':
      return { emoji: '🔄', textClass: 'text-amber-200' };
    case 'matching':
      return { emoji: '🛡️', textClass: 'text-sky-200' };
    case 'success':
      return { emoji: '🎉', textClass: 'text-emerald-200' };
    case 'failure':
      return { emoji: '😔', textClass: 'text-amber-200' };
    case 'error':
      return { emoji: '⚠️', textClass: 'text-amber-200' };
    default:
      return { emoji: '', textClass: 'text-white/90' };
  }
}

export function FaceStatus({ status }: { status: FaceStatusInfo }) {
  const { t } = useApp();
  const v = statusVisual(status.state);
  const hintKey = status.hint ? `face.hint.${status.hint}` : null;
  return (
    <div className="flex flex-col items-center text-center" aria-live="polite" role="status">
      <div className={`inline-flex items-center gap-2 text-lg font-bold ${v.textClass}`}>
        <span aria-hidden>{v.emoji}</span>
        {t(status.key, status.params as Record<string, string> | undefined)}
      </div>
      {hintKey && (
        <div className="mt-1 text-sm font-semibold text-white/85">{t(hintKey)}</div>
      )}
      {status.progress !== undefined && (
        <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-emerald-300 transition-all"
            style={{ width: `${Math.round(status.progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

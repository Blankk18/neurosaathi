// ============================================================================
// LIVE FACE SCANNER — reusable camera preview + face guide + status line.
//
// Pure presentational layer. Renders the live <video>, the oval face guide
// and a calm status line. No recognition logic lives here.
// ============================================================================

import type { MutableRefObject, ReactNode } from 'react';
import { FaceStatus } from './FaceStatus';
import type { FaceAlignment, FaceStatusInfo } from './types';

export function LiveFaceScanner({
  videoRef,
  status,
  alignment,
  children,
}: {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  status: FaceStatusInfo;
  /** Optional live alignment — shifts the face guide to gently steer the user. */
  alignment?: FaceAlignment | null;
  children?: ReactNode;
}) {
  const steer = alignment
    ? {
        transform: `translate(${Math.max(-34, Math.min(34, alignment.x * 80))}px, ${Math.max(
          -22,
          Math.min(22, alignment.y * 60),
        )}px)`,
      }
    : undefined;
  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-black shadow-lift">
        {/* real live webcam preview (never a static image) */}
        <video
          ref={videoRef}
          className="h-[340px] w-full object-cover"
          autoPlay
          muted
          playsInline
          aria-label="Live camera"
        />
        {/* oval face guide — never blocks the face */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="h-[200px] w-[150px] rounded-[50%] border-[3px] border-white/70 transition-transform duration-200"
            style={{ boxShadow: '0 0 0 2000px rgba(0,0,0,0.22)', ...steer }}
            aria-hidden
          />
        </div>
        {/* calm status overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
          <FaceStatus status={status} />
        </div>
      </div>

      {children && <div className="mt-4 flex w-full max-w-md flex-col gap-3">{children}</div>}
    </div>
  );
}
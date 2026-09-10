// ============================================================================
// LIVE FACE SCANNER — reusable camera preview + face guide + status line.
//
// Pure presentational layer. Renders the live <video>, a real detection box
// (when a face is present) or a subtle oval guide (when not), a calm status
// line, and a DEV-only debug overlay.
// ============================================================================

import type { MutableRefObject, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { FaceStatus } from './FaceStatus';
import type { FaceAlignment, FaceBox, FaceStatusInfo } from './types';

export function LiveFaceScanner({
  videoRef,
  status,
  alignment,
  faceBox,
  debug,
  children,
}: {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  status: FaceStatusInfo;
  alignment?: FaceAlignment | null;
  faceBox?: FaceBox | null;
  /** DEV-only debug data */
  debug?: {
    lastFaceCount: number;
    lastScore: number | null;
    lastDistance: number | null;
    confidence: number;
    matchProgress: number;
    attemptCount: number;
    modelsReady: boolean;
  } | null;
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
        {/* real live webcam preview — never mirrored */}
        <video
          ref={videoRef}
          className="h-[340px] w-full object-cover"
          autoPlay
          muted
          playsInline
          aria-label="Live camera"
        />
        {/* face guide / detection box */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {faceBox ? (
            <FaceBoxOverlay box={faceBox} videoRef={videoRef} />
          ) : (
            <div
              className="h-[200px] w-[150px] rounded-[50%] border-[3px] border-white/50 transition-transform duration-200"
              style={{ boxShadow: '0 0 0 2000px rgba(0,0,0,0.22)', ...steer }}
              aria-hidden
            />
          )}
        </div>
        {/* calm status overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
          <FaceStatus status={status} />
        </div>
        {/* DEV debug overlay */}
        {import.meta.env.DEV && debug && (
          <div className="absolute left-2 top-2 rounded-xl bg-black/70 px-2.5 py-2 text-[11px] font-mono leading-tight text-white/90 backdrop-blur">
            <div>faces: {debug.lastFaceCount}</div>
            <div>score: {debug.lastScore != null ? debug.lastScore.toFixed(3) : '—'}</div>
            <div>dist: {debug.lastDistance != null ? debug.lastDistance.toFixed(3) : '—'}</div>
            <div>conf: {debug.confidence.toFixed(2)}</div>
            <div>match: {debug.matchProgress}/3</div>
            <div>attempts: {debug.attemptCount}</div>
            <div>models: {debug.modelsReady ? 'ready' : 'loading'}</div>
            <div>
              res:{' '}
              {videoRef.current
                ? `${videoRef.current.videoWidth}×${videoRef.current.videoHeight}`
                : '—'}
            </div>
          </div>
        )}
      </div>

      {children && <div className="mt-4 flex w-full max-w-md flex-col gap-3">{children}</div>}
    </div>
  );
}

/** Renders a real bounding box scaled to the video's rendered display size.
 * Correctly handles object-cover letterboxing by measuring the actual rendered
 * video dimensions and calculating the offset. */
function FaceBoxOverlay({
  box,
  videoRef,
}: {
  box: FaceBox;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
}) {
  const [boxStyle, setBoxStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const updatePosition = () => {
      const container = video.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const containerW = containerRect.width;
      const containerH = containerRect.height;

      // Calculate object-cover scaling and letterboxing
      const videoAspect = vw / vh;
      const containerAspect = containerW / containerH;

      let renderedW: number;
      let renderedH: number;
      let offsetX = 0;
      let offsetY = 0;

      if (videoAspect > containerAspect) {
        // Video is wider than container - scaled to container width, height cropped
        renderedW = containerW;
        renderedH = containerW / videoAspect;
        offsetY = (containerH - renderedH) / 2;
      } else {
        // Video is taller than container - scaled to container height, width cropped
        renderedH = containerH;
        renderedW = containerH * videoAspect;
        offsetX = (containerW - renderedW) / 2;
      }

      // Map box from video pixel coordinates to container pixel coordinates
      const scaleX = renderedW / vw;
      const scaleY = renderedH / vh;

      const left = offsetX + box.x * scaleX;
      const top = offsetY + box.y * scaleY;
      const width = box.width * scaleX;
      const height = box.height * scaleY;

      // Convert to percentages of container for responsive positioning
      setBoxStyle({
        left: `${(left / containerW) * 100}%`,
        top: `${(top / containerH) * 100}%`,
        width: `${(width / containerW) * 100}%`,
        height: `${(height / containerH) * 100}%`,
      });
    };

    // Initial calculation
    updatePosition();

    // Recalculate on resize
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(video.parentElement!);

    return () => resizeObserver.disconnect();
  }, [box, videoRef]);

  const good = box.score > 0.5;

  return (
    <div
      className={`absolute rounded-2xl border-[3px] ${good ? 'border-emerald-400' : 'border-amber-300'} shadow-[0_0_0_2000px_rgba(0,0,0,0.18)]`}
      style={boxStyle}
      aria-hidden
    />
  );
}

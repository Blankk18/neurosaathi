import React, { useState } from 'react';

interface MemoryPhotoFrameProps {
  image: string;
  alt: string;
  caption?: string;
  tag?: string;
  className?: string;
}

export const MemoryPhotoFrame: React.FC<MemoryPhotoFrameProps> = ({
  image,
  alt,
  caption,
  tag,
  className = '',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`relative mx-auto w-full max-w-xl rounded-3xl border border-warm-200/90 bg-white/95 p-3.5 sm:p-4 shadow-card transition-all duration-300 ${className}`}
      style={{
        backgroundImage: 'radial-gradient(ellipse at top left, rgba(254, 243, 224, 0.45), transparent 75%)',
      }}
    >
      {/* Photo frame viewport - always strictly preserves 4:3 ratio */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-warm-100 ring-1 ring-black/[0.04]">
        {/* Soft skeleton placeholder while loading */}
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-warm-100 via-warm-50 to-warm-200 animate-pulse">
            <span className="text-4xl opacity-50" aria-hidden="true">
              🖼️
            </span>
            <span className="mt-2 text-xs font-bold text-warm-700">Loading memory…</span>
          </div>
        )}

        {/* The actual image */}
        {!hasError ? (
          <img
            src={image}
            alt={alt}
            onLoad={() => setIsLoaded(true)}
            onError={(e) => {
              // eslint-disable-next-line no-console
              console.error('[MemoryPhotoFrame] Image failed to load:', image, e);
              setHasError(true);
            }}
            className={`h-full w-full object-cover transition-all duration-500 hover:scale-[1.01] ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="eager"
          />
        ) : (
          /* Graceful error fallback if network fails */
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-warm-50 via-warm-100 to-warm-200 p-6 text-center">
            <span className="text-4xl mb-2" aria-hidden="true">
              📷
            </span>
            <span className="text-base font-extrabold text-brand-900">Memory image unavailable</span>
            <span className="mt-1 text-xs font-semibold text-neutral-600">{alt}</span>
          </div>
        )}

        {/* Subtle photo frame corner accents */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 border-r-2 border-t-2 border-white/70 drop-shadow-sm"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2.5 left-2.5 h-4 w-4 border-b-2 border-l-2 border-white/70 drop-shadow-sm"
        />

        {tag && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-sm shadow-soft">
            {tag}
          </span>
        )}
      </div>

      {/* Caption line */}
      {caption && (
        <div className="mt-2.5 px-2 text-center">
          <p className="text-sm font-semibold italic text-neutral-700 line-clamp-2">{caption}</p>
        </div>
      )}
    </div>
  );
};

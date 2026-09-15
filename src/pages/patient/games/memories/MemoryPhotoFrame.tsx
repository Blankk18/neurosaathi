import React from 'react';

interface MemoryPhotoFrameProps {
  photoUrl: string | null;
  altText: string;
  caption?: string;
  tag?: string;
  className?: string;
}

export const MemoryPhotoFrame: React.FC<MemoryPhotoFrameProps> = ({
  photoUrl,
  altText,
  caption,
  tag,
  className = '',
}) => {
  return (
    <div
      className={`relative mx-auto w-full max-w-lg rounded-3xl border border-warm-200/80 bg-white/95 p-3 sm:p-4 shadow-card transition-all duration-300 ${className}`}
      style={{
        backgroundImage: 'radial-gradient(ellipse at top left, rgba(254, 243, 224, 0.4), transparent 70%)',
      }}
    >
      {/* Photo viewport with elegant matting */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-warm-100/60 ring-1 ring-black/[0.04]">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={altText}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
            loading="eager"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-warm-50 via-warm-100 to-warm-200 text-center p-6">
            <span className="text-5xl mb-2" aria-hidden="true">
              🖼️
            </span>
            <span className="text-base font-extrabold text-brand-900">{altText}</span>
            <span className="mt-1 text-xs font-semibold text-brand-700">A cherished moment from home</span>
          </div>
        )}

        {/* Subtle photo corner accent */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-white/60 drop-shadow-sm"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-white/60 drop-shadow-sm"
        />

        {tag && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-sm">
            {tag}
          </span>
        )}
      </div>

      {/* Caption note */}
      {caption && (
        <div className="mt-3 px-2 text-center">
          <p className="text-sm font-semibold italic text-neutral-700">{caption}</p>
        </div>
      )}
    </div>
  );
};

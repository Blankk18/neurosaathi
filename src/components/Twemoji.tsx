// Offline-safe emoji rendering. Native system emoji are used instead of an
// external sprite/CDN so the prototype keeps working with no internet.
export function WikipediaTwemoji({ emoji, size = 48 }: { emoji: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ fontSize: size, lineHeight: 1, display: 'inline-block' }}
    >
      {emoji}
    </span>
  );
}

export default WikipediaTwemoji;
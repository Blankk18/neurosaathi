// Lightweight PWA support — registers the service worker for offline capability.
// Only runs in production builds so iterative dev is never served stale cache.
export function registerSW(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline caching is optional — never block the app */
    });
  });
}
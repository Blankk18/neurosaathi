// NeuroSaathi offline service worker.
// Precaches the app shell so the prototype works with no internet,
// then network-firsts every other same-origin GET (hashed assets, routes).
const CACHE = 'neurosaathi-v1';
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/sw.js', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  // Non-navigation assets (JS/CSS/image chunks): network-first, cache copy on success.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches
          .open(CACHE)
          .then((cache) => cache.put(req, copy))
          .catch(() => {
            /* ignore storage quota */
          });
        return res;
      })
      .catch(() =>
        // Offline: served from cache; fall back to the app shell for routes.
        caches.match(req).then((hit) => (hit && (hit.ok || hit.type === 'opaque')) || caches.match('/index.html')),
      ),
  );
});
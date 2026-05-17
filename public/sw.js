// PICO-8 SFX Editor — Service Worker
// Strategy: cache-first for GET requests; update cache in background.
// Bump CACHE_NAME when deploying a breaking update to force eviction.
//
// NOTE: During Vite dev-server sessions this SW may intercept HMR requests.
// For development, unregister it in DevTools → Application → Service Workers.

const CACHE_NAME = 'p8sfx-v1';

// App shell — always precached on install so the app opens offline immediately.
// Vite's hashed JS/CSS bundles are cached at runtime by the fetch handler below.
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Install: precache the shell ───────────────────────────────────────────────
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),   // activate immediately, no page reload needed
  );
});

// ── Activate: remove stale caches from previous versions ─────────────────────
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE_NAME)
            .map(k => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),  // take control of all open tabs now
  );
});

// ── Fetch: cache-first, populate cache on network hits ───────────────────────
self.addEventListener('fetch', evt => {
  // Only handle same-origin GET requests; pass everything else through.
  const url = new URL(evt.request.url);
  if (evt.request.method !== 'GET' || url.origin !== self.location.origin) return;

  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) {
        // Return the cached copy and refresh it in the background
        const refresh = fetch(evt.request).then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(evt.request, res.clone()));
          }
          return res;
        }).catch(() => {}); // network unreachable — ignore, cached copy already returned
        void refresh;
        return cached;
      }

      // Not cached yet — fetch, cache, and return
      return fetch(evt.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(evt.request, copy));
        }
        return res;
      }).catch(() =>
        // Offline and not cached — return the shell so the app still mounts
        caches.match('/index.html'),
      );
    }),
  );
});

// PICO-8 SFX Editor — Service Worker
//
// Strategy:
//   /assets/*.js|css  → cache-first  (Vite content-hashes guarantee immutability)
//   everything else   → network-first (index.html must always be fresh so its
//                        asset-hash references match what Vercel actually serves)
//
// Bump CACHE_NAME on any deployment that changes non-hashed static files.

const CACHE_NAME = 'p8sfx-v2';

// Pre-cache stable, non-hashed static files.
// index.html is intentionally excluded — it contains hashed asset references
// that change on every build and must never be served stale.
const PRECACHE = [
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),  // activate immediately
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))),
      )
      .then(() => self.clients.claim()),  // take control of all open tabs
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  if (evt.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Hashed bundles are content-addressed — safe to serve from cache indefinitely.
  if (url.pathname.startsWith('/assets/')) {
    evt.respondWith(
      caches.match(evt.request).then(cached => {
        if (cached) return cached;
        return fetch(evt.request).then(res => {
          if (res.ok) caches.open(CACHE_NAME).then(c => c.put(evt.request, res.clone()));
          return res;
        });
      }),
    );
    return;
  }

  // index.html and all other routes: network-first.
  // On success, update the cache so offline still works.
  // On failure (offline), fall back to the most-recently-cached copy.
  evt.respondWith(
    fetch(evt.request)
      .then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(evt.request, res.clone()));
        return res;
      })
      .catch(() =>
        caches.match(evt.request).then(cached => cached ?? caches.match('/')),
      ),
  );
});

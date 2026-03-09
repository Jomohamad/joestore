const VERSION = 'v1.0.0';
const STATIC_CACHE = `joestore-static-${VERSION}`;
const PAGE_CACHE = `joestore-pages-${VERSION}`;
const API_CACHE = `joestore-api-${VERSION}`;

const PRECACHE_URLS = ['/', '/offline.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/logo.png'];
const ASSET_DESTINATIONS = new Set(['style', 'script', 'font', 'image', 'worker']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![STATIC_CACHE, PAGE_CACHE, API_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const cacheFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
};

const networkFirstPage = async (request) => {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || (await caches.match('/offline.html'));
  }
};

const networkFirstApi = async (request) => {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'OFFLINE', message: 'Offline: API data unavailable right now.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isNextInternalAsset =
    url.pathname.startsWith('/_next/') ||
    url.pathname.includes('.hot-update.') ||
    url.pathname.endsWith('/webpack-hmr');

  // Never cache or rewrite Next.js internals; HMR relies on fresh network responses.
  if (isNextInternalAsset) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  if (ASSET_DESTINATIONS.has(request.destination) || /\.(css|js|png|jpg|jpeg|webp|svg|gif|woff2?)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      return cached || (await caches.match('/offline.html'));
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

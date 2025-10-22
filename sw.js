'use strict';

const VERSION = 'v1-2025-10-22-1';
const STATIC_CACHE = `static-${VERSION}`;
const ASSETS = [
  '/',
  '/index.html',
  '/updates.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => {
      if (!key.includes(VERSION)) {
        return caches.delete(key);
      }
    }))).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for updates.json to get fresh updates
  if (url.pathname.endsWith('/updates.json') || url.pathname === '/updates.json') {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Stale-while-revalidate for others
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

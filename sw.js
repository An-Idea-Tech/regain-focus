/**
 * sw.js - Service Worker
 * Enables offline functionality by caching critical assets.
 * Handles cache invalidation through versioned CACHE_NAME.
 */
const CACHE_NAME = 'regain-v21';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/audio.js',
  './js/timer.js',
  './js/app.js',
  './manifest-v14.json',
  './icons/icon-192-v14.png',
  './icons/icon-512-v14.png',
  './icons/icon-v14.svg'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching assets');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Assets
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
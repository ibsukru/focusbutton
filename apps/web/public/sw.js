const CACHE_NAME = 'focus-button-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/timer-end.mp3',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico'
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Cache failed:', error);
      })
  );
  // Force waiting Service Worker to become active
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, return offline fallback
        return new Response('Offline');
      })
  );
});

self.addEventListener("message", (event) => {
  console.log("Service Worker received message:", event.data);
  
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

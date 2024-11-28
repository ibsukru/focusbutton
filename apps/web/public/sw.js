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
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
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
  );
});

self.addEventListener("message", async (event) => {
  console.log("Service Worker received message:", event.data);
  
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    try {
      const result = await self.registration.showNotification("Focus Timer Complete!", {
        body: "Your focus session has ended.",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "focus-timer",
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });
      console.log("Notification shown successfully:", result);
    } catch (error) {
      console.error("Failed to show notification:", error);
    }
  }
});

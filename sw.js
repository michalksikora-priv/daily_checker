// Service Worker dla Daily Checker PWA
// Wersja cache - ZMIEŃ TĘ LICZBĘ PO KAŻDEJ AKTUALIZACJI!
const CACHE_VERSION = 'v3';
const CACHE_NAME = `daily-checker-${CACHE_VERSION}`;

// Bazowa ścieżka wynikająca z zakresu (scope) Service Workera.
// Na GitHub Pages (project site) będzie to np. "/daily-checker/".
const SCOPE_URL = new URL(self.registration.scope);

function withBase(path) {
  return new URL(path, SCOPE_URL).toString();
}

// Pliki do cache'owania (względem scope)
const urlsToCache = [
  withBase('./'),
  withBase('index.html'),
  withBase('styles.css'),
  withBase('app.js'),
  withBase('manifest.json'),
  withBase('assets/icons/icon-192.png'),
  withBase('assets/icons/icon-512.png'),
];

// Instalacja Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Aktywacja - czyszczenie starych cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - offline-first i bezpieczny fallback dla nawigacji (iOS Home Screen)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Nawigacja (uruchomienie z ikony, odświeżenie, wejście na URL w obrębie scope)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (!response || response.status >= 400) {
            return caches.match(withBase('index.html'));
          }
          return response;
        })
        .catch(() => caches.match(withBase('index.html')))
    );
    return;
  }

  // Pozostałe zasoby: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
        return response;
      }).catch(() => caches.match(withBase('index.html')));
    })
  );
});

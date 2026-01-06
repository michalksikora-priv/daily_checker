// Service Worker dla Daily Checker PWA
// Wersja cache - ZMIEŃ TĘ LICZBĘ PO KAŻDEJ AKTUALIZACJI!
const CACHE_VERSION = 'v1';
const CACHE_NAME = `daily-checker-${CACHE_VERSION}`;

// Pliki do cache'owania
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

// Instalacja Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installed successfully');
        return self.skipWaiting(); // Aktywuj nowy SW natychmiast
      })
  );
});

// Aktywacja Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Usuń stare cache
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim(); // Przejmij kontrolę nad wszystkimi klientami
      })
  );
});

// Obsługa requestów - strategia Cache First
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Jeśli jest w cache, zwróć z cache
        if (response) {
          return response;
        }
        
        // Jeśli nie ma w cache, pobierz z sieci
        return fetch(event.request)
          .then((response) => {
            // Sprawdź czy odpowiedź jest poprawna
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Sklonuj odpowiedź (można jej użyć tylko raz)
            const responseToCache = response.clone();
            
            // Dodaj do cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Jeśli nie ma sieci, pokaż podstawową wersję
            return caches.match('/index.html');
          });
      })
  );
});
/* ═══════════════════════════════════════════════════════════════
   AniPet Service Worker — Cache-First Strategy
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'anipet-v10';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/characters.js',
  './js/animEngine.js',
  './js/audioEngine.js',
  './js/router.js',
  './js/gridView.js',
  './js/detailView.js',
  './assets/audio/dog_bark.mp3',
  './assets/audio/cat_meow.mp3',
  './assets/audio/duck_quack.mp3',
  './icons/anipet_icon.png',
  './icons/anipet_icon_192.png',
  './icons/anipet_icon_512.png',
  './icons/anipet_icon_circular.png',
  './icons/anipet_icon_circular_192.png',
  // Dog sprites
  './assets/sprites/dog/dog_idle.png',
  './assets/sprites/dog/dog_happy.png',
  './assets/sprites/dog/dog_sad.png',
  './assets/sprites/dog/dog_confused.png',
  './assets/sprites/dog/dog_walking.png',
  './assets/sprites/dog/dog_jumping.png',
  './assets/sprites/dog/dog_sleepy.png',
  './assets/sprites/dog/dog_playing.png',
  './assets/sprites/dog/dog_walkin.png',
  // Cat sprites
  './assets/sprites/cat/cat_idle.png',
  './assets/sprites/cat/cat_happy.png',
  './assets/sprites/cat/cat_sad.png',
  './assets/sprites/cat/cat_confused.png',
  './assets/sprites/cat/cat_walking.png',
  './assets/sprites/cat/cat_jumping.png',
  './assets/sprites/cat/cat_sleepy.png',
  './assets/sprites/cat/cat_playing.png',
  './assets/sprites/cat/cat_walkin.png',
  // Duck sprites
  './assets/sprites/duck/duck_idle.png',
  './assets/sprites/duck/duck_happy.png',
  './assets/sprites/duck/duck_sad.png',
  './assets/sprites/duck/duck_confused.png',
  './assets/sprites/duck/duck_walking.png',
  './assets/sprites/duck/duck_jumping.png',
  './assets/sprites/duck/duck_sleepy.png',
  './assets/sprites/duck/duck_playing.png',
  './assets/sprites/duck/duck_walkin.png',
];

/* ── Install: precache all app shell resources ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: delete old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first, network fallback + dynamic caching ── */
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

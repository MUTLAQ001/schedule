const CACHE = 'qu-schedule-v22';

const CORE = [
  './',
  './index.html',
  './tutorial.html',
  './manifest.json',
  './extractor.js',
  './filler.js',
  './css/styles.css',
  './css/mobile.css',
  './css/desktop.css',
  './css/tutorial.css',
  './js/tutorial.js',
  './js/tutorial-starfield.js',
  './js/starfield.js',
  './js/env.js',
  './js/main.js',
  './js/app/core.js',
  './js/app/schedule-ui.js',
  './js/app/exams.js',
  './js/app/dom-events.js',
  './js/app/interactions.js',
  './js/app/utils.js',
  './js/app/generator.js',
  './js/app/tools.js',
  './js/app/help.js',
  './js/app/calendar.js',
  './js/app/layout.js',
  './js/app/settings.js',
  './js/app/export-notes.js',
  './js/app/misc.js',
  './js/app/archive.js',
  './js/app/data-diff.js',
  './js/app/free-courses-data.js',
  './js/app/free-courses.js',
  './js/app/mobile-ux.js',
  './js/app/watch.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './issue-url-mobile.jpg',
  './issue-popup-mobile.jpg',
  './issue-safari-mobile.jpg',
  './issue-jsprefix-mobile.jpg',
  './issue-nodata-mobile.jpg',
  './issue-edge-mobile.jpg'
];

const CDN = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req) {
  return fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => { });
      }
      return res;
    })
    .catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)));
}

function staleWhileRevalidate(req) {
  return caches.match(req).then((cached) => {
    const network = fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => { });
        }
        return res;
      })
      .catch(() => cached);
    return cached || network;
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const sameOrigin = url.origin === self.location.origin;
  const isCDN = CDN.some((h) => url.hostname === h);
  if (!sameOrigin && !isCDN) return;

  if (/\.(mp4|webm|mov)$/i.test(url.pathname) || req.headers.has('range')) return;

  if (sameOrigin) {
    e.respondWith(networkFirst(req));
    return;
  }

  e.respondWith(staleWhileRevalidate(req));
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

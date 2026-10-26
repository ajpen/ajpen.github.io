const CACHE = 'penny-shell-v6-custom-categories';
const SHELL = ['./', './index.html', './src/app.js', './src/core.js', './src/storage.js', './src/url-entry.js', './src/styles.css', './manifest.webmanifest', './public/icons/icon.svg', './public/icons/icon-192.png', './public/icons/icon-512.png', './public/icons/apple-touch-icon.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('penny-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (event.request.mode === 'navigate') return (await cache.match('./index.html')) || fetch(event.request);
    return (await cache.match(event.request, { ignoreSearch: true })) || fetch(event.request);
  }));
});

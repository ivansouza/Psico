const cacheName = 'psico-pwa-v2';
const assets = [
    '/Psico/',
    '/Psico/index.html',
    '/Psico/manifest.json',
    '/Psico/sw.js',
    '/Psico/psychedelic-icon-192x192.png',
    '/Psico/psychedelic-icon-512x512.png'
];

// Instalar e adicionar os recursos ao cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(cacheName).then(cache => cache.addAll(assets))
    );
});

// Ativar e remover caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== cacheName).map(key => caches.delete(key))
            );
        })
    );
});

// Interceptar requisições e servir do cache
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

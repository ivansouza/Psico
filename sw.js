const cacheName = 'psico-pwa-v2';
const assets = [
    './',
    './index.html',
    './manifest.json',
    './sw.js',
    './psychedelic-icon-192x192.png',
    './psychedelic-icon-512x512.png'
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

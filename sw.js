const cacheName = 'psico-pwa-v6';
const assets = [
    './index.html',
    './manifest.json',
    './sw.js',
    './psychedelic-icon-192x192.png',
    './psychedelic-icon-512x512.png'
];

// Instalando e armazenando no cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(cacheName).then(cache => {
            return cache.addAll(assets);
        })
    );
    self.skipWaiting();  // Forçar o SW a ser ativado imediatamente
});

// Ativando e limpando caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== cacheName).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Interceptando as requisições e servindo do cache
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

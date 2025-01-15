const cacheName = 'psico-cache-v1';
const assets = [
    '/',
    '/Psico/index.html',
    '/Psico/manifest.json',
    '/Psico/sw.js',
    '/Psico/style.css',
    '/Psico/script.js',
    '/Psico/icons/icon-192x192.png',
    '/Psico/icons/icon-512x512.png'
];

// Instalando e armazenando no cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(cacheName).then(cache => {
            return cache.addAll(assets);
        })
    );
});

// Ativar e limpar caches antigos
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

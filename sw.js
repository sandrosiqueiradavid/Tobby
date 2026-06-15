const CACHE_NAME = 'tobby-v6';
const urlsToCache = [
  '/Tobby/',
  '/Tobby/index.html',
  '/Tobby/manifest.json',
  '/Tobby/api.js',
  '/Tobby/app.js',
  '/Tobby/styles.css',
  '/Tobby/icon-192.png',
  '/Tobby/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Erro no cache:', err))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('push', function(event) {
  let data = { title: '🐶 Tobby', body: 'Você tem uma conta a vencer!', url: '/Tobby/' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch(e) {
    console.warn('Erro ao parsear push data:', e);
  }
  
  const options = {
    body: data.body,
    icon: '/Tobby/icon-192.png',
    badge: '/Tobby/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/Tobby/' },
    actions: [
      { action: 'open', title: 'Abrir app' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
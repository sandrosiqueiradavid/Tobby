const CACHE = 'tobby-v3';
const ASSETS = ['/', '/index.html', '/manifest.json', '/api.js', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// ===== NOTIFICAÇÕES PUSH =====
self.addEventListener('push', function(event) {
  let data = { title: '🐶 Tobby', body: 'Você tem uma conta a vencer!', url: '/' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch(e) {
    console.warn('Erro ao parsear push data:', e);
  }
  
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
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
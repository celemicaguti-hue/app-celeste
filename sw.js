// Celeste ✨ — Service Worker
// Versión del cache
const CACHE_NAME = 'celeste-v1';
const ASSETS = ['./index.html', './manifest.json'];

// ── INSTALACIÓN: cachea los archivos principales ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVACIÓN: limpia caches viejos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: sirve desde cache si está disponible ──
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ── NOTIFICACIONES PROGRAMADAS ──
// Recibe mensaje desde la app principal con los recordatorios
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDERS') {
    // Guardamos los recordatorios en el SW para verificarlos
    self.reminders = event.data.reminders || [];
  }
  if (event.data && event.data.type === 'GET_STATUS') {
    event.source.postMessage({ type: 'SW_READY' });
  }
});

// ── VERIFICACIÓN PERIÓDICA via Periodic Background Sync (si está disponible) ──
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkAndNotify());
  }
});

// ── NOTIFICACIÓN recibida via Push API ──
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Celeste ✨', body: '¡Momento de afirmar! 🌸' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Celeste ✨', {
      body: data.body || '¡Momento de afirmar! 🌸',
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'celeste-reminder',
      renotify: true,
      data: { url: self.location.origin + self.location.pathname }
    })
  );
});

// ── Click en notificación: abre la app ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Si ya hay una pestaña abierta, la enfoca
      for (const client of clientList) {
        if (client.url.includes('index.html') || client.url.endsWith('/')) {
          return client.focus();
        }
      }
      // Si no, abre una nueva
      return clients.openWindow(event.notification.data?.url || './index.html');
    })
  );
});

// ── Función auxiliar para mostrar notificación ──
async function checkAndNotify() {
  const reminders = self.reminders || [];
  const now = new Date();
  const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const dow = now.getDay();

  for (const r of reminders) {
    if (r.paused) continue;
    if (!r.days.includes(dow)) continue;
    if (r.time !== hhmm) continue;

    await self.registration.showNotification('Celeste ✨', {
      body: r.msg,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'celeste-' + r.id,
      renotify: true,
      data: { url: self.location.href }
    });
  }
}

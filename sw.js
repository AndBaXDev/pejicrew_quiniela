// Service Worker para Web Push Notifications
// Recibir notificación push
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  self.registration.showNotification(data.title || '🏟️ Quiniela', {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: data.url || 'https://andbaxdev.github.io/pejicrew_quiniela/#/' },
    tag: 'quiniela-notification',
    requireInteraction: false,
  });
});

// Click en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  clients.matchAll({ type: 'window' }).then((windowClients) => {
    if (windowClients.length > 0) {
      windowClients[0].navigate(event.notification.data.url);
      windowClients[0].focus();
    } else {
      clients.openWindow(event.notification.data.url);
    }
  });
});

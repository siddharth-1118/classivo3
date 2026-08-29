// Service Worker for Classivo PWA — handles push notifications when app is closed

self.addEventListener('push', function (event) {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Classivo';
    const tag = data.tag || 'classivo-notif';

    const options = {
      body: data.body || '',
      icon: data.icon || '/icon.png',
      badge: '/icon.png',
      tag: tag,
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      vibrate: [200, 100, 200, 100, 200],
      data: { url: data.url || '/' },
      actions: data.actions || [],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('Push event error', e);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});


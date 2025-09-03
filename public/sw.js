self.addEventListener('push', function(event) {
    console.log("push event received", event);
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notifica';
  const options = {
    body: data.body || '',
    icon: '/faviconWhite.png',
    badge: '/faviconWhite.png',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

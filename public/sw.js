// Service Worker — reçoit les notifications push même si l'onglet
// est fermé ou l'application en arrière-plan.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: '🎣 Vous venez d\'être piégé', body: "Ce QR code d'appel de présence était une simulation de quishing." };
  try {
    if (event.data) data = event.data.json();
  } catch (e) { /* garde les valeurs par défaut */ }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const visibleClient = clientList.find((c) => c.visibilityState === 'visible');

      if (visibleClient) {
        // Onglet au premier plan : la page affiche elle-même l'écran plein
        // écran pendant 1 minute — pas besoin de notification système en plus.
        visibleClient.postMessage({ type: 'trap-triggered', title: data.title, body: data.body });
        return Promise.resolve();
      }

      // Onglet fermé ou en arrière-plan : vraie notification système,
      // affichée automatiquement, sans aucune validation requise pour la voir.
      return self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200],
        tag: 'quishing-trap',
        renotify: true,
        requireInteraction: false,
        data: { url: '/presence.html?trap=1' }
      });
    })
  );
});

// Au clic sur la notification : ramène ou ouvre l'onglet de présence,
// qui affichera lui aussi l'overlay explicatif complet.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/presence.html?trap=1';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (client.url.includes('presence.html') && 'focus' in client) {
          // Certains navigateurs (Chrome) supportent client.navigate pour
          // forcer l'affichage de l'overlay même si l'onglet était déjà ouvert
          // sur une ancienne version de la page.
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch (e) { /* navigate non supporté : on se contente du focus */ }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

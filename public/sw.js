// Service Worker — usage strictement ponctuel (one-time).
// Reçoit UNE SEULE notification push même si l'onglet est fermé ou
// l'application en arrière-plan, puis se désabonne et se désinstalle
// automatiquement : rien ne reste installé sur le téléphone après coup.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Nettoyage complet : désabonnement du push puis désinstallation du
// service worker lui-même. Après cet appel, l'appareil ne conserve plus
// aucun abonnement ni aucune trace de la démonstration.
async function selfCleanup() {
  try {
    const subscription = await self.registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch (e) { /* déjà désabonné ou non supporté : sans conséquence */ }
  try {
    await self.registration.unregister();
  } catch (e) { /* sans conséquence */ }
}

self.addEventListener('push', (event) => {
  let data = { title: '🎣 Vous venez d\'être piégé', body: "Ce QR code d'appel de présence était une simulation de quishing." };
  try {
    if (event.data) data = event.data.json();
  } catch (e) { /* garde les valeurs par défaut */ }

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const visibleClient = clientList.find((c) => c.visibilityState === 'visible');

      if (visibleClient) {
        // Onglet au premier plan : la page affiche elle-même l'écran plein
        // écran pendant 1 minute — pas besoin de notification système en plus.
        visibleClient.postMessage({ type: 'trap-triggered', title: data.title, body: data.body });
      } else {
        // Onglet fermé ou en arrière-plan : vraie notification système,
        // affichée automatiquement, sans aucune validation requise pour la voir.
        await self.registration.showNotification(data.title, {
          body: data.body,
          icon: '/icon.png',
          badge: '/icon.png',
          vibrate: [200, 100, 200],
          tag: 'quishing-trap',
          renotify: true,
          requireInteraction: false,
          data: { url: '/presence.html?trap=1' }
        });
      }

      // Usage unique : dès que le piège a été servi une fois, on nettoie
      // tout (désabonnement + désinstallation), qu'il y ait eu clic ou non.
      await selfCleanup();
    })()
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

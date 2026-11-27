/*
 * PROTOTYPE (ticket 144, branche prototype/rappel, jetable) : ce que fait le service worker quand un Rappel arrive.
 * Ajouté au service worker de Workbox par « importScripts » (vite.config.ts).
 *
 * Safari et Chrome exigent qu'un push affiche toujours une notification (sinon, ils finissent par couper les
 * notifications du site) : on l'affiche donc dans tous les cas, même si le message est illisible.
 */
self.addEventListener('push', (evenement) => {
  let message = { titre: 'Duel Carbone', texte: 'C’est l’heure du Duel Carbone ! ⚔️', adresse: '/?ref=notification' }
  try {
    message = { ...message, ...evenement.data.json() }
  } catch {
    // Message vide ou illisible : on garde le texte par défaut.
  }
  evenement.waitUntil(
    self.registration.showNotification(message.titre, {
      body: message.texte,
      icon: '/application/icone-192.png',
      // « tag » : un nouveau Rappel remplace l'ancien dans le centre de notifications, au lieu de s'empiler.
      tag: 'rappel-du-matin',
      data: { adresse: message.adresse },
    }),
  )
})

// Un clic sur la notification ouvre l'accueil du jeu (ou ramène au premier plan le jeu déjà ouvert).
self.addEventListener('notificationclick', (evenement) => {
  evenement.notification.close()
  const adresse = new URL(evenement.notification.data?.adresse ?? '/', self.location.origin).href
  evenement.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const fenetre of fenetres) {
        if (new URL(fenetre.url).origin === self.location.origin && 'focus' in fenetre) {
          await fenetre.focus()
          if ('navigate' in fenetre) await fenetre.navigate(adresse).catch(() => {})
          return
        }
      }
      await self.clients.openWindow(adresse)
    })(),
  )
})

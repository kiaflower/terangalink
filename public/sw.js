const OFFLINE_CACHE = 'ts-offline-v2'
const RUNTIME_CACHE = 'ts-dashboard-v2'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Network-first pour la navigation : on ne veut jamais servir un dashboard
// périmé (commandes, stats) en priorité, seulement quand le réseau est
// indisponible. On garde alors la dernière version chargée avec succès de
// CETTE page (utile, pas juste "pas de connexion") et on ne retombe sur le
// message générique que si rien n'a encore été mis en cache pour elle.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {})
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        const offline = await caches.match(OFFLINE_URL)
        return offline || new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      })
  )
})

// Le payload est le JSON envoyé par sendPush.ts ({ type, title, body, url }).
// Si le parsing échoue (payload absent/corrompu), on affiche quand même une
// notification générique plutôt que de rester silencieux.
self.addEventListener('push', (event) => {
  let payload = { title: 'TerangaSpot', body: '', url: '/dashboard/boutique' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/admin-192.png',
      badge: '/icons/admin-192.png',
      data: { url: payload.url || '/dashboard/boutique' },
    })
  )
})

// Fait passer au premier plan un onglet du dashboard déjà ouvert plutôt que
// d'en ouvrir un nouveau, si possible.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard/boutique'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus()
      }
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          return client.focus().then(() => client.navigate(targetUrl))
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})

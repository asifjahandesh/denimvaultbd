// Denim Vault BD - Background Web Push Service Worker
const SW_VERSION = '1.0.0'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Listen for incoming Web Push events from Google FCM, Apple, Mozilla
self.addEventListener('push', (event) => {
  let data = {}
  try {
    if (event.data) {
      data = event.data.json()
    }
  } catch (err) {
    try {
      data = { body: event.data.text() }
    } catch (e) {
      data = {}
    }
  }

  const title = data.title || '🛍️ New Order Received!'
  const options = {
    body: data.body || 'A customer just placed a new order on Denim Vault BD.',
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    image: data.image || undefined,
    tag: data.tag || `order-${Date.now()}`,
    renotify: true,
    requireInteraction: true, // Keeps banner visible on PC until admin clicks or dismisses
    vibrate: [300, 150, 300, 150, 400], // Phone vibration pattern
    data: {
      url: data.url || '/admin',
      orderId: data.orderId || null,
      timestamp: Date.now()
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Handle click on notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if an Admin tab is already open
      for (const client of windowClients) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus()
        }
      }
      // If no admin tab is open, open a new browser window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})

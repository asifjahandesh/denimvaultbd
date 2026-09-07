// Client-side Push Notification Manager for Denim Vault BD Admin
// Handles Service Worker registration, VAPID subscription, and audio alerts

/**
 * Converts URL-safe base64 string to Uint8Array required for applicationServerKey
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Detects friendly name of current device (e.g. "Windows PC", "Android Phone", "iPhone")
 */
export function getDeviceName() {
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'Android Device'
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS Device'
  if (/Windows/i.test(ua)) return 'Windows PC'
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac'
  if (/Linux/.test(ua)) return 'Linux PC'
  return 'Browser Device'
}

/**
 * Checks if the current browser environment supports Push Notifications
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Registers the background Service Worker
 */
export async function registerServiceWorker() {
  if (!isPushSupported()) return null
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    await navigator.serviceWorker.ready
    return registration
  } catch (err) {
    console.warn('Service worker registration failed:', err)
    return null
  }
}

/**
 * Gets the current active PushSubscription on this device, if any
 */
export async function getCurrentSubscription() {
  if (!isPushSupported()) return null
  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch (err) {
    console.warn('Error checking push subscription:', err)
    return null
  }
}

/**
 * Subscribes current device to background push notifications
 */
export async function subscribeDeviceToPush() {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported on this browser.')
  }

  // 1. Request user permission
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied. Please allow notifications in browser site settings.')
  }

  // 2. Ensure Service Worker is ready
  const registration = await registerServiceWorker()
  if (!registration) {
    throw new Error('Could not register background service worker.')
  }

  // 3. Fetch public VAPID key from backend
  const keyResponse = await fetch('/api/push-vapid-key')
  if (!keyResponse.ok) {
    throw new Error('Failed to retrieve push encryption key from server.')
  }
  const keyData = await keyResponse.json()
  if (!keyData.publicKey) {
    throw new Error('Public key missing from server response.')
  }

  // 4. Subscribe to PushManager
  const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey)
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey
  })

  // 5. Send subscription to server to store in Supabase
  const saveResponse = await fetch('/api/push-vapid-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'subscribe',
      subscription: subscription.toJSON(),
      deviceName: getDeviceName()
    })
  })

  if (!saveResponse.ok) {
    throw new Error('Failed to save subscription on server.')
  }

  return subscription
}

/**
 * Unsubscribes current device from background push notifications
 */
export async function unsubscribeDeviceFromPush() {
  if (!isPushSupported()) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return true

    // Inform server
    await fetch('/api/push-vapid-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'unsubscribe',
        subscription: subscription.toJSON()
      })
    })

    // Unsubscribe locally
    return await subscription.unsubscribe()
  } catch (err) {
    console.error('Error unsubscribing device:', err)
    throw err
  }
}

/**
 * Sends a test push notification to verify setup
 */
export async function sendTestNotification() {
  const response = await fetch('/api/send-order-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isTest: true })
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to dispatch test notification')
  }
  return await response.json()
}

/**
 * Plays a pleasant, attention-grabbing audio chime using Web Audio API
 * (Synthesized natively - zero external files required)
 */
export function playOrderAlertChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    const ctx = new AudioContext()
    const now = ctx.currentTime

    // Note 1: High crisp chime (F5 - 698.46 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(698.46, now)
    gain1.gain.setValueAtTime(0.35, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.6)

    // Note 2: Harmonious higher chime (C6 - 1046.50 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1046.5, now + 0.15)
    gain2.gain.setValueAtTime(0.4, now + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.9)
  } catch (err) {
    console.warn('Could not synthesize audio alert:', err)
  }
}

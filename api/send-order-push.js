// API Endpoint: /api/send-order-push
import webpush from 'web-push'
import { getVapidKeys, getSubscriptions, saveSubscriptions } from './_vapid.js'

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Ensure VAPID keys are initialized
    await getVapidKeys()

    // 2. Fetch all registered admin device subscriptions
    const subscriptions = await getSubscriptions()

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No admin devices currently registered for push notifications.',
        delivered: 0
      })
    }

    const {
      customer_name,
      phone,
      product_name,
      product_variant,
      quantity = 1,
      total_price,
      address,
      orderId,
      isTest = false
    } = req.body || {}

    // 3. Build notification payload
    let notificationPayload
    if (isTest) {
      notificationPayload = {
        title: '🔔 Test Order Notification',
        body: 'Success! Push notifications are properly configured and active on this device for Denim Vault BD.',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        url: '/admin?tab=settings',
        tag: `test-push-${Date.now()}`
      }
    } else {
      const formattedTotal = Number(total_price || 0).toLocaleString('en-US')
      const customerPart = customer_name ? `${customer_name} (${phone || 'No phone'})` : 'Customer'
      const itemPart = product_name ? `${quantity}x ${product_name}${product_variant ? ` - ${product_variant}` : ''}` : 'New product order'

      notificationPayload = {
        title: `🛍️ New Order: ৳${formattedTotal}!`,
        body: `${customerPart}\nItem: ${itemPart}`,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        url: '/admin?tab=orders',
        tag: `order-${orderId || Date.now()}`,
        orderId: orderId || null
      }
    }

    const payloadString = JSON.stringify(notificationPayload)

    // 4. Dispatch push to all registered devices in parallel
    const expiredEndpoints = []
    let deliveredCount = 0

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys
            },
            payloadString,
            {
              TTL: 60 * 60 * 24, // 24 hours delivery window
              urgency: 'high'
            }
          )
          deliveredCount++
        } catch (pushErr) {
          console.error('Failed to send push to endpoint:', sub.endpoint, pushErr.statusCode || pushErr.message)
          // Status 404 (Not Found) or 410 (Gone) indicates the subscription has expired or user revoked it
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            expiredEndpoints.push(sub.endpoint)
          }
        }
      })
    )

    // 5. Clean up expired endpoints
    if (expiredEndpoints.length > 0) {
      const activeSubs = subscriptions.filter((s) => !expiredEndpoints.includes(s.endpoint))
      await saveSubscriptions(activeSubs)
    }

    return res.status(200).json({
      success: true,
      delivered: deliveredCount,
      totalDevices: subscriptions.length,
      cleanedExpired: expiredEndpoints.length
    })
  } catch (err) {
    console.error('Error sending order push notifications:', err)
    return res.status(500).json({ error: err.message || 'Failed to dispatch push notification' })
  }
}

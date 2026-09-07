// API Endpoint: /api/push-vapid-key
import { getVapidKeys, getSubscriptions, saveSubscriptions } from './_vapid.js'

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const keys = await getVapidKeys()

    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        publicKey: keys.publicKey
      })
    }

    if (req.method === 'POST') {
      const { action, subscription, deviceName } = req.body || {}

      if (action === 'subscribe' && subscription && subscription.endpoint) {
        const currentSubs = await getSubscriptions()
        // Deduplicate by endpoint
        const filtered = currentSubs.filter((s) => s.endpoint !== subscription.endpoint)
        filtered.push({
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          deviceName: deviceName || 'Admin Device',
          userAgent: req.headers['user-agent'] || 'Unknown',
          subscribedAt: new Date().toISOString()
        })
        await saveSubscriptions(filtered)

        return res.status(200).json({
          success: true,
          message: 'Device subscribed successfully to push notifications.',
          totalDevices: filtered.length
        })
      }

      if (action === 'unsubscribe' && subscription && subscription.endpoint) {
        const currentSubs = await getSubscriptions()
        const filtered = currentSubs.filter((s) => s.endpoint !== subscription.endpoint)
        await saveSubscriptions(filtered)

        return res.status(200).json({
          success: true,
          message: 'Device unsubscribed from push notifications.',
          totalDevices: filtered.length
        })
      }

      return res.status(400).json({ error: 'Invalid action or missing subscription payload' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Error in /api/push-vapid-key:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

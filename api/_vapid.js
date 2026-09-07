// Shared VAPID & Supabase Push Notification Helper for Vercel Functions
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null

/**
 * Retrieves existing VAPID keys from environment or Supabase 'settings' table.
 * Automatically generates and persists a valid keypair if none exists yet.
 */
export async function getVapidKeys() {
  // 1. Check environment variables first
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:support@denimvaultbd.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    }
  }

  // 2. Query Supabase settings table
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'vapid_keys')
        .maybeSingle()

      if (!error && data && data.value && data.value.public_key && data.value.private_key) {
        webpush.setVapidDetails(
          'mailto:support@denimvaultbd.com',
          data.value.public_key,
          data.value.private_key
        )
        return {
          publicKey: data.value.public_key,
          privateKey: data.value.private_key
        }
      }

      // 3. Not found in DB: Generate a new RFC 8292 standard VAPID keypair
      const generated = webpush.generateVAPIDKeys()
      await supabase
        .from('settings')
        .upsert({
          key: 'vapid_keys',
          value: {
            public_key: generated.publicKey,
            private_key: generated.privateKey,
            created_at: new Date().toISOString()
          }
        })

      webpush.setVapidDetails(
        'mailto:support@denimvaultbd.com',
        generated.publicKey,
        generated.privateKey
      )
      return generated
    } catch (err) {
      console.error('Error handling VAPID keys with Supabase:', err)
    }
  }

  // Fallback: ephemeral generation
  const fallback = webpush.generateVAPIDKeys()
  webpush.setVapidDetails('mailto:support@denimvaultbd.com', fallback.publicKey, fallback.privateKey)
  return fallback
}

/**
 * Retrieve all registered admin push subscriptions.
 */
export async function getSubscriptions() {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'admin_push_subscriptions')
      .maybeSingle()

    if (error || !data || !Array.isArray(data.value)) {
      return []
    }
    return data.value
  } catch (err) {
    console.error('Error fetching push subscriptions:', err)
    return []
  }
}

/**
 * Save updated push subscriptions list to Supabase settings.
 */
export async function saveSubscriptions(subscriptions) {
  if (!supabase) return
  try {
    await supabase
      .from('settings')
      .upsert({
        key: 'admin_push_subscriptions',
        value: subscriptions,
        created_at: new Date().toISOString()
      })
  } catch (err) {
    console.error('Error saving push subscriptions:', err)
  }
}

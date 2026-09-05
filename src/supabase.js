import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Helper to validate if a URL is valid
const isValidUrl = (url) => {
  try {
    return url && new URL(url).protocol.startsWith('http')
  } catch {
    return false
  }
}

let supabaseInstance

if (isValidUrl(supabaseUrl) && supabaseAnonKey) {
  // Safe to initialize real Supabase client
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
} else {
  console.warn(
    'Supabase URL or Anon Key is missing or invalid. Denim Vault BD is running in Demo Mode with mock data.'
  )

  // Provide a safe Mock Client to prevent React app crash and display offline mock data
  supabaseInstance = {
    from: (table) => {
      const mockQuery = {
        select: () => mockQuery,
        order: () => mockQuery,
        eq: () => mockQuery,
        insert: () => mockQuery,
        update: () => mockQuery,
        upsert: () => mockQuery,
        delete: () => mockQuery,
        // Promise-like interface to resolve database select calls
        then: (onfulfilled) => {
          let data = []
          if (table === 'products') {
            data = [
              {
                id: '1',
                name: 'প্রিমিয়াম জেন্টস হাতঘড়ি (Premium Watch)',
                description: 'ওয়াটারপ্রুফ মেটাল স্ট্রেপ জেন্টস হাতঘড়ি, ক্যাশ অন ডেলিভারি সুবিধা।',
                price: 1850,
                discount_price: 1350,
                stock: 12,
                category: 'ঘড়ি',
                image_urls: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'],
                created_at: new Date().toISOString()
              },
              {
                id: '2',
                name: 'স্মার্ট ওয়্যারলেস এয়ারপডস (Bluetooth Earbuds)',
                description: 'অসাধারণ সাউন্ড কোয়ালিটি ও লং ব্যাটারি ব্যাকআপ সহ আকর্ষণীয় ব্লুটুথ ইয়ারবাডস।',
                price: 2200,
                discount_price: 1650,
                stock: 3,
                category: 'গ্যাজেট',
                image_urls: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'],
                created_at: new Date().toISOString()
              }
            ]
          } else if (table === 'settings') {
            data = [
              { key: 'delivery_charges', value: { inside_dhaka: 60, outside_dhaka: 120 } },
              { key: 'social_links', value: { facebook: 'https://facebook.com/denimvaultbd', whatsapp: '+8801700000000' } },
              { key: 'shop_info', value: { name: 'Denim Vault BD (Demo)', description: 'ডেনিম ভল্ট বিডি - বাংলাদেশে ক্যাশ অন ডেলিভারিতে সেরা পণ্য কিনুন।', phone: '+8801700000000', email: 'info@denimvaultbd.com', address: 'ঢাকা, বাংলাদেশ', promo_text: '৫0% পর্যন্ত ছাড় এবং ফ্রি ডেলিভারি অফার!' } }
            ]
          } else if (table === 'reviews') {
            data = []
          }
          return Promise.resolve(onfulfilled({ data, error: null }))
        }
      }
      return mockQuery
    },
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null }, error: new Error('Demo mode active') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: new Error('Demo mode active') }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    },
    // Mock Realtime methods to prevent LandingPage crash in demo mode
    channel: () => {
      const mockChannel = {
        on: () => mockChannel,
        subscribe: () => mockChannel
      }
      return mockChannel
    },
    removeChannel: () => {}
  }
}

export const supabase = supabaseInstance

import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Header from '../components/Header'
import Hero from '../components/Hero'
import ProductList from '../components/ProductList'
import WhyChooseUs from '../components/WhyChooseUs'
import Reviews from '../components/Reviews'
import FAQ from '../components/FAQ'
import Footer from '../components/Footer'
import FloatingWidgets from '../components/FloatingWidgets'
import CheckoutModal from '../components/CheckoutModal'

export default function LandingPage({ lang, setLang }) {
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Fetch initial data
  const fetchData = async () => {
    try {
      // 1. Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (productsError) throw productsError
      setProducts(productsData || [])

      // 2. Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')

      if (settingsError) throw settingsError
      
      const settingsMap = {}
      if (settingsData) {
        settingsData.forEach((item) => {
          settingsMap[item.key] = item.value
        })
      }
      setSettings(settingsMap)
    } catch (err) {
      console.error('Error fetching landing page data:', err)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchData()
      setLoading(false)
    }
    loadData()

    // 1. Setup real-time listener for Settings table
    const settingsChannel = supabase
      .channel('public:settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          if (payload.new && payload.new.key) {
            setSettings((prev) => ({
              ...prev,
              [payload.new.key]: payload.new.value
            }))
          }
        }
      )
      .subscribe()

    // 2. Setup real-time listener for Products table
    const productsChannel = supabase
      .channel('public:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(settingsChannel)
      supabase.removeChannel(productsChannel)
    }
  }, [])

  // Safe destructuring of settings with defaults
  const shopInfo = settings.shop_info || {
    name: 'Denim Vault BD',
    description: 'সেরা কোয়ালিটির ডেনিম ও ফ্যাশন পণ্য সাশ্রয়ী মূল্যে সরাসরি আপনার দ্বারে ক্যাশ অন ডেলিভারিতে পৌঁছে দেওয়াই আমাদের লক্ষ্য।',
    phone: '+8801700000000',
    email: 'info@denimvaultbd.com',
    address: 'ঢাকা, বাংলাদেশ',
    promo_text: '৫0% পর্যন্ত ছাড় এবং ফ্রি ডেলিভারি অফার!'
  }
  const socialLinks = settings.social_links || {
    facebook: 'https://facebook.com/denimvaultbd',
    whatsapp: '+8801700000000'
  }
  const deliveryCharges = settings.delivery_charges || {
    inside_dhaka: 60,
    outside_dhaka: 120
  }

  return (
    <div class="min-h-screen bg-slate-50">
      {/* 1. Header */}
      <Header shopInfo={shopInfo} lang={lang} setLang={setLang} />

      {/* 2. Hero Section */}
      <Hero shopInfo={shopInfo} lang={lang} />

      {/* 3. Product Listing Grid */}
      <ProductList
        products={products}
        loading={loading}
        lang={lang}
        onOrderClick={(product) => setSelectedProduct(product)}
      />

      {/* 4. Why Choose Us Section */}
      <WhyChooseUs lang={lang} />

      {/* 5. Customer Reviews Section */}
      <Reviews lang={lang} />

      {/* 6. FAQ Section */}
      <FAQ lang={lang} />

      {/* 7. Footer */}
      <Footer shopInfo={shopInfo} socialLinks={socialLinks} lang={lang} />

      {/* 8. Floating Widgets */}
      <FloatingWidgets socialLinks={socialLinks} lang={lang} />

      {/* 9. Checkout Modal */}
      {selectedProduct && (
        <CheckoutModal
          product={selectedProduct}
          deliveryCharges={deliveryCharges}
          whatsappNumber={socialLinks.whatsapp}
          lang={lang}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FloatingWidgets from '../components/FloatingWidgets'
import { ArrowLeft, ShoppingBag, ShieldCheck, Truck, Check, MessageSquare, AlertTriangle, Layers, Tag, MapPin, Palette, AlertCircle } from 'lucide-react'
import { translations } from '../utils/translations'
import confetti from 'canvas-confetti'
import {
  ITEM_CATEGORIES,
  getCategorySizes,
  parseProductSizes,
  encodeProductDescription,
  formatRichText
} from '../utils/productSizes'
import {
  getAllDistricts,
  getUpazilasForDistrict,
  getThanasForDistrict,
  isDhakaDistrict,
  formatFullAddress
} from '../utils/bangladeshGeo'

export default function ProductDetails({ lang = 'bn', setLang }) {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const t = translations[lang]

  const productImages = useMemo(() => {
    if (product?.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      return product.image_urls
    }
    if (product?.image_url) {
      return [product.image_url]
    }
    return []
  }, [product])

  const [selectedColors, setSelectedColors] = useState([0])

  const toggleColor = (idx) => {
    setSelectedColors((prev) => {
      let next
      if (prev.includes(idx)) {
        next = prev.filter((i) => i !== idx)
      } else {
        next = [...prev, idx].sort((a, b) => a - b)
      }
      // Each selected color counts as an item; auto-sync quantity
      const targetCount = Math.max(1, next.length)
      setQuantity(targetCount)
      return next
    })
    setActiveImageIndex(idx)
  }

  // Checkout Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [district, setDistrict] = useState('')
  const [upazila, setUpazila] = useState('')
  const [thana, setThana] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  // Bangladesh geographic dropdown options
  const allDistricts = useMemo(() => getAllDistricts(lang), [lang])
  const availableUpazilas = useMemo(() => getUpazilasForDistrict(district, lang), [district, lang])
  const availableThanas = useMemo(() => getThanasForDistrict(district, lang), [district, lang])

  const handleDistrictChange = (selectedDistrict) => {
    setDistrict(selectedDistrict)
    setUpazila('')
    setThana('')
  }

  const [orderLoading, setOrderLoading] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)

      // 1. Fetch the specific product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (productError) throw productError
      setProduct(productData)

      const { availableSizes } = parseProductSizes(productData)
      if (availableSizes.length > 0) {
        setSelectedSize(availableSizes[0])
      }

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
      console.error('Error fetching product details:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div class="flex min-h-screen items-center justify-center bg-slate-50">
        <div class="text-center space-y-2">
          <div class="h-10 w-10 animate-spin rounded-full border-4 border-rose-500 border-t-transparent mx-auto"></div>
          <p class="text-xs text-slate-400 font-bold">Loading...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <h3 class="text-xl font-bold text-slate-800">Product Not Found</h3>
        <Link to="/" class="mt-4 flex items-center gap-1 text-xs font-bold text-rose-500 hover:underline">
          <ArrowLeft size={14} /> Back to Homepage
        </Link>
      </div>
    )
  }

  // Safe destructuring of configurations
  const shopInfo = settings.shop_info || {
    name: 'Denim Vault BD',
    description: 'সেরা কোয়ালিটির ডেনিম ও ফ্যাশন পণ্য সাশ্রয়ী মূল্যে সরাসরি আপনার দ্বারে ক্যাশ অন ডেলিভারিতে পৌঁছে দেওয়াই আমাদের লক্ষ্য।',
    phone: '+8801700000000',
    email: 'info@denimvaultbd.com',
    address: 'ঢাকা, বাংলাদেশ'
  }
  const socialLinks = settings.social_links || {
    facebook: 'https://facebook.com/denimvaultbd',
    whatsapp: '+8801700000000'
  }
  const deliveryCharges = settings.delivery_charges || {
    inside_dhaka: 60,
    outside_dhaka: 120
  }

  // Sizing & Category breakdown
  const { cleanDescription, sizeStock, category: itemCategory, allSizes, availableSizes, isFreeDelivery, entryStock } = parseProductSizes(product)

  // Price & Stock logic
  const hasDiscount = product.discount_price && product.discount_price < product.price
  const unitPrice = product.discount_price || product.price
  const discountAmount = hasDiscount ? product.price - product.discount_price : 0

  const currentSizeStock = selectedSize && sizeStock[selectedSize] !== undefined
    ? Number(sizeStock[selectedSize])
    : product.stock

  const isOutOfStock = availableSizes.length > 0 ? availableSizes.length === 0 : product.stock <= 0
  const isSelectedSizeOutOfStock = selectedSize ? currentSizeStock <= 0 : isOutOfStock
  const isLowStock = currentSizeStock > 0 && currentSizeStock <= 5

  // Delivery charge calculation: 0 if isFreeDelivery is true, otherwise 120 Tk flat
  const currentDeliveryCharge = isFreeDelivery ? 0 : 120
  const subtotal = unitPrice * quantity
  const totalAmount = subtotal + currentDeliveryCharge

  // Converts Bengali digits to English and strips non-numeric characters
  const normalizeBangladeshiPhone = (input) => {
    if (!input) return ''
    const bnDigits = '০১২৩৪৫৬৭৮৯'
    let normalized = input.toString().replace(/[০-৯]/g, (d) => bnDigits.indexOf(d))
    normalized = normalized.replace(/[^0-9]/g, '')
    if (normalized.startsWith('880')) {
      normalized = normalized.slice(2)
    }
    return normalized
  }

  // Flexible Bangladeshi phone number validation
  const validatePhone = (num) => {
    const clean = normalizeBangladeshiPhone(num)
    return clean.length === 11 && clean.startsWith('01')
  }

  const getWhatsappLink = () => {
    const cleanNumber = socialLinks.whatsapp ? socialLinks.whatsapp.replace(/[^0-9]/g, '') : '8801700000000'
    
    // Translation items for WhatsApp message
    const header = t.whatsappMessageHeader
    const orderDetailsLabel = t.whatsappMessageOrderDetails
    const productLabel = lang === 'bn' ? 'পণ্য' : 'Product'
    const variantLabel = lang === 'bn' ? 'সাইজ/কালার' : 'Size/Color'
    const qtyLabel = lang === 'bn' ? 'পরিমাণ' : 'Quantity'
    const totalLabel = lang === 'bn' ? 'মোট বিল' : 'Total Bill'
    const shippingLabel = currentDeliveryCharge === 0
      ? (lang === 'bn' ? '(ফ্রি ডেলিভারি)' : '(Free Delivery)')
      : (lang === 'bn' ? '(ডেলিভারি চার্জ ১২০ টাকা সহ)' : '(Delivery charge 120 Tk included)')
    
    const customerInfoLabel = t.whatsappMessageCustomerInfo
    const nameLabel = lang === 'bn' ? 'নাম' : 'Name'
    const phoneLabel = lang === 'bn' ? 'মোবাইল' : 'Phone'
    const addressLabel = lang === 'bn' ? 'ঠিকানা' : 'Address'
    const notesLabel = lang === 'bn' ? 'নোট' : 'Notes'
    const confirmPrompt = t.whatsappMessageConfirmPrompt

    const sizeText = selectedSize ? `Size: ${selectedSize}` : ''
    const colorText = (selectedColors.length > 0 && productImages.length > 0)
      ? `${t.colorItem}: ${selectedColors.map(idx => `${t.colorItem} ${idx + 1}`).join(', ')}`
      : ''
    const variantParts = [sizeText, colorText].filter(Boolean)
    const variantText = variantParts.join(' | ')

    const formattedAddress = formatFullAddress({
      addressLine,
      thana,
      upazila,
      district,
      lang
    })

    const text = `${header}

${orderDetailsLabel}
-------------------------
${productLabel}: ${product.name}
${variantText ? `${variantLabel}: ${variantText}\n` : ''}${qtyLabel}: ${quantity} ${lang === 'bn' ? 'টি' : 'pcs'}
${totalLabel}: ৳${totalAmount} ${shippingLabel}

${customerInfoLabel}
-------------------------
${nameLabel}: ${name}
${phoneLabel}: ${phone}
${addressLabel}: ${formattedAddress}
${notes ? `${notesLabel}: ${notes}\n` : ''}
${confirmPrompt}`

    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`
  }

  const handleCheckout = async (e) => {
    if (e) e.preventDefault()
    setOrderError('')

    const cleanPhone = normalizeBangladeshiPhone(phone)

    // User-friendly validation
    if (!name.trim()) {
      setOrderError(lang === 'bn' ? 'আপনার সম্পূর্ণ নাম লিখুন' : 'Please enter your full name')
      return
    }
    if (!phone.trim()) {
      setOrderError(lang === 'bn' ? 'আপনার মোবাইল নাম্বার লিখুন' : 'Please enter your mobile number')
      return
    }
    if (!validatePhone(phone)) {
      setOrderError(lang === 'bn' ? 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)' : 'Please enter a valid 11-digit mobile number (e.g. 017XXXXXXXX)')
      return
    }
    if (!district) {
      setOrderError(lang === 'bn' ? 'অনুগ্রহ করে জেলা নির্বাচন করুন' : 'Please select your district')
      return
    }
    if (!thana && !upazila) {
      setOrderError(lang === 'bn' ? 'অনুগ্রহ করে আপনার থানা বা উপজেলা নির্বাচন করুন' : 'Please select your thana or upazila')
      return
    }
    if (!addressLine.trim()) {
      setOrderError(lang === 'bn' ? 'অনুগ্রহ করে বিস্তারিত ঠিকানা (বাসা নং, রোড নং, এলাকা) লিখুন' : 'Please enter your detailed address line')
      return
    }

    const formattedAddress = formatFullAddress({
      addressLine,
      thana,
      upazila,
      district,
      lang
    })
    
    // Size Selection Validation
    if (availableSizes.length > 0 && !selectedSize) {
      setOrderError(lang === 'bn' ? 'অনুগ্রহ করে অর্ডার করার জন্য একটি সাইজ নির্বাচন করুন' : 'Please select an available size before ordering')
      const sizeEl = document.getElementById('size-selector-area')
      if (sizeEl) sizeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    if (selectedSize && sizeStock[selectedSize] !== undefined && sizeStock[selectedSize] < quantity) {
      return setOrderError(
        lang === 'bn'
          ? `সাইজ ${selectedSize}-এর জন্য পর্যাপ্ত স্টক নেই। অনুগ্রহ করে কম পরিমাণ নির্বাচন করুন।`
          : `Insufficient stock for size ${selectedSize}. Please select a lower quantity.`
      )
    }

    if (product.stock < quantity) {
      return setOrderError(
        lang === 'bn'
          ? 'দুঃখিত, পর্যাপ্ত স্টক নেই। অনুগ্রহ করে কম পরিমাণ নির্বাচন করুন।'
          : 'Insufficient stock. Please select a lower quantity.'
      )
    }

    setOrderLoading(true)

    const orderVariantParts = []
    if (selectedSize) {
      orderVariantParts.push(`Size: ${selectedSize}`)
    }
    if (selectedColors.length > 0 && productImages.length > 0) {
      const colorLabels = selectedColors.map(idx => `${t.colorItem} ${idx + 1}`).join(', ')
      orderVariantParts.push(`${t.colorItem}: ${colorLabels}`)
    }
    const orderVariant = orderVariantParts.length > 0 ? orderVariantParts.join(' | ') : null

    try {
      // 1. Save order to Supabase
      const { error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            customer_name: name,
            phone: phone,
            address: formattedAddress,
            product_name: product.name,
            product_variant: orderVariant,
            quantity: quantity,
            total_price: totalAmount,
            status: 'pending',
            notes: notes || null
          }
        ])

      if (orderError) throw orderError

      // 1.1 Dispatch background push notification to Admin devices (PC & Mobile)
      fetch('/api/send-order-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name,
          phone: phone,
          address: formattedAddress,
          product_name: product.name,
          product_variant: orderVariant,
          quantity: quantity,
          total_price: totalAmount
        })
      }).catch((err) => console.warn('Push notification trigger failed:', err))

      // 2. Reduce product stock and specific size stock
      const updatedSizeStock = { ...sizeStock }
      if (selectedSize && updatedSizeStock[selectedSize] !== undefined) {
        updatedSizeStock[selectedSize] = Math.max(0, updatedSizeStock[selectedSize] - quantity)
      }
      const updatedDescription = encodeProductDescription(cleanDescription, updatedSizeStock, isFreeDelivery, entryStock)
      const newTotalStock = Math.max(0, product.stock - quantity)

      const { error: stockError } = await supabase
        .from('products')
        .update({
          stock: newTotalStock,
          description: updatedDescription
        })
        .eq('id', product.id)

      if (stockError) console.error('Error updating stock:', stockError)

      setProduct((prev) => ({
        ...prev,
        stock: newTotalStock,
        description: updatedDescription
      }))

      // Celebrate order success
      setOrderSuccess(true)
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })

      // Redirect to WhatsApp automatically
      const waUrl = getWhatsappLink()
      setTimeout(() => {
        window.open(waUrl, '_blank')
      }, 1500)
    } catch (err) {
      console.error(err)
      setOrderError(lang === 'bn' ? 'অর্ডারটি সম্পন্ন করা যায়নি।' : 'Failed to place the order.')
    } finally {
      setOrderLoading(false)
    }
  }

  const images = productImages.length > 0
    ? productImages
    : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80']

  return (
    <div class="min-h-screen bg-slate-50">
      <Header shopInfo={shopInfo} lang={lang} setLang={setLang} />

      <main class="mx-auto max-w-6xl px-4 py-8">
        {/* Back Link */}
        <Link to="/" class="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowLeft size={14} /> {t.backToHome}
        </Link>

        {/* Details Grid */}
        <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
          
          {/* Left Column: Image Gallery */}
          <div class="space-y-4">
            <div class="relative aspect-square overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-premium">
              {hasDiscount && (
                <div class="absolute left-4 top-4 z-10 flex flex-col items-center rounded-2xl bg-rose-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  <span>{t.discountLabel} ৳{Math.round(discountAmount)}</span>
                </div>
              )}
              <img
                src={images[activeImageIndex]}
                alt={product.name}
                class="h-full w-full object-cover"
              />
              {isOutOfStock && (
                <div class="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                  <span class="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-extrabold text-rose-600 shadow-lg">{t.outOfStock}</span>
                </div>
              )}
            </div>

            {/* Thumbnail selection list */}
            {images.length > 1 && (
              <div class="flex gap-3 overflow-x-auto py-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    class={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      activeImageIndex === idx ? 'border-rose-500 scale-95 shadow-md' : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={img} alt={`thumb ${idx}`} class="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Trust highlights */}
            <div class="hidden lg:grid grid-cols-3 gap-3 pt-6 border-t border-slate-200">
              <div class="flex items-center gap-2 rounded-2xl bg-white p-3 border border-slate-100 shadow-sm">
                <Truck size={18} className="text-rose-500" />
                <span class="text-[10px] font-bold text-slate-800">{t.fastDelivery}</span>
              </div>
              <div class="flex items-center gap-2 rounded-2xl bg-white p-3 border border-slate-100 shadow-sm">
                <ShieldCheck size={18} className="text-emerald-500" />
                <span class="text-[10px] font-bold text-slate-800">{t.packageCheck}</span>
              </div>
              <div class="flex items-center gap-2 rounded-2xl bg-white p-3 border border-slate-100 shadow-sm">
                <Check size={18} className="text-blue-500" />
                <span class="text-[10px] font-bold text-slate-800">{lang === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash On Delivery'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Info & Checkout Form */}
          <div class="space-y-6">
            
            {/* Product Meta */}
            <div class="rounded-3xl bg-white p-6 border border-slate-100 shadow-premium space-y-4">
              <div class="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full w-fit border border-slate-100">
                <Layers size={10} />
                {product.category}
              </div>
              <h1 class="text-2xl font-black text-slate-900 leading-tight md:text-3xl">{product.name}</h1>
              
              {/* Price Block */}
              <div class="flex items-baseline gap-4 pt-2">
                {hasDiscount ? (
                  <>
                    <span class="text-3xl font-black text-rose-600">৳{product.discount_price}</span>
                    <span class="text-sm text-slate-400 line-through">৳{product.price}</span>
                    <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                      {t.saveMoney.replace('{amount}', Math.round(discountAmount))}
                    </span>
                  </>
                ) : (
                  <span class="text-3xl font-black text-slate-900">৳{product.price}</span>
                )}
              </div>

              {/* Stock status & Free Delivery Badge */}
              <div className="flex flex-wrap items-center gap-2">
                {!isOutOfStock && (
                  <>
                    {isLowStock ? (
                      <span class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                        <AlertTriangle size={12} />
                        {t.lowStock.replace('{stock}', product.stock)}
                      </span>
                    ) : (
                      <span class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        {t.stockAvailable}
                      </span>
                    )}
                  </>
                )}
                {isFreeDelivery && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
                    <Truck size={13} className="text-emerald-600" />
                    {lang === 'bn' ? 'ফ্রি হোম ডেলিভারি' : 'Free Home Delivery'}
                  </span>
                )}
              </div>

              {/* Size Selection Section */}
              <div class="border-t border-slate-100 pt-4 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag size={13} className="text-rose-500" />
                    {t.selectSizeLabel}
                  </span>
                  {selectedSize && (
                    <span class="text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100">
                      {t.selectedSize} <span class="font-black text-rose-700">{selectedSize}</span>
                    </span>
                  )}
                </div>

                {/* Size buttons */}
                <div class="flex flex-wrap gap-2.5">
                  {allSizes.map((sz) => {
                    const qty = sizeStock[sz] !== undefined ? Number(sizeStock[sz]) : (hasConfiguredSizes ? 0 : product.stock)
                    const isAvail = qty > 0
                    const isSelected = selectedSize === sz

                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={!isAvail}
                        onClick={() => {
                          if (isAvail) {
                            setSelectedSize(sz)
                            setOrderError('')
                          }
                        }}
                        class={`relative min-w-[3.5rem] rounded-2xl px-4 py-2.5 text-xs font-black transition-all flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 ring-2 ring-rose-500 ring-offset-2 scale-105'
                            : isAvail
                            ? 'bg-white text-slate-800 border-2 border-slate-200 hover:border-rose-400 hover:text-rose-600 shadow-sm'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50 line-through'
                        }`}
                        title={isAvail ? `${sz}` : `${sz}: ${t.sizeOutOfStock}`}
                      >
                        <span class="text-sm font-black">{sz}</span>
                        <span class={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-rose-100' : isAvail ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isAvail ? (lang === 'bn' ? 'স্টক আছে' : 'In Stock') : t.sizeOutOfStock}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {availableSizes.length === 0 && (
                  <p class="text-xs font-bold text-rose-500 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                    {lang === 'bn' ? 'দুঃখিত, এই প্রোডাক্টের সকল সাইজ বর্তমানে স্টক আউট।' : 'Sorry, all sizes for this product are currently out of stock.'}
                  </p>
                )}
              </div>

              {/* Color Selection */}
              {productImages.length > 1 && (
                <div class="space-y-3 pt-2">
                  <div class="flex items-center justify-between flex-wrap gap-2">
                    <div class="flex items-center gap-1.5">
                      <Palette size={15} className="text-rose-500" />
                      <label class="block text-xs font-black uppercase tracking-wider text-slate-700">
                        {t.selectColorLabel}
                      </label>
                      <span class="text-[10px] text-slate-400 hidden sm:inline">
                        {t.multiColorHint}
                      </span>
                    </div>
                    {selectedColors.length > 0 && (
                      <span class="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100">
                        {t.colorsCountSelected.replace('{count}', selectedColors.length)}
                      </span>
                    )}
                  </div>

                  <div class="flex flex-wrap gap-3">
                    {productImages.map((img, idx) => {
                      const isSelected = selectedColors.includes(idx)
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleColor(idx)}
                          class={`group relative flex items-center gap-2.5 p-2 pr-3.5 rounded-2xl border-2 transition-all text-left ${
                            isSelected
                              ? 'border-rose-500 bg-rose-50/50 shadow-md ring-2 ring-rose-300 scale-105'
                              : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-slate-50 shadow-sm'
                          }`}
                        >
                          <div class="relative h-12 w-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100">
                            <img
                              src={img}
                              alt={`${t.colorItem} ${idx + 1}`}
                              class="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {isSelected && (
                              <div class="absolute inset-0 bg-rose-600/25 flex items-center justify-center">
                                <div class="h-5 w-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              </div>
                            )}
                          </div>
                          <div class="flex flex-col">
                            <span class={`text-xs font-black ${isSelected ? 'text-rose-700' : 'text-slate-800'}`}>
                              {t.colorItem} {idx + 1}
                            </span>
                            <span class={`text-[10px] ${isSelected ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                              {isSelected ? (lang === 'bn' ? 'সিলেক্টেড ✓' : 'Selected ✓') : (lang === 'bn' ? 'সিলেক্ট করতে ট্যাপ করুন' : 'Tap to select')}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="border-t border-slate-50 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.descriptionLabel}</h4>
                {cleanDescription ? (
                  <div
                    className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 prose prose-slate max-w-none 
                      [&_font[size='2']]:text-xs 
                      [&_font[size='3']]:text-sm 
                      [&_font[size='4']]:text-base 
                      [&_font[size='5']]:text-lg [&_font[size='5']]:font-bold 
                      [&_font[size='6']]:text-xl [&_font[size='6']]:font-black
                      [&_b]:font-bold [&_strong]:font-bold 
                      [&_i]:italic [&_em]:italic 
                      [&_u]:underline 
                      [&_ul]:list-disc [&_ul]:ml-4 
                      [&_ol]:list-decimal [&_ol]:ml-4"
                    dangerouslySetInnerHTML={{ __html: formatRichText(cleanDescription) }}
                  />
                ) : (
                  <p className="text-xs text-slate-500 md:text-sm leading-relaxed">{t.noDescription}</p>
                )}
              </div>
            </div>

            {/* Embedded Order Checkout Form */}
            <div id="checkout-form" class="scroll-mt-20 rounded-3xl bg-white p-6 border-2 border-rose-100 shadow-premium space-y-5 mb-16 md:mb-0">
              <div class="flex items-center gap-2 border-b border-slate-50 pb-3">
                <ShoppingBag size={20} className="text-rose-500" />
                <h3 class="text-base font-extrabold text-slate-900">{t.checkoutHeader}</h3>
              </div>

              {!orderSuccess ? (
                <form onSubmit={handleCheckout} noValidate class="space-y-4">
                  {orderError && (
                    <div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-600">
                      {orderError}
                    </div>
                  )}

                  {/* Customer Info inputs */}
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">{t.customerName}</label>
                    <input
                      type="text"
                      required
                      placeholder={t.customerNamePlaceholder}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none transition-all focus:border-rose-400"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">{t.customerPhone}</label>
                    <input
                      type="text"
                      required
                      placeholder={t.customerPhonePlaceholder}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none transition-all focus:border-rose-400"
                    />
                  </div>

                  {/* Structured Address Selection: জেলা, উপজেলা, থানা, এড্রেস লাইন */}
                  <div class="space-y-3 rounded-2xl bg-slate-50/70 p-3.5 border border-slate-200">
                    <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-0.5">
                      <MapPin size={14} className="text-rose-500" />
                      <span>{t.customerAddress}</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* জেলাঃ Dropdown */}
                      <div>
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">
                          {lang === 'bn' ? 'জেলা *' : 'District *'}
                        </label>
                        <select
                          required
                          value={district}
                          onChange={(e) => handleDistrictChange(e.target.value)}
                          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-rose-400 cursor-pointer"
                        >
                          <option value="">{t.customerDistrictPlaceholder}</option>
                          {allDistricts.map((d) => (
                            <option key={d.id} value={d.label}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* উপজেলাঃ Dropdown */}
                      <div>
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">
                          {lang === 'bn' ? 'উপজেলা *' : 'Upazila *'}
                        </label>
                        <select
                          required
                          disabled={!district}
                          value={upazila}
                          onChange={(e) => setUpazila(e.target.value)}
                          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-rose-400 disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                        >
                          <option value="">
                            {district ? t.customerUpazilaPlaceholder : t.selectDistrictFirst}
                          </option>
                          {availableUpazilas.map((u, i) => (
                            <option key={i} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* থানাঃ Dropdown */}
                      <div>
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">
                          {lang === 'bn' ? 'থানা *' : 'Thana *'}
                        </label>
                        <select
                          required
                          disabled={!district}
                          value={thana}
                          onChange={(e) => setThana(e.target.value)}
                          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-rose-400 disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                        >
                          <option value="">
                            {district ? t.customerThanaPlaceholder : t.selectDistrictFirst}
                          </option>
                          {availableThanas.map((th, i) => (
                            <option key={i} value={th.value}>
                              {th.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Address Line - Manual Entry */}
                    <div>
                      <label class="block text-[11px] font-bold text-slate-700 mb-1">
                        {t.addressLine}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t.addressLinePlaceholder}
                        value={addressLine}
                        onChange={(e) => setAddressLine(e.target.value)}
                        class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition-all focus:border-rose-400"
                      />
                    </div>
                  </div>

                  {/* Size selection in checkout form */}
                  {allSizes.length > 0 && (
                    <div id="size-selector-area" class="scroll-mt-24 space-y-2 rounded-2xl bg-slate-50/70 p-3.5 border border-slate-100">
                      <div class="flex items-center justify-between">
                        <label class="block text-xs font-bold text-slate-700">
                          {t.selectSizeLabel}
                        </label>
                        {selectedSize && (
                          <span class="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                            {t.selectedSize} {selectedSize}
                          </span>
                        )}
                      </div>
                      
                      <div class="flex flex-wrap gap-2">
                        {allSizes.map((sz) => {
                          const qty = sizeStock[sz] !== undefined ? Number(sizeStock[sz]) : (hasConfiguredSizes ? 0 : product.stock)
                          const isAvail = qty > 0
                          const isSelected = selectedSize === sz

                          return (
                            <button
                              key={sz}
                              type="button"
                              disabled={!isAvail}
                              onClick={() => {
                                if (isAvail) {
                                  setSelectedSize(sz)
                                  setOrderError('')
                                }
                              }}
                              class={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-rose-500 text-white shadow-md shadow-rose-200 ring-2 ring-rose-300'
                                  : isAvail
                                  ? 'bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600 border border-slate-200'
                                  : 'bg-slate-100 text-slate-300 border border-slate-100 cursor-not-allowed line-through opacity-60'
                              }`}
                            >
                              <span>{sz}</span>
                              {!isAvail && (
                                <span class="text-[9px] text-slate-400">({t.sizeOutOfStock})</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Color selection in checkout form */}
                  {productImages.length > 1 && (
                    <div class="space-y-2 rounded-2xl bg-slate-50/70 p-3.5 border border-slate-100">
                      <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex items-center gap-1.5">
                          <Palette size={13} className="text-rose-500" />
                          <label class="block text-xs font-bold text-slate-700">
                            {t.selectColorLabel}
                          </label>
                          <span class="text-[10px] text-slate-400 hidden sm:inline">
                            {t.multiColorHint}
                          </span>
                        </div>
                        {selectedColors.length > 0 && (
                          <span class="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            {t.colorsCountSelected.replace('{count}', selectedColors.length)}
                          </span>
                        )}
                      </div>

                      <div class="flex flex-wrap gap-2 pt-1">
                        {productImages.map((img, idx) => {
                          const isSelected = selectedColors.includes(idx)
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => toggleColor(idx)}
                              class={`group relative flex items-center gap-2 p-1.5 pr-3 rounded-xl border-2 transition-all text-left ${
                                isSelected
                                  ? 'border-rose-500 bg-rose-50/50 shadow-sm ring-1 ring-rose-300'
                                  : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-slate-50/60'
                              }`}
                            >
                              <div class="relative h-11 w-11 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100">
                                <img
                                  src={img}
                                  alt={`${t.colorItem} ${idx + 1}`}
                                  class="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                />
                                {isSelected && (
                                  <div class="absolute inset-0 bg-rose-600/20 flex items-center justify-center">
                                    <div class="h-4 w-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow">
                                      <Check size={10} strokeWidth={3} />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div class="flex flex-col">
                                <span class={`text-xs font-bold ${isSelected ? 'text-rose-700' : 'text-slate-700'}`}>
                                  {t.colorItem} {idx + 1}
                                </span>
                                <span class={`text-[9px] ${isSelected ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                                  {isSelected ? (lang === 'bn' ? 'সিলেক্টেড ✓' : 'Selected ✓') : (lang === 'bn' ? 'ট্যাপ করুন' : 'Tap to select')}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">{t.quantity}</label>
                      {selectedColors.length > 1 && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                          {lang === 'bn' ? `${selectedColors.length}টি কালার সিলেক্টেড (${selectedColors.length}টি পণ্য)` : `${selectedColors.length} colors selected (${selectedColors.length} items)`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden max-w-[140px]">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(Math.max(1, selectedColors.length), quantity - 1))}
                        className="px-3.5 py-2 bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center text-xs font-bold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(currentSizeStock || product.stock, quantity + 1))}
                        className="px-3.5 py-2 bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Delivery Information Banner */}
                  <div className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                    isFreeDelivery
                      ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900'
                      : 'border-slate-200 bg-slate-50/80 text-slate-700'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isFreeDelivery ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                      }`}>
                        <Truck size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          {isFreeDelivery 
                            ? (lang === 'bn' ? 'ফ্রি ডেলিভারি!' : 'Free Delivery!')
                            : (lang === 'bn' ? 'সারাদেশে হোম ডেলিভারি' : 'Nationwide Home Delivery')}
                          {isFreeDelivery && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700">
                              SPECIAL
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {isFreeDelivery
                            ? (lang === 'bn' ? 'এই পণ্যের সাথে সারা বাংলাদেশে ডেলিভারি ফ্রি' : 'Free delivery across Bangladesh')
                            : (lang === 'bn' ? 'ক্যাশ অন ডেলিভারি (পণ্য চেক করে পরিশোধ)' : 'Cash on Delivery')}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-black ${isFreeDelivery ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {isFreeDelivery ? (lang === 'bn' ? 'ফ্রি (৳০)' : 'Free (৳0)') : '৳১২০'}
                    </span>
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">{t.orderNotes}</label>
                    <input
                      type="text"
                      placeholder={t.orderNotesPlaceholder}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
                    />
                  </div>

                  {/* Calculations */}
                  <div class="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-xs space-y-2">
                    <div class="flex justify-between text-slate-500">
                      <span>{t.subtotal} {quantity > 1 ? `(${quantity} ${lang === 'bn' ? 'টি পণ্য' : 'items'})` : ''}</span>
                      <span className="font-bold text-slate-800">৳{subtotal}</span>
                    </div>
                    <div class="flex justify-between text-slate-500">
                      <span>{t.deliveryCharge}</span>
                      <span className={currentDeliveryCharge === 0 ? "font-bold text-emerald-600" : ""}>
                        {currentDeliveryCharge === 0 ? (lang === 'bn' ? 'ফ্রি (৳০)' : 'Free (৳0)') : `৳${currentDeliveryCharge}`}
                      </span>
                    </div>
                    <div class="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-800 text-sm">
                      <span>{t.totalBill}</span>
                      <span class="text-rose-600">৳{totalAmount}</span>
                    </div>
                  </div>

                  {/* Error banner displayed right above submit button for mobile view */}
                  {orderError && (
                    <div id="checkout-error-banner" class="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs font-bold text-rose-700 flex items-center gap-2 shadow-xs">
                      <AlertCircle size={16} className="shrink-0 text-rose-500" />
                      <span>{orderError}</span>
                    </div>
                  )}

                  {/* Submit Order */}
                  <button
                    type="submit"
                    disabled={orderLoading || isOutOfStock}
                    class={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white shadow-lg transition-all ${
                      isOutOfStock
                        ? 'bg-slate-300 shadow-none cursor-not-allowed pointer-events-none'
                        : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-[0.98]'
                    }`}
                  >
                    {orderLoading ? t.confirmOrderProcessing : isOutOfStock ? t.outOfStock : t.confirmOrderBtn}
                  </button>
                </form>
              ) : (
                /* Success Order screen */
                <div class="py-6 text-center space-y-5">
                  <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check size={32} className="stroke-[3]" />
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-slate-900">{t.orderSuccessTitle}</h3>
                    <p class="mx-auto mt-1 max-w-xs text-[11px] text-slate-500 leading-relaxed">
                      {t.orderSuccessDesc}
                    </p>
                  </div>

                  {/* Success details summary */}
                  <div class="mx-auto max-w-sm rounded-xl bg-slate-50 p-4 border border-slate-100 text-left text-xs space-y-1.5">
                    <p class="font-bold text-slate-700">{t.orderDetails}</p>
                    <div class="flex justify-between text-slate-500">
                      <span>{t.productLabel}</span>
                      <span class="font-bold text-slate-800">{product.name}</span>
                    </div>
                    {selectedSize && (
                      <div class="flex justify-between text-slate-500">
                        <span>{t.selectedSize}</span>
                        <span class="font-bold text-rose-600">{selectedSize}</span>
                      </div>
                    )}
                    {selectedColors.length > 0 && productImages.length > 1 && (
                      <div class="flex justify-between text-slate-500">
                        <span>{t.selectedColor}</span>
                        <span class="font-bold text-rose-600">
                          {selectedColors.map(idx => `${t.colorItem} ${idx + 1}`).join(', ')}
                        </span>
                      </div>
                    )}
                    <div class="flex justify-between text-slate-500">
                      <span>{t.quantity}:</span>
                      <span class="font-bold text-slate-800">{quantity} {lang === 'bn' ? 'টি' : 'items'}</span>
                    </div>
                    <div class="flex justify-between text-slate-500">
                      <span>{t.mobileLabel}</span>
                      <span class="font-bold text-slate-800">{phone}</span>
                    </div>
                    <div class="flex justify-between text-slate-500">
                      <span>{t.totalLabel}</span>
                      <span class="font-bold text-rose-600">৳{totalAmount}</span>
                    </div>
                  </div>

                  {/* WhatsApp send button */}
                  <div class="mx-auto max-w-sm">
                    <a
                      href={getWhatsappLink()}
                      target="_blank"
                      rel="noreferrer"
                      class="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-center text-sm font-bold text-white shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all hover:shadow-emerald-200"
                    >
                      <MessageSquare size={16} />
                      {t.confirmWhatsappBtn}
                    </a>
                    <p class="text-[9px] text-slate-400 mt-2 font-medium">
                      {t.confirmWhatsappDesc}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </main>

      <Footer shopInfo={shopInfo} socialLinks={socialLinks} lang={lang} />
      <FloatingWidgets socialLinks={socialLinks} targetHref="#checkout-form" buttonText={lang === 'bn' ? 'এখনই অর্ডার করুন' : 'Order Now'} lang={lang} />
    </div>
  )
}

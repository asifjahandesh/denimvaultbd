import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FloatingWidgets from '../components/FloatingWidgets'
import { ArrowLeft, ShoppingBag, ShieldCheck, Truck, Check, MessageSquare, AlertTriangle, Layers, Tag, MapPin, Palette, AlertCircle, Plus, Trash2 } from 'lucide-react'
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

  // Independent multi-item order state (each item can have its own color, size, and quantity)
  const [orderItems, setOrderItems] = useState([
    { id: 1, colorIndex: 0, size: '', quantity: 1 }
  ])

  // Total quantity is strictly the sum of all item quantities
  const quantity = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
  }, [orderItems])

  const handleAddItem = (preferredColorIdx = 0) => {
    let nextColorIdx = preferredColorIdx
    if (productImages.length > 1) {
      const usedColors = orderItems.map((i) => i.colorIndex)
      const unused = productImages.map((_, i) => i).find((i) => !usedColors.includes(i))
      if (unused !== undefined) nextColorIdx = unused
    }
    const { availableSizes } = product ? parseProductSizes(product) : { availableSizes: [] }
    const newItem = {
      id: Date.now() + Math.random(),
      colorIndex: nextColorIdx,
      size: availableSizes.length > 0 ? availableSizes[0] : '',
      quantity: 1
    }
    setOrderItems((prev) => [...prev, newItem])
    setActiveImageIndex(nextColorIdx)
    setOrderError('')
  }

  const handleRemoveItem = (itemId) => {
    if (orderItems.length <= 1) return
    setOrderItems((prev) => prev.filter((i) => i.id !== itemId))
    setOrderError('')
  }

  const handleItemQuantityChange = (itemId, newQty) => {
    const clamped = Math.max(1, parseInt(newQty, 10) || 1)
    setOrderItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: clamped } : i))
    )
    setOrderError('')
  }

  const handleItemSizeChange = (itemId, newSize) => {
    setOrderItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, size: newSize } : i))
    )
    setOrderError('')
  }

  const handleItemColorChange = (itemId, newColorIdx) => {
    setOrderItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, colorIndex: newColorIdx } : i))
    )
    setActiveImageIndex(newColorIdx)
  }

  const handleToggleColorFromPalette = (colorIdx) => {
    setActiveImageIndex(colorIdx)
    const { availableSizes } = product ? parseProductSizes(product) : { availableSizes: [] }
    const existingIndex = orderItems.findIndex((item) => item.colorIndex === colorIdx)
    if (existingIndex !== -1) {
      if (orderItems.length > 1) {
        setOrderItems((prev) => prev.filter((_, idx) => idx !== existingIndex))
      }
    } else {
      setOrderItems((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          colorIndex: colorIdx,
          size: availableSizes.length > 0 ? availableSizes[0] : '',
          quantity: 1
        }
      ])
    }
    setOrderError('')
  }

  // Checkout Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [district, setDistrict] = useState('')
  const [upazila, setUpazila] = useState('')
  const [thana, setThana] = useState('')
  const [addressLine, setAddressLine] = useState('')
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
        setOrderItems([
          { id: 1, colorIndex: 0, size: availableSizes[0], quantity: 1 }
        ])
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
  const hasConfiguredSizes = allSizes && allSizes.length > 0

  // Price & Stock logic
  const hasDiscount = product.discount_price && product.discount_price < product.price
  const unitPrice = product.discount_price || product.price
  const discountAmount = hasDiscount ? product.price - product.discount_price : 0

  const isOutOfStock = availableSizes.length > 0 ? availableSizes.length === 0 : product.stock <= 0
  const isLowStock = product.stock > 0 && product.stock <= 5

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

    // Itemized variant breakdown
    const itemsDescription = orderItems
      .map((item, idx) => {
        const itemColor = productImages.length > 1 ? `${t.colorItem} ${item.colorIndex + 1}` : ''
        const itemSize = item.size ? `Size: ${item.size}` : ''
        const itemQty = Number(item.quantity) || 1
        const qtySuffix = itemQty > 1 ? ` × ${itemQty} ${lang === 'bn' ? 'টি' : 'pcs'}` : ''
        const itemSpec = [itemColor, itemSize].filter(Boolean).join(', ')
        return `• ${orderItems.length > 1 ? `${t.itemLabel || (lang === 'bn' ? 'আইটেম' : 'Item')} ${idx + 1}: ` : ''}${itemSpec || (lang === 'bn' ? 'পণ্য' : 'Item')}${qtySuffix}`
      })
      .join('\n')

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
${itemsDescription ? `${variantLabel}:\n${itemsDescription}\n` : ''}${qtyLabel}: ${quantity} ${lang === 'bn' ? 'টি' : 'pcs'}
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
    
    // Size Selection Validation for all items
    if (availableSizes.length > 0) {
      const missingSizeItem = orderItems.find((item) => !item.size)
      if (missingSizeItem) {
        setOrderError(lang === 'bn' ? 'অনুগ্রহ করে প্রতিটি আইটেমের জন্য সাইজ নির্বাচন করুন' : 'Please select a size for each item')
        const sizeEl = document.getElementById('checkout-form')
        if (sizeEl) sizeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    }

    // Check stock per size
    const sizeCounts = {}
    orderItems.forEach((item) => {
      if (item.size) {
        const itemQty = Number(item.quantity) || 1
        sizeCounts[item.size] = (sizeCounts[item.size] || 0) + itemQty
      }
    })

    for (const [sz, neededQty] of Object.entries(sizeCounts)) {
      if (sizeStock[sz] !== undefined && sizeStock[sz] < neededQty) {
        return setOrderError(
          lang === 'bn'
            ? `সাইজ ${sz}-এর পর্যাপ্ত স্টক নেই (প্রয়োজন: ${neededQty}টি, মওজুদ: ${sizeStock[sz]}টি)।`
            : `Insufficient stock for size ${sz} (needed: ${neededQty}, available: ${sizeStock[sz]}).`
        )
      }
    }

    if (product.stock < quantity) {
      return setOrderError(
        lang === 'bn'
          ? 'দুঃখিত, পর্যাপ্ত স্টক নেই। অনুগ্রহ করে কম পরিমাণ নির্বাচন করুন।'
          : 'Insufficient stock. Please select a lower quantity.'
      )
    }

    setOrderLoading(true)

    // Construct clear variant breakdown for database & invoice
    const orderVariant = orderItems
      .map((item, idx) => {
        const itemColor = productImages.length > 1 ? `${t.colorItem} ${item.colorIndex + 1}` : ''
        const itemSize = item.size ? `Size: ${item.size}` : ''
        const itemQty = Number(item.quantity) || 1
        const qtySuffix = itemQty > 1 ? ` × ${itemQty}` : ''
        const parts = [itemColor, itemSize].filter(Boolean).join(', ')
        const fullItem = `${parts || (lang === 'bn' ? 'আইটেম' : 'Item')}${qtySuffix}`
        return orderItems.length > 1 ? `${t.itemLabel || (lang === 'bn' ? 'আইটেম' : 'Item')} ${idx + 1}: ${fullItem}` : fullItem
      })
      .join(' + ')

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
      Object.entries(sizeCounts).forEach(([sz, count]) => {
        if (updatedSizeStock[sz] !== undefined) {
          updatedSizeStock[sz] = Math.max(0, updatedSizeStock[sz] - count)
        }
      })
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
                  {orderItems[0]?.size && (
                    <span class="text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100">
                      {t.selectedSize} <span class="font-black text-rose-700">{orderItems[0].size}</span>
                    </span>
                  )}
                </div>

                {/* Size buttons */}
                <div class="flex flex-wrap gap-2.5">
                  {allSizes.map((sz) => {
                    const qty = sizeStock[sz] !== undefined ? Number(sizeStock[sz]) : (hasConfiguredSizes ? 0 : product.stock)
                    const isAvail = qty > 0
                    const isSelected = orderItems[0]?.size === sz

                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={!isAvail}
                        onClick={() => {
                          if (isAvail && orderItems[0]) {
                            handleItemSizeChange(orderItems[0].id, sz)
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
                    {orderItems.length > 0 && (
                      <span class="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100">
                        {quantity} {quantity > 1 ? (lang === 'bn' ? 'টি পণ্য সিলেক্টেড' : 'items selected') : (lang === 'bn' ? '১টি পণ্য' : '1 item')}
                      </span>
                    )}
                  </div>

                  <div class="flex flex-wrap gap-3">
                    {productImages.map((img, idx) => {
                      const isSelected = orderItems.some((i) => i.colorIndex === idx)
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleColorFromPalette(idx)}
                          class={`group relative flex items-center gap-2.5 p-2 pr-3.5 rounded-2xl border-2 transition-all text-left cursor-pointer ${
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

                  {/* Order Items Builder: Per-item Size and Color selector */}
                  <div className="space-y-3 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                        <Layers size={14} className="text-rose-500" />
                        <span>{t.orderItemsTitle || (lang === 'bn' ? 'অর্ডারের আইটেমসমূহ (সাইজ ও কালার নির্বাচন করুন)' : 'Order Items (Select Size & Color)')}</span>
                      </div>
                      <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                        {quantity} {lang === 'bn' ? 'টি মোট পণ্য' : 'total items'}
                      </span>
                    </div>

                    {/* Per-item cards */}
                    <div className="space-y-2.5">
                      {orderItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border-2 border-rose-100 bg-white p-3.5 shadow-xs transition-all hover:border-rose-200 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2.5">
                              {productImages.length > 0 && (
                                <img
                                  src={productImages[item.colorIndex] || productImages[0]}
                                  alt=""
                                  className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              )}
                              <div>
                                <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                  <span>{t.itemLabel || (lang === 'bn' ? 'আইটেম' : 'Item')} {idx + 1}:</span>
                                  {productImages.length > 1 && (
                                    <span className="text-rose-600 font-bold">
                                      {t.colorItem} {item.colorIndex + 1}
                                    </span>
                                  )}
                                  {(Number(item.quantity) || 1) > 1 && (
                                    <span className="rounded-md bg-rose-100 px-1.5 py-0.2 text-[10px] font-black text-rose-700">
                                      ×{item.quantity}
                                    </span>
                                  )}
                                </p>
                                {item.size ? (
                                  <p className="text-[10px] text-slate-500 font-medium">
                                    {t.selectedSize} <strong className="text-rose-600 font-black">{item.size}</strong>
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-amber-600 font-bold">
                                    {lang === 'bn' ? 'অনুগ্রহ করে নিচে সাইজ সিলেক্ট করুন' : 'Please select size below'}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Color changer for this specific item if multiple colors */}
                              {productImages.length > 1 && (
                                <select
                                  value={item.colorIndex}
                                  onChange={(e) => handleItemColorChange(item.id, Number(e.target.value))}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 outline-none hover:border-slate-300 cursor-pointer"
                                >
                                  {productImages.map((_, cIdx) => (
                                    <option key={cIdx} value={cIdx}>
                                      {t.colorItem} {cIdx + 1}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {/* Remove button if more than 1 item */}
                              {orderItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="rounded-lg border border-slate-200 p-1 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                  title={t.removeItem || 'Remove item'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Size Selection Pills for this Item */}
                          {allSizes.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  {t.selectSizeLabel}:
                                </span>
                                {item.size && (
                                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                                    {item.size} ✓
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {allSizes.map((sz) => {
                                  const qty = sizeStock[sz] !== undefined ? Number(sizeStock[sz]) : (hasConfiguredSizes ? 0 : product.stock)
                                  const isAvail = qty > 0
                                  const isSelected = item.size === sz

                                  return (
                                    <button
                                      key={sz}
                                      type="button"
                                      disabled={!isAvail}
                                      onClick={() => handleItemSizeChange(item.id, sz)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                                        isSelected
                                          ? 'bg-rose-500 text-white shadow-md shadow-rose-200 ring-2 ring-rose-400'
                                          : isAvail
                                          ? 'bg-slate-50 text-slate-700 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 shadow-2xs'
                                          : 'bg-slate-100 text-slate-300 border border-slate-100 cursor-not-allowed line-through opacity-40'
                                      }`}
                                    >
                                      <span>{sz}</span>
                                      {!isAvail && <span className="text-[8px]">({t.sizeOutOfStock})</span>}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Quantity Stepper for this Item */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[11px] font-bold text-slate-700">
                              {lang === 'bn' ? 'পরিমাণ (Qty):' : 'Quantity (Qty):'}
                            </span>
                            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50/70 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleItemQuantityChange(item.id, Math.max(1, (item.quantity || 1) - 1))}
                                className="w-7 h-7 flex items-center justify-center bg-white text-slate-700 font-bold hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer border-r border-slate-200 text-xs active:scale-95"
                              >
                                -
                              </button>
                              <span className="w-9 text-center text-xs font-black text-slate-800 select-none">
                                {item.quantity || 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleItemQuantityChange(item.id, (item.quantity || 1) + 1)}
                                className="w-7 h-7 flex items-center justify-center bg-white text-slate-700 font-bold hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer border-l border-slate-200 text-xs active:scale-95"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Another Item Button */}
                    <button
                      type="button"
                      onClick={() => handleAddItem(0)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50/40 hover:bg-rose-50 text-xs font-bold text-rose-600 transition-all hover:border-rose-400 active:scale-[0.99] shadow-2xs cursor-pointer"
                    >
                      <Plus size={15} className="text-rose-500 stroke-[2.5]" />
                      <span>{t.addAnotherItemBtn || (lang === 'bn' ? '+ ভিন্ন সাইজ বা কালারের আরেকটি আইটেম যোগ করুন' : '+ Add Another Item with Different Size/Color')}</span>
                    </button>
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
                    {orderItems && orderItems.length > 0 && (
                      <div className="border-t border-b border-slate-200/60 py-1.5 space-y-1">
                        {orderItems.map((item, idx) => (
                          <div key={item.id || idx} className="flex justify-between text-slate-600 font-medium">
                            <span>
                              {orderItems.length > 1 ? `${t.itemLabel || (lang === 'bn' ? 'আইটেম' : 'Item')} ${idx + 1}` : (lang === 'bn' ? 'সিলেক্টেড আইটেম' : 'Selected Item')}
                              {productImages.length > 1 ? ` (${t.colorItem || (lang === 'bn' ? 'কালার' : 'Color')} ${item.colorIndex + 1})` : ''}
                              {(Number(item.quantity) || 1) > 1 ? ` × ${item.quantity}` : ''}
                            </span>
                            <span className="font-bold text-rose-600">
                              {item.size ? `${lang === 'bn' ? 'সাইজ' : 'Size'}: ${item.size}` : ''}
                            </span>
                          </div>
                        ))}
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

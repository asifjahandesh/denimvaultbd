import React, { useState, useMemo } from 'react'
import { Check, ShoppingBag, X, MessageSquare, Tag, MapPin, Palette, Truck, AlertCircle, Plus, Trash2, Layers } from 'lucide-react'
import { supabase } from '../supabase'
import { translations } from '../utils/translations'
import confetti from 'canvas-confetti'
import {
  ITEM_CATEGORIES,
  getCategorySizes,
  parseProductSizes,
  encodeProductDescription
} from '../utils/productSizes'
import {
  getAllDistricts,
  getUpazilasForDistrict,
  getThanasForDistrict,
  isDhakaDistrict,
  formatFullAddress
} from '../utils/bangladeshGeo'

export default function CheckoutModal({ product, onClose, deliveryCharges, whatsappNumber, lang = 'bn' }) {
  const {
    cleanDescription,
    sizeStock,
    category: itemCategory,
    allSizes,
    availableSizes,
    hasConfiguredSizes,
    isFreeDelivery,
    entryStock
  } = parseProductSizes(product)

  const productImages = useMemo(() => {
    if (product?.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      return product.image_urls
    }
    if (product?.image_url) {
      return [product.image_url]
    }
    return []
  }, [product])

  const initialDefaultSize = availableSizes.length > 0 ? availableSizes[0] : ''

  // Per-item configuration: [{ id, colorIndex, size, quantity }]
  const [orderItems, setOrderItems] = useState([
    {
      id: 1,
      colorIndex: 0,
      size: initialDefaultSize,
      quantity: 1
    }
  ])

  // Total quantity equals the sum of quantities of all items
  const quantity = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
  }, [orderItems])

  const handleAddItem = (colorIdx = 0) => {
    setOrderItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        colorIndex: colorIdx,
        size: initialDefaultSize,
        quantity: 1
      }
    ])
    setError('')
  }

  const handleRemoveItem = (itemId) => {
    if (orderItems.length <= 1) return
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId))
    setError('')
  }

  const handleItemQuantityChange = (itemId, newQty) => {
    const clamped = Math.max(1, parseInt(newQty, 10) || 1)
    setOrderItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity: clamped } : item))
    )
    setError('')
  }

  const handleItemSizeChange = (itemId, newSize) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, size: newSize } : item))
    )
    setError('')
  }

  const handleItemColorChange = (itemId, newColorIdx) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, colorIndex: newColorIdx } : item))
    )
    setError('')
  }

  const handleToggleColorFromPalette = (idx) => {
    setOrderItems((prev) => {
      const exists = prev.some((it) => it.colorIndex === idx)
      if (exists) {
        if (prev.length > 1) {
          const lastIndex = prev.map((it) => it.colorIndex).lastIndexOf(idx)
          return prev.filter((_, i) => i !== lastIndex)
        }
        return prev
      } else {
        return [
          ...prev,
          {
            id: Date.now() + Math.random(),
            colorIndex: idx,
            size: initialDefaultSize,
            quantity: 1
          }
        ]
      }
    })
    setError('')
  }

  const selectedColorIndices = useMemo(() => {
    return Array.from(new Set(orderItems.map((it) => it.colorIndex)))
  }, [orderItems])

  const sizeCounts = useMemo(() => {
    const counts = {}
    orderItems.forEach((it) => {
      if (it.size) {
        counts[it.size] = (counts[it.size] || 0) + (Number(it.quantity) || 1)
      }
    })
    return counts
  }, [orderItems])

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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const t = translations[lang]

  // Delivery charge calculation: 0 if isFreeDelivery is true, otherwise 120 Tk flat
  const currentDeliveryCharge = isFreeDelivery ? 0 : 120

  // Price & Stock calculations
  const unitPrice = product.discount_price || product.price
  const subtotal = unitPrice * quantity
  const totalAmount = subtotal + currentDeliveryCharge

  const currentSizeStock = selectedSize && sizeStock[selectedSize] !== undefined
    ? Number(sizeStock[selectedSize])
    : product.stock

  // Converts Bengali digits to English and strips spaces/symbols
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

  // Construct WhatsApp pre-filled link
  const getWhatsappLink = () => {
    const cleanNumber = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, '') : '8801700000000'
    
    // Translation items for WhatsApp message
    const header = t.whatsappMessageHeader
    const orderDetailsLabel = t.whatsappMessageOrderDetails
    const productLabel = lang === 'bn' ? 'পণ্য' : 'Product'
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

    // Itemized breakdown for WhatsApp
    const itemsLines = orderItems.map((item, idx) => {
      const colorLabel = productImages.length > 1 ? `${t.colorItem} ${item.colorIndex + 1}` : ''
      const sizeLabel = item.size ? `Size: ${item.size}` : ''
      const itemQty = Number(item.quantity) || 1
      const qtySuffix = itemQty > 1 ? ` × ${itemQty} ${lang === 'bn' ? 'টি' : 'pcs'}` : ''
      const itemDesc = [colorLabel, sizeLabel].filter(Boolean).join(', ')
      return `• ${orderItems.length > 1 ? `${t.itemLabel || (lang === 'bn' ? 'আইটেম' : 'Item')} ${idx + 1}: ` : ''}${itemDesc || (lang === 'bn' ? 'পণ্য' : 'Item')}${qtySuffix}`
    }).join('\n')

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
${itemsLines}
${qtyLabel}: ${quantity} ${lang === 'bn' ? 'টি' : 'pcs'}
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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setError('')

    const cleanPhone = normalizeBangladeshiPhone(phone)

    // User-friendly validations
    if (!name.trim()) return setError(lang === 'bn' ? 'আপনার সম্পূর্ণ নাম লিখুন' : 'Please enter your full name')
    if (!phone.trim()) return setError(lang === 'bn' ? 'আপনার মোবাইল নাম্বার লিখুন' : 'Please enter your mobile number')
    if (!validatePhone(phone)) return setError(lang === 'bn' ? 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)' : 'Please enter a valid 11-digit mobile number (e.g. 017XXXXXXXX)')
    if (!district) return setError(lang === 'bn' ? 'অনুগ্রহ করে জেলা নির্বাচন করুন' : 'Please select your district')
    if (!thana && !upazila) return setError(lang === 'bn' ? 'অনুগ্রহ করে আপনার থানা বা উপজেলা নির্বাচন করুন' : 'Please select your thana or upazila')
    if (!addressLine.trim()) return setError(lang === 'bn' ? 'অনুগ্রহ করে বিস্তারিত ঠিকানা (বাসা নং, রোড নং, এলাকা) লিখুন' : 'Please enter your detailed address line')

    const formattedAddress = formatFullAddress({
      addressLine,
      thana,
      upazila,
      district,
      lang
    })
    
    // Size Selection Validation for all items
    if (availableSizes.length > 0) {
      const missingSizeItem = orderItems.find((it) => !it.size)
      if (missingSizeItem) {
        return setError(t.pleaseSelectSize || 'Please select an available size for all items')
      }
    }

    // Stock check per size
    for (const [sz, reqCount] of Object.entries(sizeCounts)) {
      if (sizeStock[sz] !== undefined && sizeStock[sz] < reqCount) {
        return setError(
          lang === 'bn'
            ? `সাইজ ${sz}-এর পর্যাপ্ত স্টক নেই (মজুদ: ${sizeStock[sz]}টি, নির্বাচিত: ${reqCount}টি)।`
            : `Insufficient stock for size ${sz} (Available: ${sizeStock[sz]}, Selected: ${reqCount}).`
        )
      }
    }

    if (product.stock < quantity) {
      return setError(
        lang === 'bn'
          ? 'দুঃখিত, পর্যাপ্ত স্টক নেই। অনুগ্রহ করে কম পরিমাণ নির্বাচন করুন।'
          : 'Insufficient stock. Please select a lower quantity.'
      )
    }

    setLoading(true)

    // Formatted multi-item variant breakdown
    const orderVariant = orderItems.map((item, idx) => {
      const colorLabel = productImages.length > 1 ? `${t.colorItem} ${item.colorIndex + 1}` : ''
      const sizeLabel = item.size ? `Size: ${item.size}` : ''
      const itemQty = Number(item.quantity) || 1
      const qtySuffix = itemQty > 1 ? ` × ${itemQty}` : ''
      const specs = [colorLabel, sizeLabel ? `(${sizeLabel})` : ''].filter(Boolean).join(' ')
      const itemText = `${specs || (lang === 'bn' ? 'আইটেম' : 'Item')}${qtySuffix}`
      return orderItems.length > 1 ? `${t.itemLabel || (lang === 'bn' ? 'আইটেম' : 'Item')} ${idx + 1}: ${itemText}` : itemText
    }).join(' + ')

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
      for (const [sz, reqCount] of Object.entries(sizeCounts)) {
        if (updatedSizeStock[sz] !== undefined) {
          updatedSizeStock[sz] = Math.max(0, updatedSizeStock[sz] - reqCount)
        }
      }
      const updatedDescription = encodeProductDescription(cleanDescription, updatedSizeStock, isFreeDelivery, entryStock)

      const { error: stockError } = await supabase
        .from('products')
        .update({
          stock: Math.max(0, product.stock - quantity),
          description: updatedDescription
        })
        .eq('id', product.id)

      if (stockError) console.error('Error updating stock:', stockError)

      // 3. Success state
      setSuccess(true)
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })

      // 4. Try auto-redirecting to WhatsApp
      const waUrl = getWhatsappLink()
      setTimeout(() => {
        window.open(waUrl, '_blank')
      }, 1500)
    } catch (err) {
      console.error(err)
      setError(lang === 'bn' ? 'অর্ডার সম্পন্ন করতে সমস্যা হয়েছে।' : 'Failed to place the order.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div class="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl md:max-w-2xl">
        {/* Header */}
        <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div class="flex items-center gap-2">
            <ShoppingBag size={20} className="text-rose-500" />
            <h2 class="text-lg font-bold text-slate-800">{lang === 'bn' ? 'অর্ডার ফর্ম পূরণ করুন' : 'Fill Checkout Details'}</h2>
          </div>
          <button
            onClick={onClose}
            class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div class="max-h-[80vh] overflow-y-auto p-6">
          {!success ? (
            <form onSubmit={handleSubmit} noValidate class="space-y-5">
              {/* Product Info Summary */}
              <div class="flex gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <img
                  src={(selectedColors.length > 0 && productImages[selectedColors[0]]) || product.image_urls?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80'}
                  alt={product.name}
                  class="h-16 w-16 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <h4 class="text-sm font-bold text-slate-800 leading-snug">{product.name}</h4>
                  <p class="mt-1 text-xs text-slate-400">{lang === 'bn' ? `প্রতি পিসের মূল্য: ৳${unitPrice}` : `Price per piece: ৳${unitPrice}`}</p>
                  <p class={`mt-1 text-xs font-semibold ${product.stock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {product.stock > 0 ? t.stockAvailable : t.outOfStock}
                  </p>
                </div>
              </div>

              {error && (
                <div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600">
                  {error}
                </div>
              )}

              {/* Form Input fields */}
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">{t.customerName}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.customerNamePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-rose-400"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">{t.customerPhone}</label>
                  <input
                    type="tel"
                    required
                    placeholder={t.customerPhonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-rose-400"
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

                {/* Multi-Color Selection Quick Palette (if product has multiple images/colors) */}
                {productImages.length > 1 && (
                  <div class="space-y-2.5 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
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
                      {selectedColorIndices.length > 0 && (
                        <span class="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100 flex items-center gap-1">
                          <span>{t.colorsCountSelected.replace('{count}', selectedColorIndices.length)}</span>
                        </span>
                      )}
                    </div>

                    <div class="flex flex-wrap gap-2 pt-1">
                      {productImages.map((img, idx) => {
                        const isSelected = selectedColorIndices.includes(idx)
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleToggleColorFromPalette(idx)}
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

                {/* Per-Item Size & Color Configuration Section */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Layers size={14} className="text-rose-500" />
                      <span>{t.orderItemsTitle || 'অর্ডারের আইটেম ও সাইজ নির্বাচন করুন'}</span>
                    </label>
                    <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                      {lang === 'bn' ? `মোট ${quantity}টি পণ্য` : `Total ${quantity} items`}
                    </span>
                  </div>

                  {/* Item Cards */}
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
                                <span>{t.itemLabel || 'আইটেম'} {idx + 1}:</span>
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
                                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 outline-none hover:border-slate-300"
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
                                className="rounded-lg border border-slate-200 p-1 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
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
                    <span>{t.addAnotherItemBtn || '+ ভিন্ন সাইজ বা কালারের আরেকটি আইটেম যোগ করুন'}</span>
                  </button>
                </div>

                {/* Delivery Information Banner */}
                <div className={`flex items-center justify-between rounded-2xl border p-3.5 transition-all ${
                  isFreeDelivery
                    ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900'
                    : 'border-slate-200 bg-slate-50/80 text-slate-700'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isFreeDelivery ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                      <Truck size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold flex items-center gap-1.5">
                        {isFreeDelivery 
                          ? (lang === 'bn' ? 'ফ্রি ডেলিভারি!' : 'Free Delivery!')
                          : (lang === 'bn' ? 'সারাদেশে হোম ডেলিভারি' : 'Nationwide Home Delivery')}
                        {isFreeDelivery && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700">
                            SPECIAL OFFER
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {isFreeDelivery
                          ? (lang === 'bn' ? 'এই পণ্যের সাথে কোনো ডেলিভারি চার্জ নেই' : 'Zero delivery fee for this item')
                          : (lang === 'bn' ? 'ক্যাশ অন ডেলিভারি (পণ্য হাতে পেয়ে চেক করে পরিশোধ)' : 'Cash on Delivery')}
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
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-rose-400"
                  />
                </div>
              </div>

              {/* Price Calculation details */}
              <div class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm space-y-2.5">
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
                <div class="flex justify-between border-t border-slate-100 pt-2.5 font-bold text-slate-800 text-base">
                  <span>{t.totalBill}</span>
                  <span class="text-rose-600 text-lg">৳{totalAmount}</span>
                </div>
              </div>

              {/* Error Banner displayed directly above the submit button for mobile view */}
              {error && (
                <div class="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs font-bold text-rose-700 flex items-center gap-2 shadow-xs">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                class="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 py-4 text-base font-bold text-white shadow-xl shadow-rose-100 hover:from-rose-600 hover:to-rose-700 transition-all hover:shadow-rose-200"
              >
                {loading ? t.confirmOrderProcessing : t.confirmOrderBtn}
              </button>
            </form>
          ) : (
            /* Success screen state */
            <div class="py-8 text-center space-y-6">
              <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-md">
                <Check size={40} className="stroke-[3]" />
              </div>
              <div>
                <h3 class="text-2xl font-extrabold text-slate-900">{t.orderSuccessTitle}</h3>
                <p class="mx-auto mt-2 max-w-sm text-xs text-slate-500 md:text-sm">
                  {t.orderSuccessDesc}
                </p>
              </div>

              {/* Success metadata */}
              <div class="mx-auto max-w-sm rounded-2xl bg-slate-50 p-4 border border-slate-100 text-left text-xs space-y-2">
                <p class="font-semibold text-slate-700">{t.orderDetails}</p>
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

              {/* WhatsApp Action Button */}
              <div class="mx-auto max-w-sm">
                <a
                  href={getWhatsappLink()}
                  target="_blank"
                  rel="noreferrer"
                  class="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-center text-sm font-bold text-white shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all hover:shadow-emerald-200"
                >
                  <MessageSquare size={16} />
                  {t.confirmWhatsappBtn}
                </a>
                <p class="text-[9px] text-slate-400 mt-2 font-semibold">
                  {t.confirmWhatsappDesc}
                </p>
              </div>

              <div class="flex justify-center gap-3 border-t border-slate-50 pt-4">
                <button
                  onClick={onClose}
                  class="rounded-xl border border-slate-200 bg-white px-6 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t.closeBtn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

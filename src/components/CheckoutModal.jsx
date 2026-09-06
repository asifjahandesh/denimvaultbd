import React, { useState, useMemo } from 'react'
import { Check, ShoppingBag, X, MessageSquare, Tag, MapPin, Palette, Truck } from 'lucide-react'
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
  // Sizing and category breakdown
  const {
    cleanDescription,
    sizeStock,
    category: itemCategory,
    allSizes,
    availableSizes,
    hasConfiguredSizes,
    isFreeDelivery
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

  const [selectedColors, setSelectedColors] = useState(() => {
    return productImages.length > 0 ? [0] : []
  })

  const toggleColor = (idx) => {
    setSelectedColors((prev) => {
      let next
      if (prev.includes(idx)) {
        next = prev.filter((i) => i !== idx)
      } else {
        next = [...prev, idx].sort((a, b) => a - b)
      }
      // Each selected color counts as a product item; auto-update quantity
      const targetCount = Math.max(1, next.length)
      setQuantity(targetCount)
      return next
    })
  }

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [district, setDistrict] = useState('')
  const [upazila, setUpazila] = useState('')
  const [thana, setThana] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [selectedSize, setSelectedSize] = useState(() => {
    return availableSizes.length > 0 ? availableSizes[0] : ''
  })
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

  // Bangladeshi phone number regex (e.g. 01712345678 or +8801712345678)
  const validatePhone = (num) => {
    const regex = /^(?:\+88)?01[3-9]\d{8}$/
    return regex.test(num.replace(/\s+/g, ''))
  }

  // Construct WhatsApp pre-filled link
  const getWhatsappLink = () => {
    const cleanNumber = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, '') : '8801700000000'
    
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Basic Validations
    if (!name.trim()) return setError(lang === 'bn' ? 'আপনার নাম লিখুন' : 'Please enter your name')
    if (!phone.trim()) return setError(lang === 'bn' ? 'আপনার মোবাইল নাম্বার লিখুন' : 'Please enter your mobile number')
    if (!validatePhone(phone)) return setError(lang === 'bn' ? 'একটি সঠিক বাংলাদেশী মোবাইল নাম্বার দিন (১১ ডিজিট)' : 'Please enter a valid Bangladeshi mobile number (11 digits)')
    if (!district) return setError(lang === 'bn' ? 'অনুগ্রহ করে জেলা নির্বাচন করুন' : 'Please select your district')
    if (!upazila) return setError(lang === 'bn' ? 'অনুগ্রহ করে উপজেলা নির্বাচন করুন' : 'Please select your upazila')
    if (!thana) return setError(lang === 'bn' ? 'অনুগ্রহ করে থানা নির্বাচন করুন' : 'Please select your thana')
    if (!addressLine.trim()) return setError(lang === 'bn' ? 'অনুগ্রহ করে বিস্তারিত এড্রেস লাইন (বাসা নং, রোড নং, ইত্যাদি) লিখুন' : 'Please enter your detailed address line')

    const formattedAddress = formatFullAddress({
      addressLine,
      thana,
      upazila,
      district,
      lang
    })
    
    // Size Selection Validation
    if (availableSizes.length > 0 && !selectedSize) {
      return setError(lang === 'bn' ? 'অনুগ্রহ করে অর্ডার করার জন্য একটি সাইজ নির্বাচন করুন' : 'Please select an available size before ordering')
    }

    if (selectedSize && sizeStock[selectedSize] !== undefined && sizeStock[selectedSize] < quantity) {
      return setError(
        lang === 'bn'
          ? `সাইজ ${selectedSize}-এর জন্য পর্যাপ্ত স্টক নেই। অনুগ্রহ করে কম পরিমাণ নির্বাচন করুন।`
          : `Insufficient stock for size ${selectedSize}. Please select a lower quantity.`
      )
    }

    if (product.stock < quantity) {
      return setError(
        lang === 'bn'
          ? 'দুঃখিত, পর্যাপ্ত স্টক নেই। অনুগ্রহ করে কম পরিমাণ নির্বাচন করুন।'
          : 'Insufficient stock. Please select a lower quantity.'
      )
    }

    setLoading(true)

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

      // 2. Reduce product stock and specific size stock
      const updatedSizeStock = { ...sizeStock }
      if (selectedSize && updatedSizeStock[selectedSize] !== undefined) {
        updatedSizeStock[selectedSize] = Math.max(0, updatedSizeStock[selectedSize] - quantity)
      }
      const updatedDescription = encodeProductDescription(cleanDescription, updatedSizeStock, isFreeDelivery)

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
      <div class="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-soft-pulse md:max-w-2xl">
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
            <form onSubmit={handleSubmit} class="space-y-5">
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

                {/* Size Selection Section */}
                {allSizes.length > 0 && (
                  <div class="space-y-2 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
                    <div class="flex items-center justify-between">
                      <label class="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Tag size={13} className="text-rose-500" />
                        {t.selectSizeLabel}
                      </label>
                      {selectedSize && (
                        <span class="text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100">
                          {t.selectedSize} <strong class="text-rose-700">{selectedSize}</strong>
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
                                setError('')
                              }
                            }}
                            class={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-rose-500 text-white shadow-md shadow-rose-200 ring-2 ring-rose-400'
                                : isAvail
                                ? 'bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 shadow-sm'
                                : 'bg-slate-100 text-slate-400 border border-slate-100 cursor-not-allowed line-through opacity-50'
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

                    {availableSizes.length === 0 && (
                      <p class="text-xs font-bold text-rose-500 bg-rose-50 p-2 rounded-xl">
                        {lang === 'bn' ? 'এই পণ্যের সব সাইজ বর্তমানে স্টক আউট।' : 'All sizes for this product are currently out of stock.'}
                      </p>
                    )}
                  </div>
                )}

                {/* Color Selection Section */}
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
                      {selectedColors.length > 0 && (
                        <span class="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100 flex items-center gap-1">
                          <span>{t.colorsCountSelected.replace('{count}', selectedColors.length)}</span>
                          <span class="text-[10px] text-slate-500 font-medium">
                            ({selectedColors.map(idx => `${t.colorItem} ${idx + 1}`).join(', ')})
                          </span>
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
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                        {lang === 'bn' ? `${selectedColors.length}টি কালার সিলেক্টেড (${selectedColors.length}টি পণ্য)` : `${selectedColors.length} colors selected (${selectedColors.length} items)`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden max-w-[140px]">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(Math.max(1, selectedColors.length), quantity - 1))}
                      className="px-3.5 py-2 bg-slate-50 text-slate-600 font-extrabold hover:bg-slate-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center text-sm font-bold">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(currentSizeStock || product.stock, quantity + 1))}
                      className="px-3.5 py-2 bg-slate-50 text-slate-600 font-extrabold hover:bg-slate-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
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

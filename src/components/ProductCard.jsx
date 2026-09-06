import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ShoppingBag, Tag, Layers, Eye, Truck } from 'lucide-react'
import { translations } from '../utils/translations'
import { parseProductSizes } from '../utils/productSizes'

export default function ProductCard({ product, lang = 'bn', onOrderClick }) {
  const { id, name, price, discount_price, stock, image_urls } = product
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const t = translations[lang]

  const {
    cleanDescription,
    category: itemCategory,
    allSizes,
    availableSizes,
    isFreeDelivery
  } = parseProductSizes(product)

  const hasDiscount = discount_price && discount_price < price
  const discountAmount = hasDiscount ? price - discount_price : 0
  const isOutOfStock = stock <= 0
  const isLowStock = stock > 0 && stock <= 5

  // Get the display images or fallback to a placeholder
  const images = image_urls && image_urls.length > 0 
    ? image_urls 
    : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80']

  return (
    <div class="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-premium hover-scale">
      {/* Product Image Area */}
      <Link to={`/product/${id}`} class="relative aspect-square w-full overflow-hidden bg-slate-50 block">
        {/* Discount Badge */}
        {hasDiscount && (
          <div class="absolute left-4 top-4 z-10 flex flex-col items-center rounded-2xl bg-rose-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-rose-200">
            <span class="text-[10px] uppercase tracking-wide">{t.discountLabel}</span>
            <span>৳{Math.round(discountAmount)}</span>
          </div>
        )}

        {/* Category Badge */}
        <div class="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
          <Layers size={10} />
          {itemCategory}
        </div>

        {/* Free Delivery Badge */}
        {isFreeDelivery && (
          <div class="absolute left-4 bottom-4 z-10 flex items-center gap-1 rounded-full bg-emerald-600/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">
            <Truck size={12} />
            <span>{lang === 'bn' ? 'ফ্রি ডেলিভারি' : 'Free Delivery'}</span>
          </div>
        )}

        {/* Main Image */}
        <img
          src={images[activeImageIndex]}
          alt={name}
          loading="lazy"
          class="h-full w-full object-cover object-center transition-all duration-500 group-hover:scale-105"
        />

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div class="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-center shadow-lg">
              <span class="block text-sm font-extrabold text-rose-600">{t.outOfStock}</span>
              <span class="text-[10px] text-rose-500 font-semibold">{t.outOfStockDesc}</span>
            </div>
          </div>
        )}
      </Link>

      {/* Multiple Image Thumbnails (if any) */}
      {images.length > 1 && (
        <div class="flex gap-2 overflow-x-auto p-3 bg-slate-50/50 border-b border-slate-100">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImageIndex(idx)}
              class={`h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                activeImageIndex === idx ? 'border-rose-500 scale-95 shadow-sm' : 'border-transparent hover:border-slate-300'
              }`}
            >
              <img src={img} alt={`${name} thumb ${idx}`} class="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Product Content */}
      <div class="flex flex-1 flex-col p-4 md:p-5">
        <Link to={`/product/${id}`} class="block hover:text-rose-500 transition-colors">
          <h3 class="text-lg font-bold text-slate-900 md:text-xl line-clamp-1">{name}</h3>
        </Link>
        <p class="mt-2 text-xs text-slate-500 md:text-sm line-clamp-2 min-h-[2.5rem]">
          {cleanDescription || t.noDescription}
        </p>

        {/* Available sizes preview */}
        {allSizes.length > 0 && (
          <div class="mt-3 flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] font-bold text-slate-400">{lang === 'bn' ? 'সাইজ:' : 'Sizes:'}</span>
            <div class="flex flex-wrap gap-1">
              {allSizes.map((sz) => {
                const isAvail = availableSizes.includes(sz)
                return (
                  <span
                    key={sz}
                    class={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold transition-colors ${
                      isAvail
                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                        : 'bg-slate-100 text-slate-300 line-through opacity-50'
                    }`}
                  >
                    {sz}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Stock alerts */}
        {!isOutOfStock && (
          <div class="mt-3 flex items-center min-h-[1.25rem]">
            {isLowStock ? (
              <span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <AlertTriangle size={10} />
                {t.lowStock.replace('{stock}', stock)}
              </span>
            ) : (
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {t.stockAvailable}
              </span>
            )}
          </div>
        )}

        {/* Pricing & Order CTA */}
        <div class="mt-auto pt-4 border-t border-slate-50">
          <div class="flex items-baseline justify-between mb-3">
            <div>
              {hasDiscount ? (
                <div class="flex flex-col">
                  <span class="text-xs text-slate-400 line-through">৳{price}</span>
                  <span class="text-2xl font-extrabold text-rose-600">৳{discount_price}</span>
                </div>
              ) : (
                <span class="text-2xl font-extrabold text-slate-900">৳{price}</span>
              )}
            </div>
            {hasDiscount && (
              <span class="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                {t.saveMoney.replace('{amount}', Math.round(discountAmount))}
              </span>
            )}
          </div>

          <div class="grid grid-cols-2 gap-2">
            <Link
              to={`/product/${id}`}
              class="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <Eye size={14} />
              {lang === 'bn' ? 'বিস্তারিত' : 'Details'}
            </Link>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => {
                if (onOrderClick) {
                  onOrderClick(product)
                } else {
                  window.location.href = `/product/${id}#checkout-form`
                }
              }}
              class={`flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold text-white shadow-md transition-all ${
                isOutOfStock
                  ? 'bg-slate-300 cursor-not-allowed pointer-events-none'
                  : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-100 hover:shadow-rose-200'
              }`}
            >
              <ShoppingBag size={14} />
              {isOutOfStock ? t.outOfStock : (lang === 'bn' ? 'অর্ডার করুন' : 'Order Now')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

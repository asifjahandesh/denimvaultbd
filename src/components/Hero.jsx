import React from 'react'
import { CheckCircle2, ChevronRight, ShieldCheck, Truck } from 'lucide-react'
import { translations } from '../utils/translations'
import Logo from './Logo'

export default function Hero({ shopInfo, lang = 'bn' }) {
  const shopName = shopInfo?.name || 'Denim Vault BD'
  const shopDesc = shopInfo?.description || 'সেরা কোয়ালিটির ডেনিম ও ফ্যাশন পণ্য সাশ্রয়ী মূল্যে সরাসরি আপনার দ্বারে।'
  const promoText = shopInfo?.promo_text || '৫0% পর্যন্ত ছাড় এবং ফ্রি ডেলিভারি অফার!'

  const t = translations[lang]

  return (
    <section class="relative overflow-hidden bg-gradient-to-b from-rose-50 to-white py-10 md:py-16 lg:py-20">
      {/* Decorative Blur Spheres */}
      <div class="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl"></div>
      <div class="absolute -right-20 top-10 h-80 w-80 rounded-full bg-orange-100/40 blur-3xl"></div>

      <div class="mx-auto max-w-6xl px-4 text-center">
        {/* Official Brand Crest */}
        <div class="mx-auto mb-4 flex justify-center">
          <Logo size="2xl" alt={shopName} imgClassName="shadow-2xl ring-4 ring-rose-500/20" />
        </div>

        {/* Promotion Badge */}
        <div class="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 md:text-sm">
          <span class="flex h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
          {promoText}
        </div>

        {/* Hero Headings */}
        <h1 class="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-6xl leading-tight">
          {lang === 'bn' ? `${shopName}-এ আপনাকে স্বাগতম` : `Welcome to ${shopName}`}
        </h1>
        <p class="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg md:text-xl font-medium leading-relaxed">
          {shopDesc}
        </p>

        {/* CTA Buttons */}
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <a
            href="#products"
            class="flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-rose-200 hover:bg-rose-600 transition-all hover:shadow-rose-300 md:text-lg animate-soft-pulse"
          >
            {t.viewProducts}
            <ChevronRight size={18} />
          </a>
          <a
            href="#why-choose-us"
            class="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors md:text-lg"
          >
            {t.whyChooseUsBtn}
          </a>
        </div>

        {/* Highlight Badges */}
        <div class="mt-12 grid grid-cols-2 gap-4 border-t border-slate-100 pt-8 sm:grid-cols-3 md:mt-16 lg:grid-cols-3">
          <div class="flex items-center justify-center gap-2.5 rounded-2xl bg-white p-3 shadow-premium">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Truck size={20} />
            </div>
            <div class="text-left">
              <p class="text-xs font-bold text-slate-900 md:text-sm">{t.fastDelivery}</p>
              <p class="text-[10px] text-slate-500 md:text-xs">{t.fastDeliveryDesc}</p>
            </div>
          </div>

          <div class="flex items-center justify-center gap-2.5 rounded-2xl bg-white p-3 shadow-premium">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ShieldCheck size={20} />
            </div>
            <div class="text-left">
              <p class="text-xs font-bold text-slate-900 md:text-sm">{t.originalProduct}</p>
              <p class="text-[10px] text-slate-500 md:text-xs">{t.originalProductDesc}</p>
            </div>
          </div>

          <div class="col-span-2 flex items-center justify-center gap-2.5 rounded-2xl bg-white p-3 shadow-premium sm:col-span-1">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <CheckCircle2 size={20} />
            </div>
            <div class="text-left">
              <p class="text-xs font-bold text-slate-900 md:text-sm">{t.packageCheck}</p>
              <p class="text-[10px] text-slate-500 md:text-xs">{t.packageCheckDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

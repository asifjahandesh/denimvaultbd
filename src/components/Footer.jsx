import React, { useState } from 'react'
import { Facebook, MessageSquare, Phone, MapPin, Mail, ShieldAlert, X } from 'lucide-react'
import { translations } from '../utils/translations'

import Logo from './Logo'

export default function Footer({ shopInfo, socialLinks, lang = 'bn' }) {
  const [showPrivacy, setShowPrivacy] = useState(false)

  const t = translations[lang]

  const name = shopInfo?.name || 'Denim Vault BD'
  const email = shopInfo?.email || 'info@denimvaultbd.com'
  const phone = shopInfo?.phone || '+8801700000000'
  const address = shopInfo?.address || 'ঢাকা, বাংলাদেশ'
  const fbLink = socialLinks?.facebook || 'https://facebook.com/denimvaultbd'
  const waNumber = socialLinks?.whatsapp || '+8801700000000'

  const nameParts = name.trim().split(/\s+/)
  const firstName = nameParts[0] || 'Denim'
  const restName = nameParts.slice(1).join(' ')

  return (
    <footer class="bg-slate-900 pt-16 pb-24 text-slate-400 md:pb-12 border-t border-slate-800">
      <div class="mx-auto max-w-6xl px-4 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {/* About Shop */}
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <Logo size="lg" alt={name} />
            <div class="flex flex-col">
              <span class="text-xl font-black text-white leading-tight">
                {firstName} {restName && <span class="text-rose-500">{restName}</span>}
              </span>
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Premium Denim Store
              </span>
            </div>
          </div>
          <p class="text-xs leading-relaxed text-slate-400">
            {lang === 'bn'
              ? 'সেরা কোয়ালিটির ডেনিম ও ফ্যাশন পণ্য সাশ্রয়ী মূল্যে সরাসরি আপনার দ্বারে ক্যাশ অন ডেলিভারিতে পৌঁছে দেওয়াই আমাদের লক্ষ্য।'
              : 'Our goal is to deliver premium quality denim & fashion products at affordable prices directly to your door with Cash on Delivery.'}
          </p>
          <div class="flex gap-3 pt-2">
            <a
              href={fbLink}
              target="_blank"
              rel="noreferrer"
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-rose-500 hover:text-white transition-all"
            >
              <Facebook size={18} />
            </a>
            <a
              href={`https://wa.me/${waNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-white transition-all"
            >
              <MessageSquare size={18} />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div class="space-y-4">
          <h4 class="text-sm font-bold text-white uppercase tracking-wider">
            {lang === 'bn' ? 'প্রয়োজনীয় লিংক' : 'Quick Links'}
          </h4>
          <ul class="space-y-2.5 text-xs">
            <li>
              <a href="#products" class="hover:text-rose-400 transition-colors">
                {lang === 'bn' ? 'আমাদের পণ্যসমূহ' : 'Our Products'}
              </a>
            </li>
            <li>
              <a href="#why-choose-us" class="hover:text-rose-400 transition-colors">
                {lang === 'bn' ? 'কেন আমাদের বেছে নিবেন' : 'Why Choose Us'}
              </a>
            </li>
            <li>
              <a href="#reviews" class="hover:text-rose-400 transition-colors">
                {lang === 'bn' ? 'ক্রেতাদের মতামত' : 'Customer Reviews'}
              </a>
            </li>
            <li>
              <a href="#faq" class="hover:text-rose-400 transition-colors">
                {lang === 'bn' ? 'সাধারণ জিজ্ঞাসা (FAQ)' : 'FAQ'}
              </a>
            </li>
            <li>
              <button onClick={() => setShowPrivacy(true)} class="hover:text-rose-400 transition-colors flex items-center gap-1">
                <ShieldAlert size={12} />
                {lang === 'bn' ? 'প্রাইভেসি পলিসি' : 'Privacy Policy'}
              </button>
            </li>
          </ul>
        </div>

        {/* Contacts */}
        <div class="space-y-4">
          <h4 class="text-sm font-bold text-white uppercase tracking-wider">
            {lang === 'bn' ? 'যোগাযোগের ঠিকানা' : 'Contact Us'}
          </h4>
          <ul class="space-y-3.5 text-xs">
            <li class="flex items-start gap-2.5">
              <Phone size={14} className="text-rose-500 mt-0.5" />
              <a href={`tel:${phone}`} class="hover:text-white transition-colors">{phone}</a>
            </li>
            <li class="flex items-start gap-2.5">
              <Mail size={14} className="text-rose-500 mt-0.5" />
              <a href={`mailto:${email}`} class="hover:text-white transition-colors">{email}</a>
            </li>
            <li class="flex items-start gap-2.5">
              <MapPin size={14} className="text-rose-500 mt-0.5" />
              <span>{address}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div class="mx-auto max-w-6xl px-4 mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row sm:justify-between gap-4">
        <p>© {new Date().getFullYear()} {name}. {lang === 'bn' ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All Rights Reserved.'}</p>
        <p class="text-[10px]">{lang === 'bn' ? 'হাই কনভার্সনের জন্য তৈরি।' : 'Optimized for high conversions.'}</p>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div class="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white text-slate-800 shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 class="text-sm font-bold text-slate-800">
                {lang === 'bn' ? 'আমাদের প্রাইভেসি পলিসি' : 'Our Privacy Policy'}
              </h3>
              <button onClick={() => setShowPrivacy(false)} class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div class="max-h-[60vh] overflow-y-auto p-6 text-xs md:text-sm space-y-4 leading-relaxed text-slate-600">
              <p class="font-bold text-slate-800">
                {lang === 'bn' ? '১. তথ্য সংগ্রহ ও ব্যবহার:' : '1. Information Collection & Use:'}
              </p>
              <p>
                {lang === 'bn'
                  ? 'আমরা শুধুমাত্র আপনার অর্ডার নিশ্চিত করতে ও ডেলিভারি সফল করতে আপনার নাম, মোবাইল নাম্বার এবং সম্পূর্ণ ঠিকানা সংগ্রহ করে থাকি।'
                  : 'We only collect your name, mobile number, and full address to confirm your orders and complete successful deliveries.'}
              </p>
              
              <p class="font-bold text-slate-800">
                {lang === 'bn' ? '২. তথ্যের নিরাপত্তা:' : '2. Information Security:'}
              </p>
              <p>
                {lang === 'bn'
                  ? 'আপনার ব্যক্তিগত তথ্য আমাদের ডাটাবেজে সুরক্ষিত থাকে এবং কোনো অননুমোদিত তৃতীয় পক্ষের কাছে এটি বিক্রি বা শেয়ার করা হয় না।'
                  : 'Your personal information remains secure in our database and is never sold or shared with any unauthorized third parties.'}
              </p>

              <p class="font-bold text-slate-800">
                {lang === 'bn' ? '৩. কাস্টমার যোগাযোগ:' : '3. Customer Communication:'}
              </p>
              <p>
                {lang === 'bn'
                  ? 'অর্ডার কনফার্মেশন এবং ডেলিভারি ট্র্যাকিংয়ের জন্য আমাদের প্রতিনিধি কল বা এসএমএস-এর মাধ্যমে আপনার সাথে যোগাযোগ করবেন।'
                  : 'Our representatives will contact you via phone call or SMS for order confirmation and delivery tracking.'}
              </p>

              <p class="font-bold text-slate-800">
                {lang === 'bn' ? '৪. কুকিজ ও ট্র্যাকিং:' : '4. Cookies & Tracking:'}
              </p>
              <p>
                {lang === 'bn'
                  ? 'বিজ্ঞাপনের মানোন্নয়ন ও কাস্টমার অভিজ্ঞতার উন্নতির জন্য আমরা ফেসবুক পিক্সেল এবং গুগল অ্যানালিটিক্স ব্যবহার করে থাকি।'
                  : 'We utilize Facebook Pixel and Google Analytics to optimize advertisements and improve our user experience.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}

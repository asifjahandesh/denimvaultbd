import React from 'react'
import { Phone, ShoppingBag, Globe } from 'lucide-react'
import { translations } from '../utils/translations'

import Logo from './Logo'

export default function Header({ shopInfo, lang, setLang }) {
  const phone = shopInfo?.phone || '+8801700000000'
  const name = shopInfo?.name || 'Denim Vault BD'
  const nameParts = name.trim().split(/\s+/)
  const firstName = nameParts[0] || 'Denim'
  const restName = nameParts.slice(1).join(' ')
  
  const t = translations[lang]

  const toggleLanguage = () => {
    setLang(lang === 'bn' ? 'en' : 'bn')
  }

  return (
    <header className="sticky top-0 z-40 w-full glass-nav border-b border-slate-100 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 md:py-3.5">
        
        {/* Official Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <Logo size="md" alt={name} />
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-slate-900 md:text-2xl leading-tight">
              {firstName} {restName && <span className="text-rose-500">{restName}</span>}
            </span>
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase hidden sm:block">
              Premium Denim Store
            </span>
          </div>
        </a>

        {/* Action Button & Language Switcher */}
        <div class="flex items-center gap-2 sm:gap-3">
          
          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm sm:px-3"
            title={lang === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
          >
            <Globe size={13} className="text-rose-500" />
            <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
          </button>

          {/* Call helpline */}
          <a
            href={`tel:${phone}`}
            class="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors md:px-4 md:text-sm"
          >
            <Phone size={13} className="text-rose-500 animate-bounce" />
            <span class="hidden sm:inline">{t.shopHelpline}</span> {phone}
          </a>
          
          <a
            href="#products"
            class="hidden md:flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all hover:shadow-rose-200"
          >
            {t.viewProducts}
          </a>
        </div>
      </div>
    </header>
  )
}

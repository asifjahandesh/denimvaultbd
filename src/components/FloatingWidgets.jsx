import React, { useState, useEffect } from 'react'
import { MessageSquare, ShoppingCart } from 'lucide-react'

export default function FloatingWidgets({ socialLinks, targetHref = '#products', buttonText = 'পছন্দের পণ্যটি অর্ডার করুন' }) {
  const [isVisible, setIsVisible] = useState(false)
  const waNumber = socialLinks?.whatsapp || '+8801700000000'

  useEffect(() => {
    const toggleVisibility = () => {
      // Show sticky order button after scrolling down 400px
      if (window.scrollY > 400) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  return (
    <div class="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      {/* Container to separate click areas */}
      <div class="relative w-full h-full p-4 flex flex-col items-end gap-3">
        {/* Floating WhatsApp Button */}
        <a
          href={`https://wa.me/${waNumber.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noreferrer"
          class="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl hover:bg-emerald-600 hover:scale-105 transition-all animate-float mb-16 md:mb-0"
          aria-label="WhatsApp chat"
        >
          <MessageSquare size={28} className="fill-current" />
        </a>

        {/* Sticky Mobile Order Now Bar */}
        {isVisible && (
          <div class="pointer-events-auto fixed bottom-0 left-0 right-0 border-t border-slate-100 bg-white p-3 shadow-sticky animate-soft-pulse md:hidden">
            <a
              href={targetHref}
              class="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 py-3.5 text-center text-sm font-extrabold text-white shadow-lg shadow-rose-100"
            >
              <ShoppingCart size={16} />
              {buttonText}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

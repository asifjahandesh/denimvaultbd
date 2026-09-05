import React, { useState } from 'react'
import { OFFICIAL_LOGO, SVG_LOGO } from '../assets/logo'

export default function Logo({
  size = 'md', // 'sm' (32px), 'md' (42px), 'lg' (56px), 'xl' (80px), '2xl' (120px)
  showText = false,
  className = '',
  imgClassName = '',
  textClassName = '',
  alt = 'Denim Vault BD'
}) {
  const [imgSrc, setImgSrc] = useState(OFFICIAL_LOGO)

  // Size mappings
  const sizeMap = {
    xs: 'h-7 w-7',
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
    '2xl': 'h-28 w-28'
  }

  const badgeSize = sizeMap[size] || sizeMap.md

  const handleImgError = () => {
    // If the image fails to load for any reason, smoothly fallback to vector SVG logo
    if (imgSrc !== SVG_LOGO) {
      setImgSrc(SVG_LOGO)
    }
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`relative flex-shrink-0 overflow-hidden rounded-full shadow-md transition-transform duration-300 hover:scale-105 border-2 border-amber-500/30 bg-[#091220] ${badgeSize} ${imgClassName}`}
      >
        <img
          src={imgSrc}
          alt={alt}
          onError={handleImgError}
          className="h-full w-full object-cover rounded-full"
        />
      </div>

      {showText && (
        <div className={`flex flex-col leading-tight ${textClassName}`}>
          <span className="text-base font-black tracking-tight text-slate-900 md:text-lg">
            Denim <span className="text-rose-500">Vault BD</span>
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Premium Denim Store
          </span>
        </div>
      )}
    </div>
  )
}

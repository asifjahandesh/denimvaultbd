import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Safe dynamic Facebook Pixel loading
const pixelId = import.meta.env.VITE_FACEBOOK_PIXEL_ID
if (pixelId && typeof window !== 'undefined') {
  // Initialize fbq tracking queue
  window.fbq = window.fbq || function () {
    (window.fbq.q = window.fbq.q || []).push(arguments)
  }
  window._fbq = window._fbq || window.fbq
  window.fbq.push = window.fbq
  window.fbq.loaded = true
  window.fbq.version = '2.0'
  window.fbq.queue = []

  // Create and append the script element to document head
  const fbScript = document.createElement('script')
  fbScript.async = true
  fbScript.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(fbScript)

  window.fbq('init', pixelId)
  window.fbq('track', 'PageView')
}

// Safe dynamic Google Analytics loading
const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID
if (gaId && typeof window !== 'undefined') {
  const gaScript = document.createElement('script')
  gaScript.async = true
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  document.head.appendChild(gaScript)

  window.dataLayer = window.dataLayer || []
  window.gtag = function () {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', gaId)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

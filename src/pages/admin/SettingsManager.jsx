import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { Save, RefreshCw, Facebook, Phone, MapPin, Truck, HelpCircle } from 'lucide-react'
import Logo from '../../components/Logo'

export default function SettingsManager({ settings, onSettingsUpdate }) {
  // Shop Info fields
  const [shopName, setShopName] = useState('')
  const [shopPhone, setShopPhone] = useState('')
  const [shopEmail, setShopEmail] = useState('')
  const [shopAddress, setShopAddress] = useState('')
  const [shopDescription, setShopDescription] = useState('')
  const [promoText, setPromoText] = useState('')

  // Shipping charges fields
  const [chargeInside, setChargeInside] = useState('')
  const [chargeOutside, setChargeOutside] = useState('')

  // Social Links fields
  const [fbLink, setFbLink] = useState('')
  const [waNumber, setWaNumber] = useState('')

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Populate local state when settings change/load
  useEffect(() => {
    if (settings) {
      const info = settings.shop_info || {}
      setShopName(info.name || 'Denim Vault BD')
      setShopPhone(info.phone || '+8801700000000')
      setShopEmail(info.email || 'info@denimvaultbd.com')
      setShopAddress(info.address || 'Dhaka, Bangladesh')
      setShopDescription(info.description || 'Premium quality denim and fashion wear delivered directly to your doorstep.')
      setPromoText(info.promo_text || 'Up to 50% OFF and Free Delivery Offer!')

      const charges = settings.delivery_charges || {}
      setChargeInside(charges.inside_dhaka ?? 60)
      setChargeOutside(charges.outside_dhaka ?? 120)

      const socials = settings.social_links || {}
      setFbLink(socials.facebook || 'https://facebook.com/denimvaultbd')
      setWaNumber(socials.whatsapp || '+8801700000000')
    }
  }, [settings])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError('')

    try {
      // 1. Update shop_info
      const { error: infoErr } = await supabase
        .from('settings')
        .upsert({
          key: 'shop_info',
          value: {
            name: shopName,
            phone: shopPhone,
            email: shopEmail,
            address: shopAddress,
            description: shopDescription,
            promo_text: promoText
          }
        })
      if (infoErr) throw infoErr

      // 2. Update delivery_charges
      const { error: chargesErr } = await supabase
        .from('settings')
        .upsert({
          key: 'delivery_charges',
          value: {
            inside_dhaka: Number(chargeInside),
            outside_dhaka: Number(chargeOutside)
          }
        })
      if (chargesErr) throw chargesErr

      // 3. Update social_links
      const { error: socialsErr } = await supabase
        .from('settings')
        .upsert({
          key: 'social_links',
          value: {
            facebook: fbLink,
            whatsapp: waNumber
          }
        })
      if (socialsErr) throw socialsErr

      setSuccess(true)
      onSettingsUpdate() // refresh settings in parent component

      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Store Settings</h2>
        <p className="text-xs text-slate-500">Manage shop details, contact info, delivery charges, and social media links.</p>
      </div>

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-600">
          Settings saved successfully!
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shop Info Card */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-premium space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin size={16} className="text-rose-500" />
              General Shop Information
            </h3>
          </div>

          {/* Official Brand Logo preview */}
          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
            <Logo size="lg" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Official Denim Vault BD Logo & Vector Badge (Active)</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Official Golden Stitch denim badge and vector icon active across header, footer, favicon, and admin panel.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Shop Name *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Helpline Phone Number *</label>
              <input
                type="text"
                required
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                value={shopEmail}
                onChange={(e) => setShopEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Shop Address *</label>
              <input
                type="text"
                required
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Shop Description (Storefront Hero)</label>
              <textarea
                rows={2}
                value={shopDescription}
                onChange={(e) => setShopDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Promotional Banner Text (Header announcement)</label>
              <input
                type="text"
                value={promoText}
                onChange={(e) => setPromoText(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
              />
            </div>
          </div>
        </div>

        {/* Shipping settings */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-premium space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-3">
            <Truck size={16} className="text-rose-500" />
            Delivery Charges Settings
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Inside Dhaka Delivery Fee (৳) *</label>
              <input
                type="number"
                required
                value={chargeInside}
                onChange={(e) => setChargeInside(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Outside Dhaka Delivery Fee (৳) *</label>
              <input
                type="number"
                required
                value={chargeOutside}
                onChange={(e) => setChargeOutside(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
              />
            </div>
          </div>
        </div>

        {/* Social settings */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-premium space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-3">
            <Facebook size={16} className="text-rose-500" />
            Communication & Social Links
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Facebook Page URL *</label>
              <input
                type="url"
                required
                placeholder="https://facebook.com/page-name"
                value={fbLink}
                onChange={(e) => setFbLink(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">WhatsApp Phone Number *</label>
              <input
                type="text"
                required
                placeholder="+8801700000000"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
              />
              <p className="text-[9px] text-slate-400 mt-1">Include country code, e.g. +88017XXXXXXXX</p>
            </div>
          </div>
        </div>

        {/* Save button CTA */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-8 py-3.5 text-xs font-bold text-white shadow-xl shadow-rose-100 hover:from-rose-600 hover:to-rose-700 transition-all hover:shadow-rose-200"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Saving changes...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

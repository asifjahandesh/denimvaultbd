import React, { useState, useEffect } from 'react'
import { Star, MessageSquarePlus, Send, X, CheckCircle2, AlertCircle, Sparkles, MapPin } from 'lucide-react'
import confetti from 'canvas-confetti'
import { supabase } from '../supabase'
import { translations } from '../utils/translations'

const LOCAL_STORAGE_KEY = 'denim_vault_customer_reviews'
const HIDDEN_REVIEWS_KEY = 'denim_vault_hidden_reviews'
const DELETED_REVIEWS_KEY = 'denim_vault_deleted_reviews'

export default function Reviews({ lang = 'bn' }) {
  const t = translations[lang] || translations.bn

  // Seed reviews for high credibility baseline
  const seedReviews = [
    {
      id: 'seed-1',
      name: lang === 'bn' ? 'আরিফুল ইসলাম' : 'Ariful Islam',
      location: lang === 'bn' ? 'মিরপুর, ঢাকা' : 'Mirpur, Dhaka',
      rating: 5,
      comment: lang === 'bn'
        ? 'পণ্যটির কোয়ালিটি অসাধারণ! আমি অর্ডার করার পরদিনেই ডেলিভারি পেয়েছি। ধন্যবাদ ডেনিম ভল্ট বিডিকে ক্যাশ অন ডেলিভারিতে এত ভালো প্রোডাক্ট দেয়ার জন্য।'
        : 'The product quality is amazing! I received delivery the day after ordering. Thanks to Denim Vault BD for offering such a great product on Cash on Delivery.',
      date: lang === 'bn' ? '১ দিন আগে' : '1 day ago',
      isVerified: true
    },
    {
      id: 'seed-2',
      name: lang === 'bn' ? 'সাদিয়া সুলতানা' : 'Sadia Sultana',
      location: lang === 'bn' ? 'খুলনা সদর' : 'Khulna Sadar',
      rating: 5,
      comment: lang === 'bn'
        ? 'ডেলিভারি ম্যানের সামনে প্যাকেট খুলে চেক করে নিতে পেরেছি। পণ্যটি ঠিক যেমন ছবিতে দেখেছি তেমনই পেয়েছি। যেকোনো বিশ্বাসী ক্রেতা নিশ্চিন্তে কিনতে পারেন।'
        : 'I was able to open and inspect the package in front of the delivery agent. The product was exactly as shown in the picture. Any shopper can buy with confidence.',
      date: lang === 'bn' ? '৩ দিন আগে' : '3 days ago',
      isVerified: true
    },
    {
      id: 'seed-3',
      name: lang === 'bn' ? 'আব্দুর রহমান' : 'Abdur Rahman',
      location: lang === 'bn' ? 'চৌহাট্টা, সিলেট' : 'Chouhatta, Sylhet',
      rating: 5,
      comment: lang === 'bn'
        ? 'খুবই ভালো সার্ভিস। আমি দ্বিতীয়বার অর্ডার করলাম। কাস্টমার সাপোর্টের ব্যবহার খুবই চমৎকার। ক্যাশ অন ডেলিভারিতে চেক করে নেয়ার সুবিধাটাই সেরা।'
        : 'Very good service. I ordered for the second time. The customer support behavior is excellent. The open packet check on delivery is the best feature.',
      date: lang === 'bn' ? '১ সপ্তাহ আগে' : '1 week ago',
      isVerified: true
    },
  ]

  // State
  const [userReviews, setUserReviews] = useState([])
  const [remoteReviews, setRemoteReviews] = useState([])
  const [hiddenIds, setHiddenIds] = useState([])
  const [deletedIds, setDeletedIds] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Form State
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [location, setLocation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState(false)

  // 1. Sync local storage data and listen for storage changes
  const syncLocalData = () => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) setUserReviews(parsed)
      }
      const h = localStorage.getItem(HIDDEN_REVIEWS_KEY)
      if (h) setHiddenIds(JSON.parse(h))
      const d = localStorage.getItem(DELETED_REVIEWS_KEY)
      if (d) setDeletedIds(JSON.parse(d))
    } catch (e) {
      console.warn('Failed to load local reviews:', e)
    }
  }

  useEffect(() => {
    syncLocalData()

    // Listen for storage events (e.g., when Admin modifies reviews in another tab)
    const handleStorageChange = () => syncLocalData()
    window.addEventListener('storage', handleStorageChange)

    // Fetch from Supabase if table exists
    const fetchRemote = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && Array.isArray(data) && data.length > 0) {
          setRemoteReviews(
            data.map((r) => ({
              id: r.id || `remote-${r.created_at}`,
              name: r.name,
              comment: r.comment,
              rating: Number(r.rating) || 5,
              location: r.location || (lang === 'bn' ? 'বাংলাদেশ' : 'Bangladesh'),
              date: lang === 'bn' ? 'সম্প্রতি' : 'Recently',
              is_hidden: Boolean(r.is_hidden),
              isLive: true
            }))
          )
        }
      } catch (err) {
        // Silently skip if table does not exist or demo mode
      }
    }

    fetchRemote()

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [lang])

  // Handle Form Submission
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!name.trim() || !comment.trim()) {
      setErrorMsg(t.nameAndCommentRequired || 'অনুগ্রহ করে আপনার নাম ও মন্তব্য উভয়ই পূরণ করুন।')
      return
    }

    setIsSubmitting(true)

    const newReview = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      comment: comment.trim(),
      rating: Number(rating) || 5,
      location: location.trim() || (lang === 'bn' ? 'কাস্টমার' : 'Customer'),
      date: lang === 'bn' ? 'এইমাত্র' : 'Just now',
      created_at: new Date().toISOString(),
      isLive: true
    }

    // 1. Immediately update state and localStorage for instant live display
    const updatedLocal = [newReview, ...userReviews]
    setUserReviews(updatedLocal)
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLocal))
    } catch (e) {
      console.warn('Failed to save review to localStorage:', e)
    }

    // 2. Try persisting to Supabase in background
    try {
      await supabase.from('reviews').insert([
        {
          name: newReview.name,
          comment: newReview.comment,
          rating: newReview.rating,
          location: newReview.location
        }
      ])
    } catch (err) {
      // Non-blocking in case table is not deployed yet
    }

    // 3. Trigger celebration confetti
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      })
    } catch (e) {}

    setIsSubmitting(false)
    setSuccessMsg(true)

    // Auto-close modal after 1.5 seconds
    setTimeout(() => {
      setIsModalOpen(false)
      setSuccessMsg(false)
      setName('')
      setComment('')
      setRating(5)
      setLocation('')
    }, 1500)
  }

  // Combine and deduplicate reviews, then filter out deleted and hidden reviews
  const displayedReviews = [
    ...userReviews,
    ...remoteReviews.filter(r => !userReviews.some(u => u.name === r.name && u.comment === r.comment)),
    ...seedReviews
  ]
    .filter((r) => !deletedIds.includes(r.id))
    .filter((r) => !(r.is_hidden || hiddenIds.includes(r.id)))

  // Rating label helper
  const getRatingLabel = (stars) => {
    if (lang === 'bn') {
      if (stars === 5) return '৫ স্টার (চমৎকার!)'
      if (stars === 4) return '৪ স্টার (খুব ভালো)'
      if (stars === 3) return '৩ স্টার (মোটামুটি)'
      if (stars === 2) return '২ স্টার (খারাপ না)'
      return '১ স্টার (অসন্তোষজনক)'
    }
    if (stars === 5) return '5 Stars (Excellent!)'
    if (stars === 4) return '4 Stars (Very Good)'
    if (stars === 3) return '3 Stars (Average)'
    if (stars === 2) return '2 Stars (Fair)'
    return '1 Star (Poor)'
  }

  return (
    <section id="reviews" className="bg-slate-50 py-16 md:py-24 transition-colors">
      <div className="mx-auto max-w-6xl px-4">
        {/* Section Header */}
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl lg:text-4xl">
            {lang === 'bn' ? (
              <>আমাদের কাস্টমারদের <span className="text-rose-500">মতামত</span></>
            ) : (
              <>What Our <span className="text-rose-500">Customers Say</span></>
            )}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-xs text-slate-500 md:text-sm">
            {t.reviewsSub}
          </p>
        </div>

        {/* Aggregate Stats & Write Review Action Bar */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:gap-6 max-w-2xl mx-auto">
          {/* Rating summary card */}
          <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-premium w-full sm:w-auto justify-center">
            <div className="text-center">
              <span className="text-3xl font-extrabold text-slate-900 md:text-4xl">৪.৯</span>
              <span className="text-slate-400 text-xs font-bold">/৫</span>
            </div>
            <div className="flex flex-col items-start">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 font-bold">{t.reviewsStats}</p>
            </div>
          </div>

          {/* Write a Review Button */}
          <button
            onClick={() => {
              setIsModalOpen(true)
              setErrorMsg('')
              setSuccessMsg(false)
            }}
            className="group flex items-center justify-center gap-2.5 rounded-3xl bg-rose-500 hover:bg-rose-600 px-6 py-4 text-xs md:text-sm font-black text-white shadow-lg shadow-rose-200 transition-all hover:scale-105 active:scale-95 border border-rose-400 w-full sm:w-auto cursor-pointer"
          >
            <MessageSquarePlus size={18} className="transition-transform group-hover:rotate-12" />
            <span>{t.writeReviewBtn}</span>
          </button>
        </div>

        {/* Reviews Grid */}
        {displayedReviews.length === 0 ? (
          <div className="mt-12 rounded-3xl bg-white p-12 text-center border border-slate-100 max-w-md mx-auto shadow-sm">
            <p className="text-xs sm:text-sm font-bold text-slate-500">
              {lang === 'bn' ? 'বর্তমানে কোন রিভিউ দৃশ্যমান নেই।' : 'No reviews are currently visible.'}
            </p>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayedReviews.map((review, idx) => (
            <div
              key={review.id || idx}
              className={`flex flex-col justify-between rounded-3xl border bg-white p-6 transition-all duration-300 hover:scale-[1.02] ${
                review.isLive
                  ? 'border-rose-200 shadow-md ring-1 ring-rose-100'
                  : 'border-slate-100 shadow-premium'
              }`}
            >
              <div>
                {/* Rating stars & Time */}
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400 gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" className="stroke-[1.5]" />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {review.date}
                  </span>
                </div>

                {/* Comment */}
                <p className="mt-4 text-xs font-medium text-slate-700 md:text-sm leading-relaxed italic">
                  "{review.comment}"
                </p>
              </div>

              {/* User Meta Footer */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 md:text-sm">{review.name}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                    <MapPin size={10} className="text-rose-400" />
                    {review.location}
                  </p>
                </div>

                {/* Verified or Live Customer Badge */}
                {review.isLive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                    <Sparkles size={11} className="text-rose-500" />
                    {t.customerReviewBadge}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg uppercase tracking-wide">
                    {t.verifiedPurchase}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

      {/* Review Submission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 p-6 md:p-8">
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 border border-rose-100">
                <MessageSquarePlus size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {t.reviewModalTitle}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {t.reviewModalSubtitle}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitReview} className="mt-6 space-y-4">
              {/* Error Alert */}
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-600 border border-rose-100">
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Success Alert */}
              {successMsg && (
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>{t.reviewSuccessMsg}</span>
                </div>
              )}

              {/* Rating Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t.reviewRatingLabel}
                </label>
                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <div className="flex text-amber-400 gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          size={22}
                          fill={(hoverRating || rating) >= star ? 'currentColor' : 'none'}
                          className={(hoverRating || rating) >= star ? 'text-amber-400 stroke-amber-400' : 'text-slate-300'}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-600 ml-2">
                    {getRatingLabel(hoverRating || rating)}
                  </span>
                </div>
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.reviewNameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.reviewNamePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>

              {/* Location Field (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.reviewLocationLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.reviewLocationPlaceholder}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>

              {/* Comment Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.reviewCommentLabel}
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={t.reviewCommentPlaceholder}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t.cancelReviewBtn}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || successMsg}
                  className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 hover:bg-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>{t.submittingReviewBtn}</span>
                  ) : successMsg ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>{lang === 'bn' ? 'সফল!' : 'Success!'}</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>{t.submitReviewBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

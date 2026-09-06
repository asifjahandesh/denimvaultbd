import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'
import {
  Star,
  Eye,
  EyeOff,
  Trash2,
  Search,
  Plus,
  MessageSquare,
  Sparkles,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Send,
  RefreshCw
} from 'lucide-react'

const LOCAL_STORAGE_KEY = 'denim_vault_customer_reviews'
const HIDDEN_REVIEWS_KEY = 'denim_vault_hidden_reviews'
const DELETED_REVIEWS_KEY = 'denim_vault_deleted_reviews'

// Baseline seed reviews
const DEFAULT_SEEDS = [
  {
    id: 'seed-1',
    name: 'আরিফুল ইসলাম',
    location: 'মিরপুর, ঢাকা',
    rating: 5,
    comment: 'পণ্যটির কোয়ালিটি অসাধারণ! আমি অর্ডার করার পরদিনেই ডেলিভারি পেয়েছি। ধন্যবাদ ডেনিম ভল্ট বিডিকে ক্যাশ অন ডেলিভারিতে এত ভালো প্রোডাক্ট দেয়ার জন্য।',
    date: '1 day ago',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    is_seed: true
  },
  {
    id: 'seed-2',
    name: 'সাদিয়া সুলতানা',
    location: 'খুলনা সদর',
    rating: 5,
    comment: 'ডেলিভারি ম্যানের সামনে প্যাকেট খুলে চেক করে নিতে পেরেছি। পণ্যটি ঠিক যেমন ছবিতে দেখেছি তেমনই পেয়েছি। যেকোনো বিশ্বাসী ক্রেতা নিশ্চিন্তে কিনতে পারেন।',
    date: '3 days ago',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    is_seed: true
  },
  {
    id: 'seed-3',
    name: 'আব্দুর রহমান',
    location: 'চৌহাট্টা, সিলেট',
    rating: 5,
    comment: 'খুবই ভালো সার্ভিস। আমি দ্বিতীয়বার অর্ডার করলাম। কাস্টমার সাপোর্টের ব্যবহার খুবই চমৎকার। ক্যাশ অন ডেলিভারিতে চেক করে নেয়ার সুবিধাটাই সেরা।',
    date: '1 week ago',
    created_at: new Date(Date.now() - 604800000).toISOString(),
    is_seed: true
  }
]

export default function ReviewManager({ onReviewsUpdate }) {
  const [reviews, setReviews] = useState([])
  const [hiddenIds, setHiddenIds] = useState([])
  const [deletedIds, setDeletedIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'visible' | 'hidden'
  const [searchQuery, setSearchQuery] = useState('')

  // Add Manual Review Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newComment, setNewComment] = useState('')
  const [newRating, setNewRating] = useState(5)
  const [newLocation, setNewLocation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  // Show auto-dismissing toast
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  // Load reviews from both Supabase and localStorage
  const loadAllReviews = async () => {
    setLoading(true)
    try {
      // 1. Read hidden and deleted registries
      let localHidden = []
      let localDeleted = []
      try {
        const h = localStorage.getItem(HIDDEN_REVIEWS_KEY)
        if (h) localHidden = JSON.parse(h)
        const d = localStorage.getItem(DELETED_REVIEWS_KEY)
        if (d) localDeleted = JSON.parse(d)
      } catch (e) {}

      setHiddenIds(localHidden)
      setDeletedIds(localDeleted)

      // 2. Read local customer reviews
      let localReviews = []
      try {
        const lr = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (lr) localReviews = JSON.parse(lr)
      } catch (e) {}

      // 3. Read Supabase reviews
      let remoteReviews = []
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && Array.isArray(data)) {
          remoteReviews = data.map((r) => ({
            ...r,
            rating: Number(r.rating) || 5,
            is_hidden: Boolean(r.is_hidden)
          }))
        }
      } catch (e) {
        console.log('Supabase reviews load skipped:', e)
      }

      // 4. Merge all reviews and remove deleted ones
      const combined = [
        ...localReviews,
        ...remoteReviews.filter(r => !localReviews.some(u => u.name === r.name && u.comment === r.comment)),
        ...DEFAULT_SEEDS
      ]

      // Filter out deleted IDs
      const activeReviews = combined.filter((r) => !localDeleted.includes(r.id))

      // Normalize is_hidden
      const mapped = activeReviews.map((r) => ({
        ...r,
        is_hidden: r.is_hidden || localHidden.includes(r.id)
      }))

      setReviews(mapped)
    } catch (err) {
      console.error('Error loading reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllReviews()
  }, [])

  // Toggle Show / Hide visibility
  const handleToggleVisibility = async (review) => {
    const willBeHidden = !review.is_hidden

    try {
      // 1. Update Supabase if review exists remotely
      try {
        await supabase
          .from('reviews')
          .update({ is_hidden: willBeHidden })
          .eq('id', review.id)
      } catch (e) {}

      // 2. Update local storage hidden registry
      let updatedHidden = [...hiddenIds]
      if (willBeHidden) {
        if (!updatedHidden.includes(review.id)) {
          updatedHidden.push(review.id)
        }
      } else {
        updatedHidden = updatedHidden.filter((id) => id !== review.id)
      }
      setHiddenIds(updatedHidden)
      localStorage.setItem(HIDDEN_REVIEWS_KEY, JSON.stringify(updatedHidden))

      // 3. Update in local customer reviews array if present
      try {
        const lr = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (lr) {
          const list = JSON.parse(lr)
          const updatedList = list.map((item) =>
            item.id === review.id ? { ...item, is_hidden: willBeHidden } : item
          )
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList))
        }
      } catch (e) {}

      // 4. Update UI State
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, is_hidden: willBeHidden } : r))
      )

      showToast(
        willBeHidden
          ? `"${review.name}"'s review is now hidden from the store.`
          : `"${review.name}"'s review is now visible on the store.`,
        'success'
      )

      onReviewsUpdate?.()
    } catch (err) {
      console.error('Error toggling visibility:', err)
      showToast('Failed to update review status.', 'error')
    }
  }

  // Delete a review permanently
  const handleDeleteReview = async (review) => {
    const isConfirm = window.confirm(
      `Are you sure you want to delete "${review.name}"'s review?\nThis will permanently remove it from the store and admin panel.`
    )
    if (!isConfirm) return

    try {
      // 1. Delete from Supabase
      try {
        await supabase
          .from('reviews')
          .delete()
          .eq('id', review.id)
      } catch (e) {}

      // 2. Update local deleted registry
      const updatedDeleted = [...deletedIds, review.id]
      setDeletedIds(updatedDeleted)
      localStorage.setItem(DELETED_REVIEWS_KEY, JSON.stringify(updatedDeleted))

      // 3. Remove from local customer reviews array
      try {
        const lr = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (lr) {
          const list = JSON.parse(lr)
          const filtered = list.filter((item) => item.id !== review.id)
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
        }
      } catch (e) {}

      // 4. Remove from UI state
      setReviews((prev) => prev.filter((r) => r.id !== review.id))

      showToast('Review deleted successfully.', 'success')
      onReviewsUpdate?.()
    } catch (err) {
      console.error('Error deleting review:', err)
      showToast('Failed to delete review.', 'error')
    }
  }

  // Add Manual Review from Admin
  const handleAddManualReview = async (e) => {
    e.preventDefault()
    setModalError('')

    if (!newName.trim() || !newComment.trim()) {
      setModalError('Please enter both customer name and review comment.')
      return
    }

    setIsSubmitting(true)
    const newRev = {
      id: `admin_rev_${Date.now()}`,
      name: newName.trim(),
      comment: newComment.trim(),
      rating: Number(newRating) || 5,
      location: newLocation.trim() || 'Dhaka, Bangladesh',
      is_hidden: false,
      date: 'Today',
      created_at: new Date().toISOString(),
      isLive: true
    }

    // Save to localStorage
    try {
      const lr = localStorage.getItem(LOCAL_STORAGE_KEY)
      const list = lr ? JSON.parse(lr) : []
      const updated = [newRev, ...list]
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {}

    // Save to Supabase
    try {
      await supabase.from('reviews').insert([
        {
          name: newRev.name,
          comment: newRev.comment,
          rating: newRev.rating,
          location: newRev.location,
          is_hidden: false
        }
      ])
    } catch (e) {}

    setReviews((prev) => [newRev, ...prev])
    setIsSubmitting(false)
    setIsAddModalOpen(false)
    setNewName('')
    setNewComment('')
    setNewRating(5)
    setNewLocation('')
    showToast('New review added and published successfully.', 'success')
    onReviewsUpdate?.()
  }

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesSearch =
        r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location?.toLowerCase().includes(searchQuery.toLowerCase())

      const isHidden = r.is_hidden || hiddenIds.includes(r.id)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'visible' && !isHidden) ||
        (statusFilter === 'hidden' && isHidden)

      return matchesSearch && matchesStatus
    })
  }, [reviews, searchQuery, statusFilter, hiddenIds])

  // Aggregate Metrics
  const totalReviewsCount = reviews.length
  const visibleCount = reviews.filter((r) => !(r.is_hidden || hiddenIds.includes(r.id))).length
  const hiddenCount = reviews.filter((r) => (r.is_hidden || hiddenIds.includes(r.id))).length
  const avgRating = totalReviewsCount
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / totalReviewsCount).toFixed(1)
    : '5.0'

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl px-5 py-3 text-xs font-bold shadow-xl transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-500 text-white shadow-rose-200'
              : 'bg-emerald-600 text-white shadow-emerald-200'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle size={16} />
          ) : (
            <CheckCircle2 size={16} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl flex items-center gap-2">
            <MessageSquare className="text-rose-500" size={24} />
            Customer Reviews Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage customer feedback: toggle visibility (Show / Hide) or permanently delete reviews.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAllReviews}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
            title="Refresh reviews"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setIsAddModalOpen(true)
              setModalError('')
            }}
            className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-100 hover:bg-rose-600 transition-colors"
          >
            <Plus size={16} />
            <span>Add New Review</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-400">Total Reviews</span>
          <p className="mt-1 text-2xl font-black text-slate-900">{totalReviewsCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
          <span className="text-xs font-bold text-emerald-600">Visible on Store</span>
          <p className="mt-1 text-2xl font-black text-emerald-700">{visibleCount}</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
          <span className="text-xs font-bold text-amber-600">Hidden Reviews</span>
          <p className="mt-1 text-2xl font-black text-amber-700">{hiddenCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-400">Average Rating</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-2xl font-black text-slate-900">{avgRating}</span>
            <Star size={18} className="fill-amber-400 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by customer name or review text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-medium text-slate-800 outline-none transition-all focus:border-rose-400 focus:bg-white"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({totalReviewsCount})
          </button>
          <button
            onClick={() => setStatusFilter('visible')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              statusFilter === 'visible'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Visible ({visibleCount})
          </button>
          <button
            onClick={() => setStatusFilter('hidden')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              statusFilter === 'hidden'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Hidden ({hiddenCount})
          </button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <MessageSquare size={36} className="mx-auto text-slate-300 mb-3" />
            <h4 className="text-sm font-bold text-slate-700">No reviews found</h4>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try searching with different keywords.' : 'No reviews found for this filter.'}
            </p>
          </div>
        ) : (
          filteredReviews.map((review) => {
            const isHidden = review.is_hidden || hiddenIds.includes(review.id)

            return (
              <div
                key={review.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                  isHidden ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  {/* Left: Review Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900">{review.name}</h4>

                      {/* Stars */}
                      <div className="flex text-amber-400 gap-0.5">
                        {Array.from({ length: review.rating || 5 }).map((_, i) => (
                          <Star key={i} size={13} fill="currentColor" />
                        ))}
                      </div>

                      {/* Status Badge */}
                      {isHidden ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                          <EyeOff size={11} />
                          Hidden from Store
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <Eye size={11} />
                          Visible on Store
                        </span>
                      )}

                      {/* Source tag */}
                      {review.is_seed ? (
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          Default Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-100">
                          <Sparkles size={10} />
                          Customer Submission
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-semibold">
                      {review.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-rose-400" />
                          {review.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {review.date || 'Recent'}
                      </span>
                    </div>

                    {/* Comment text */}
                    <p className="text-xs text-slate-700 leading-relaxed pt-1 italic font-medium">
                      "{review.comment}"
                    </p>
                  </div>

                  {/* Right: Action Buttons (Show/Hide, Delete) */}
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3 md:border-t-0 md:pt-0">
                    {/* Toggle Show / Hide */}
                    <button
                      onClick={() => handleToggleVisibility(review)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                        isHidden
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-100'
                          : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-100'
                      }`}
                      title={isHidden ? 'Show on store' : 'Hide from store'}
                    >
                      {isHidden ? (
                        <>
                          <Eye size={14} />
                          <span>Show</span>
                        </>
                      ) : (
                        <>
                          <EyeOff size={14} />
                          <span>Hide</span>
                        </>
                      )}
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteReview(review)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                      title="Permanently delete review"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Manual Review Modal for Admin */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 p-6">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500 border border-rose-100">
                <Plus size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Add New Review
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Create a verified customer review as admin
                </p>
              </div>
            </div>

            <form onSubmit={handleAddManualReview} className="mt-5 space-y-4">
              {modalError && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 border border-rose-100">
                  {modalError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tanvir Ahmed"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rating
                </label>
                <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewRating(star)}
                      className="p-1 focus:outline-none transition-colors text-slate-400 hover:text-amber-400"
                    >
                      <Star
                        size={18}
                        fill={newRating >= star ? 'currentColor' : 'none'}
                        className={newRating >= star ? 'text-amber-400 stroke-amber-400' : 'text-slate-300'}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-600 ml-2">
                    {newRating} Star{newRating > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location / City (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dhanmondi, Dhaka"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Review / Comment *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Write customer review regarding product quality, fit, delivery, etc..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-rose-100 transition-colors disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{isSubmitting ? 'Saving...' : 'Add Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

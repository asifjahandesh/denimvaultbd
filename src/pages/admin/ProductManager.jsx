import React, { useState } from 'react'
import { supabase } from '../../supabase'
import { Plus, Edit2, Trash2, Upload, X, Package, Tag, Layers, RefreshCw, CheckSquare } from 'lucide-react'
import {
  ITEM_CATEGORIES,
  CATEGORY_OPTIONS,
  TOPS_SIZES,
  JEANS_SIZES,
  getCategorySizes,
  parseProductSizes,
  encodeProductDescription,
  calculateTotalStock
} from '../../utils/productSizes'

export default function ProductManager({ products, onProductUpdate }) {
  const [editingProduct, setEditingProduct] = useState(null)
  const [showForm, setShowForm] = useState(false)

  // Form Fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [discountPrice, setDiscountPrice] = useState('')
  const [stock, setStock] = useState('')
  const [category, setCategory] = useState(ITEM_CATEGORIES.TOPS)
  const [sizeStock, setSizeStock] = useState({})
  const [images, setImages] = useState([]) // Array of uploaded image URLs or selected files

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Category change handler
  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory)
    const newSizes = getCategorySizes(newCategory)
    const updated = {}
    newSizes.forEach((sz) => {
      updated[sz] = sizeStock[sz] !== undefined ? sizeStock[sz] : 10
    })
    setSizeStock(updated)
    setStock(calculateTotalStock(updated))
  }

  // Size stock change handler
  const handleSizeStockChange = (size, value) => {
    const val = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0)
    const updated = {
      ...sizeStock,
      [size]: val
    }
    setSizeStock(updated)
    const total = calculateTotalStock(updated)
    setStock(total)
  }

  // Toggle form for adding a product
  const handleAddNew = () => {
    setEditingProduct(null)
    setName('')
    setDescription('')
    setPrice('')
    setDiscountPrice('')
    setCategory(ITEM_CATEGORIES.TOPS)
    const initialSizes = {}
    TOPS_SIZES.forEach((sz) => { initialSizes[sz] = 10 })
    setSizeStock(initialSizes)
    setStock(calculateTotalStock(initialSizes))
    setImages([])
    setError('')
    setShowForm(true)
  }

  // Populate form for editing a product
  const handleEdit = (product) => {
    const { cleanDescription, sizeStock: parsedSizes, category: parsedCategory, allSizes } = parseProductSizes(product)
    setEditingProduct(product)
    setName(product.name)
    setDescription(cleanDescription)
    setPrice(product.price)
    setDiscountPrice(product.discount_price || '')
    setCategory(parsedCategory)

    const loadedSizes = {}
    allSizes.forEach((sz) => {
      loadedSizes[sz] = parsedSizes[sz] !== undefined ? parsedSizes[sz] : 0
    })
    const hasAnyStock = Object.values(loadedSizes).some((v) => Number(v) > 0)
    if (!hasAnyStock && product.stock > 0) {
      const perSize = Math.max(1, Math.floor(product.stock / allSizes.length))
      allSizes.forEach((sz) => { loadedSizes[sz] = perSize })
    }

    setSizeStock(loadedSizes)
    setStock(calculateTotalStock(loadedSizes) || product.stock || '')
    setImages(product.image_urls || [])
    setError('')
    setShowForm(true)
  }

  // Handle image upload to Supabase Storage bucket 'product-images'
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    setError('')

    const uploadedUrls = [...images]

    for (let file of files) {
      // Create a unique file name to avoid duplicates
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      const filePath = `products/${fileName}`

      try {
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        // Get public url
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl)
        }
      } catch (err) {
        console.error('Error uploading image:', err)
        setError('কিছু ছবি আপলোড হতে সমস্যা হয়েছে। অনুগ্রহ করে স্টোরেজ বাকেট চেক করুন।')
      }
    }

    setImages(uploadedUrls)
    setUploading(false)
  }

  // Remove uploaded image from state
  const handleRemoveImage = (index) => {
    setImages(images.filter((_, idx) => idx !== index))
  }

  // Handle Form Submit (Insert / Update)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) return setError('প্রোডাক্টের নাম দিন')
    if (!price || Number(price) <= 0) return setError('সঠিক মূল্য দিন')
    if (discountPrice && Number(discountPrice) >= Number(price)) return setError('ছাড়ের মূল্য সাধারণ মূল্যের চেয়ে কম হতে হবে')
    const totalCalc = calculateTotalStock(sizeStock)
    const finalStock = Number(stock) >= 0 && stock !== '' ? Number(stock) : totalCalc

    const encodedDescription = encodeProductDescription(description, sizeStock)

    const productData = {
      name,
      description: encodedDescription || null,
      price: Number(price),
      discount_price: discountPrice ? Number(discountPrice) : null,
      stock: finalStock,
      category: category || ITEM_CATEGORIES.TOPS,
      image_urls: images
    }

    try {
      if (editingProduct) {
        // Update product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)

        if (error) throw error
      } else {
        // Insert product
        const { error } = await supabase
          .from('products')
          .insert([productData])

        if (error) throw error
      }

      setShowForm(false)
      onProductUpdate() // refresh list in dashboard
    } catch (err) {
      console.error(err)
      setError('পণ্যটি সংরক্ষণ করতে সমস্যা হয়েছে। ডাটাবেজ কানেকশন চেক করুন।')
    } finally {
      setLoading(false)
    }
  }

  // Handle product deletion
  const handleDelete = async (productId) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই পণ্যটি মুছে ফেলতে চান?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error
      onProductUpdate()
    } catch (err) {
      console.error(err)
      alert('পণ্যটি মুছে ফেলা সম্ভব হয়নি।')
    }
  }

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-800">পণ্য ব্যবস্থাপনা (Products)</h2>
          <p class="text-xs text-slate-500">স্টোরের প্রোডাক্ট যোগ, এডিট এবং ডিলিট করার নিয়ন্ত্রণ প্যানেল।</p>
        </div>
        {!showForm && (
          <button
            onClick={handleAddNew}
            class="flex items-center gap-1 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-rose-600 transition-colors"
          >
            <Plus size={16} />
            নতুন প্রোডাক্ট যোগ করুন
          </button>
        )}
      </div>

      {/* CRUD Form Drawer/Block */}
      {showForm && (
        <div class="rounded-3xl border border-slate-100 bg-white p-5 shadow-premium animate-soft-pulse">
          <div class="flex items-center justify-between border-b border-slate-50 pb-4 mb-5">
            <h3 class="text-sm font-bold text-slate-800">
              {editingProduct ? 'প্রোডাক্ট এডিট করুন' : 'নতুন প্রোডাক্ট যোগ করুন'}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              class="text-xs text-slate-400 hover:text-slate-600"
            >
              বাতিল করুন
            </button>
          </div>

          {error && (
            <div class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} class="space-y-5">
            <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Product Name */}
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1.5">প্রোডাক্টের নাম *</label>
                <input
                  type="text"
                  required
                  placeholder="উদা: প্রিমিয়াম জেন্টস ওয়াচ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
                />
              </div>

              {/* Product Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">প্রোডাক্ট ক্যাটাগরি (Item Type) *</label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-rose-400"
                >
                  <option value={ITEM_CATEGORIES.TOPS}>Tops item (টপস / শার্ট / টি-শার্ট / পোলো)</option>
                  <option value={ITEM_CATEGORIES.JEANS_PANTS}>Jeans/Pants item (জিন্স / প্যান্ট / ট্রাউজার)</option>
                </select>
              </div>

              {/* Pricing details */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">মূল্য (Price) *</label>
                <input
                  type="number"
                  required
                  placeholder="৳ ১,৫০০"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">ছাড়ের মূল্য (Discount Price - ঐচ্ছিক)</label>
                <input
                  type="number"
                  placeholder="৳ ১,২০০"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
                />
              </div>

              {/* Size & Stock Declaration Panel */}
              <div className="md:col-span-2 rounded-2xl border border-slate-200/90 bg-slate-50 p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Layers size={14} className="text-rose-500" />
                      সাইজ ও স্টক বিবরণ ({category === ITEM_CATEGORIES.TOPS ? 'Tops: S, M, L, XL, XXL' : 'Jeans/Pants: 28, 30, 32, 34, 36, 38, 40, 42'})
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      যেসব সাইজের স্টক ১ বা তার বেশি থাকবে, ক্রেতারা শুধু সেই সাইজগুলোই অর্ডার করতে পারবে। স্টক ০ থাকলে ক্রেতারা তা নির্বাচন করতে পারবে না।
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                      মোট স্টক: <strong className="text-rose-600 font-black">{calculateTotalStock(sizeStock)}</strong> টি
                    </span>
                  </div>
                </div>

                {/* Individual Size Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {getCategorySizes(category).map((sz) => {
                    const isAvail = Number(sizeStock[sz]) > 0
                    return (
                      <div
                        key={sz}
                        className={`rounded-xl border p-2.5 transition-all ${
                          isAvail
                            ? 'border-rose-300 bg-white shadow-sm ring-1 ring-rose-100'
                            : 'border-slate-200 bg-slate-100/60 opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-800">
                            {sz}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                              isAvail
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {isAvail ? `${sizeStock[sz]} টি` : 'স্টক শেষ'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={sizeStock[sz] ?? ''}
                            onChange={(e) => handleSizeStockChange(sz, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-xs font-bold text-slate-800 outline-none focus:border-rose-400"
                          />
                          <span className="text-[10px] text-slate-400 font-semibold">টি</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Total Stock */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">মোট স্টক সংখ্যা (Total Stock) *</label>
                <input
                  type="number"
                  required
                  placeholder="৫০"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400 font-bold text-slate-800"
                />
                <p className="text-[9px] text-slate-400 mt-1">ওপরের সাইজগুলোর যোগফল স্বয়ংক্রিয়ভাবে মোট স্টক হিসেবে গণনা করা হয়।</p>
              </div>

              {/* Images Multi-uploader */}
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1.5">প্রোডাক্টের ছবি আপলোড করুন (একাধিক)</label>
                <div class="relative flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    class="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div class="text-center space-y-1">
                    <Upload size={20} className="mx-auto text-slate-400" />
                    <p class="text-[10px] text-slate-500 font-semibold">ক্লিক করে ছবি সিলেক্ট করুন</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Description */}
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1.5">প্রোডাক্ট বিবরণ (Description)</label>
              <textarea
                rows={3}
                placeholder="প্রোডাক্টের সংক্ষিপ্ত বিবরণ বা বিশেষত্ব..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
              />
            </div>

            {/* Uploaded Images Preview */}
            {images.length > 0 && (
              <div class="space-y-2">
                <p class="text-[10px] font-bold text-slate-400">আপলোডকৃত ছবিসমূহ: {images.length} টি</p>
                <div class="flex flex-wrap gap-3">
                  {images.map((url, idx) => (
                    <div key={idx} class="relative h-16 w-16 rounded-xl overflow-hidden border border-slate-100 group">
                      <img src={url} alt="Uploaded preview" class="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        class="absolute right-1 top-1 rounded-full bg-slate-900/60 p-0.5 text-white hover:bg-rose-600"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div class="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                <RefreshCw size={12} className="animate-spin" />
                <span>ছবি আপলোড হচ্ছে, দয়া করে অপেক্ষা করুন...</span>
              </div>
            )}

            {/* Save Buttons */}
            <div class="flex justify-end gap-3 border-t border-slate-50 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
                class="rounded-xl bg-rose-500 px-6 py-2.5 text-xs font-bold text-white hover:bg-rose-600 shadow-md transition-colors"
              >
                {loading ? 'সংরক্ষণ হচ্ছে...' : 'প্রোডাক্ট সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products list Table */}
      <div class="rounded-3xl border border-slate-100 bg-white p-5 shadow-premium">
        {products.length > 0 ? (
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="text-slate-400 font-bold border-b border-slate-50">
                  <th class="py-3 pr-4">ছবি</th>
                  <th class="py-3 pr-4">প্রোডাক্টের নাম</th>
                  <th class="py-3 pr-4">ক্যাটাগরি</th>
                  <th class="py-3 pr-4">মূল্য ও ছাড়</th>
                  <th class="py-3 pr-4">স্টক</th>
                  <th class="py-3 pr-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                {products.map((product) => {
                  const { cleanDescription, availableSizes, sizeStock: itemSizeStock, category: prodCategory } = parseProductSizes(product)
                  return (
                    <tr key={product.id} class="text-slate-600 font-semibold hover:bg-slate-50/20">
                      <td class="py-3 pr-4">
                        <img
                          src={product.image_urls?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80'}
                          alt={product.name}
                          class="h-10 w-10 rounded-xl object-cover"
                        />
                      </td>
                      <td class="py-3 pr-4">
                        <p class="font-bold text-slate-800">{product.name}</p>
                        <p class="text-[9px] text-slate-400 max-w-xs line-clamp-1">{cleanDescription || 'কোন বিবরণ নেই'}</p>
                      </td>
                      <td class="py-3 pr-4">
                        <div class="space-y-1">
                          <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 font-bold">
                            <Layers size={10} className="text-rose-500" />
                            {prodCategory === ITEM_CATEGORIES.JEANS_PANTS ? 'Jeans/Pants item' : 'Tops item'}
                          </span>
                          {availableSizes.length > 0 && (
                            <div class="flex flex-wrap gap-1 text-[9px] max-w-[150px]">
                              {availableSizes.map((s) => (
                                <span key={s} class="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold border border-rose-100">
                                  {s}{itemSizeStock[s] !== undefined ? ` (${itemSizeStock[s]})` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    <td class="py-3 pr-4">
                      {product.discount_price ? (
                        <div>
                          <p class="font-bold text-rose-600">৳{product.discount_price}</p>
                          <p class="text-[9px] text-slate-400 line-through">৳{product.price}</p>
                        </div>
                      ) : (
                        <p class="font-bold text-slate-800">৳{product.price}</p>
                      )}
                    </td>
                    <td class="py-3 pr-4">
                      {product.stock <= 0 ? (
                        <span class="text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full text-[9px]">আউট অব স্টক</span>
                      ) : product.stock <= 5 ? (
                        <span class="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full text-[9px]">মাত্র {product.stock} টি বাকি</span>
                      ) : (
                        <span class="text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-full text-[9px]">{product.stock} পিস</span>
                      )}
                    </td>
                    <td class="py-3 pr-4 text-right">
                      <div class="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(product)}
                          class="rounded-lg border border-slate-100 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                          title="এডিট"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          class="rounded-lg border border-rose-50 p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div class="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <Package size={24} className="text-slate-300" />
            <span>কোন পণ্য খুঁজে পাওয়া যায়নি। ওপরের বাটনে ক্লিক করে নতুন পণ্য যোগ করুন।</span>
          </div>
        )}
      </div>
    </div>
  )
}

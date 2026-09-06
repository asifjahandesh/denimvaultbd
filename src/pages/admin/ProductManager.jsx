import React, { useState } from 'react'
import { supabase } from '../../supabase'
import { Plus, Edit2, Trash2, Upload, X, Package, Tag, Layers, RefreshCw, CheckSquare, Truck } from 'lucide-react'
import RichTextEditor from '../../components/admin/RichTextEditor'
import {
  ITEM_CATEGORIES,
  CATEGORY_OPTIONS,
  TOPS_SIZES,
  JEANS_SIZES,
  getCategorySizes,
  parseProductSizes,
  encodeProductDescription,
  calculateTotalStock,
  stripHtml
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
  const [isFreeDelivery, setIsFreeDelivery] = useState(false)
  const [entryStock, setEntryStock] = useState('')

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
    setIsFreeDelivery(false)
    setEntryStock('')
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
    const { cleanDescription, sizeStock: parsedSizes, category: parsedCategory, allSizes, isFreeDelivery: parsedFreeDelivery, entryStock: parsedEntryStock } = parseProductSizes(product)
    setEditingProduct(product)
    setName(product.name)
    setDescription(cleanDescription)
    setPrice(product.price)
    setDiscountPrice(product.discount_price || '')
    setCategory(parsedCategory)
    setIsFreeDelivery(Boolean(parsedFreeDelivery))
    setEntryStock(parsedEntryStock !== null && parsedEntryStock !== undefined ? parsedEntryStock : (product.entry_stock ?? product.stock ?? ''))

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
        setError('Error uploading some images. Please check the storage bucket.')
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

    if (!name.trim()) return setError('Please enter a product name')
    if (!price || Number(price) <= 0) return setError('Please enter a valid price')
    if (discountPrice && Number(discountPrice) >= Number(price)) return setError('Discount price must be less than regular price')
    const totalCalc = calculateTotalStock(sizeStock)
    const finalStock = Number(stock) >= 0 && stock !== '' ? Number(stock) : totalCalc

    // Entry Stock calculation:
    // For editing: use explicit entryStock state if provided, otherwise preserve existing entry_stock or fallback to finalStock
    // For new product: use explicit entryStock if provided, otherwise declared stock is the entry stock
    let finalEntryStock = finalStock
    if (editingProduct) {
      if (entryStock !== '' && !isNaN(Number(entryStock))) {
        finalEntryStock = Number(entryStock)
      } else if (editingProduct.entry_stock !== undefined && editingProduct.entry_stock !== null) {
        finalEntryStock = Number(editingProduct.entry_stock)
      } else {
        finalEntryStock = finalStock
      }
    } else {
      if (entryStock !== '' && !isNaN(Number(entryStock))) {
        finalEntryStock = Number(entryStock)
      } else {
        finalEntryStock = finalStock
      }
    }

    const encodedDescription = encodeProductDescription(description, sizeStock, isFreeDelivery, finalEntryStock)

    const productData = {
      name,
      description: encodedDescription || null,
      price: Number(price),
      discount_price: discountPrice ? Number(discountPrice) : null,
      stock: finalStock,
      entry_stock: finalEntryStock,
      category: category || ITEM_CATEGORIES.TOPS,
      image_urls: images,
      is_free_delivery: Boolean(isFreeDelivery)
    }

    try {
      if (editingProduct) {
        // Update product
        let { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)

        // Fallback: If is_free_delivery or entry_stock columns don't exist yet in Supabase
        if (error && error.message && (error.message.includes('is_free_delivery') || error.message.includes('entry_stock'))) {
          const fallbackData = { ...productData }
          if (error.message.includes('is_free_delivery')) delete fallbackData.is_free_delivery
          if (error.message.includes('entry_stock')) delete fallbackData.entry_stock
          let retry = await supabase
            .from('products')
            .update(fallbackData)
            .eq('id', editingProduct.id)
          error = retry.error

          if (error && error.message && (error.message.includes('is_free_delivery') || error.message.includes('entry_stock'))) {
            delete fallbackData.is_free_delivery
            delete fallbackData.entry_stock
            const retry2 = await supabase
              .from('products')
              .update(fallbackData)
              .eq('id', editingProduct.id)
            error = retry2.error
          }
        }

        if (error) throw error
      } else {
        // Insert product
        let { error } = await supabase
          .from('products')
          .insert([productData])

        // Fallback: If is_free_delivery or entry_stock columns don't exist yet in Supabase
        if (error && error.message && (error.message.includes('is_free_delivery') || error.message.includes('entry_stock'))) {
          const fallbackData = { ...productData }
          if (error.message.includes('is_free_delivery')) delete fallbackData.is_free_delivery
          if (error.message.includes('entry_stock')) delete fallbackData.entry_stock
          let retry = await supabase
            .from('products')
            .insert([fallbackData])
          error = retry.error

          if (error && error.message && (error.message.includes('is_free_delivery') || error.message.includes('entry_stock'))) {
            delete fallbackData.is_free_delivery
            delete fallbackData.entry_stock
            const retry2 = await supabase
              .from('products')
              .insert([fallbackData])
            error = retry2.error
          }
        }

        if (error) throw error
      }

      setShowForm(false)
      onProductUpdate() // refresh list in dashboard
    } catch (err) {
      console.error(err)
      setError('Failed to save product. Please check database connection.')
    } finally {
      setLoading(false)
    }
  }

  // Handle product deletion
  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error
      onProductUpdate()
    } catch (err) {
      console.error(err)
      alert('Failed to delete product.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Products Management</h2>
          <p className="text-xs text-slate-500">Manage, add, edit, and organize store products.</p>
        </div>
        {!showForm && (
          <button
            onClick={handleAddNew}
            className="flex items-center gap-1 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-rose-600 transition-colors"
          >
            <Plus size={16} />
            Add New Product
          </button>
        )}
      </div>

      {/* CRUD Form Drawer/Block */}
      {showForm && (
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-premium">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-5">
            <h3 className="text-sm font-bold text-slate-800">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Cotton Shirt"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
                />
              </div>

              {/* Product Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Product Category (Item Type) *</label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-rose-400"
                >
                  <option value={ITEM_CATEGORIES.TOPS}>Tops item (Shirts, T-Shirts, Polos, Hoodies)</option>
                  <option value={ITEM_CATEGORIES.JEANS_PANTS}>Jeans/Pants item (Jeans, Trousers, Cargo)</option>
                </select>
              </div>

              {/* Pricing details */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Price (৳) *</label>
                <input
                  type="number"
                  required
                  placeholder="1500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Discount Price (৳ - Optional)</label>
                <input
                  type="number"
                  placeholder="1200"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400"
                />
              </div>

              {/* Free Delivery Toggle Checkbox */}
              <div className="md:col-span-2">
                <label className={`flex items-start gap-3 rounded-2xl border p-3.5 sm:p-4 cursor-pointer transition-all ${
                  isFreeDelivery
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-200'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}>
                  <input
                    type="checkbox"
                    checked={isFreeDelivery}
                    onChange={(e) => setIsFreeDelivery(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Truck size={16} className={isFreeDelivery ? 'text-emerald-600' : 'text-slate-400'} />
                      <span className="text-xs font-bold text-slate-800">
                        Free Delivery
                      </span>
                      {isFreeDelivery && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      When checked, no delivery fee is added for customers (Free Delivery ৳0). If unchecked, standard delivery fee (৳120) applies.
                    </p>
                  </div>
                </label>
              </div>

              {/* Size & Stock Declaration Panel */}
              <div className="md:col-span-2 rounded-2xl border border-slate-200/90 bg-slate-50 p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Layers size={14} className="text-rose-500" />
                      Size & Stock Breakdown ({category === ITEM_CATEGORIES.TOPS ? 'Tops: S, M, L, XL, XXL' : 'Jeans/Pants: 28, 30, 32, 34, 36, 38, 40, 42'})
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Sizes with 1 or more in stock will be available for customers. Sizes with 0 stock will be disabled.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                      Total Stock: <strong className="text-rose-600 font-black">{calculateTotalStock(sizeStock)}</strong> pcs
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
                            {isAvail ? `${sizeStock[sz]} pcs` : 'Out of Stock'}
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
                          <span className="text-[10px] text-slate-400 font-semibold">pcs</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Total Stock */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Current Total Stock *</label>
                <input
                  type="number"
                  required
                  placeholder="50"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400 font-bold text-slate-800"
                />
                <p className="text-[9px] text-slate-400 mt-1">Sum of sizes above is automatically set as total stock.</p>
              </div>

              {/* Entry Stock */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Initial Entry Stock</label>
                <input
                  type="number"
                  placeholder="Initial stock (defaults to current stock if empty)"
                  value={entryStock}
                  onChange={(e) => setEntryStock(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-rose-400 font-bold text-slate-800"
                />
                <p className="text-[9px] text-slate-400 mt-1">Declared stock when product was created. Used for inventory tracking.</p>
              </div>

              {/* Images Multi-uploader */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Upload Product Images (Multiple)</label>
                <div className="relative flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="text-center space-y-1">
                    <Upload size={20} className="mx-auto text-slate-400" />
                    <p className="text-[10px] text-slate-500 font-semibold">Click or drag images to upload</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Description */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                Product Description (Rich Text Editor - Bold, Italic, Sizes, Colors, etc.)
              </label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Write compelling product description, sizing guide, or key features here..."
              />
            </div>

            {/* Uploaded Images Preview */}
            {images.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400">Uploaded Images: {images.length}</p>
                <div className="flex flex-wrap gap-3">
                  {images.map((url, idx) => (
                    <div key={idx} className="relative h-16 w-16 rounded-xl overflow-hidden border border-slate-100 group">
                      <img src={url} alt="Uploaded preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute right-1 top-1 rounded-full bg-slate-900/60 p-0.5 text-white hover:bg-rose-600"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                <RefreshCw size={12} className="animate-spin" />
                <span>Uploading images, please wait...</span>
              </div>
            )}

            {/* Save Buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-50 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
                className="rounded-xl bg-rose-500 px-6 py-2.5 text-xs font-bold text-white hover:bg-rose-600 shadow-md transition-colors"
              >
                {loading ? 'Saving...' : (editingProduct ? 'Save Changes' : 'Create Product')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products list Table */}
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-premium">
        {products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-50">
                  <th className="py-3 pr-4">Image</th>
                  <th className="py-3 pr-4">Product Name</th>
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 pr-4">Price & Discount</th>
                  <th className="py-3 pr-4">Stock</th>
                  <th className="py-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map((product) => {
                  const { cleanDescription, availableSizes, sizeStock: itemSizeStock, category: prodCategory, isFreeDelivery: itemFreeDelivery } = parseProductSizes(product)
                  return (
                    <tr key={product.id} className="text-slate-600 font-semibold hover:bg-slate-50/20">
                      <td className="py-3 pr-4">
                        <img
                          src={product.image_urls?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80'}
                          alt={product.name}
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-slate-800">{product.name}</p>
                        <p className="text-[9px] text-slate-400 max-w-xs line-clamp-1">{stripHtml(cleanDescription) || 'No description provided'}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 font-bold">
                            <Layers size={10} className="text-rose-500" />
                            {prodCategory === ITEM_CATEGORIES.JEANS_PANTS ? 'Jeans/Pants item' : 'Tops item'}
                          </span>
                          {availableSizes.length > 0 && (
                            <div className="flex flex-wrap gap-1 text-[9px] max-w-[150px]">
                              {availableSizes.map((s) => (
                                <span key={s} className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold border border-rose-100">
                                  {s}{itemSizeStock[s] !== undefined ? ` (${itemSizeStock[s]})` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    <td className="py-3 pr-4">
                      {product.discount_price ? (
                        <div>
                          <p className="font-bold text-rose-600">৳{product.discount_price}</p>
                          <p className="text-[9px] text-slate-400 line-through">৳{product.price}</p>
                        </div>
                      ) : (
                        <p className="font-bold text-slate-800">৳{product.price}</p>
                      )}
                      <div>
                        {itemFreeDelivery ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 mt-1">
                            <Truck size={10} />
                            Free Delivery
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500 mt-1">
                            Delivery: ৳120
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {product.stock <= 0 ? (
                        <span className="text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full text-[9px]">Out of Stock</span>
                      ) : product.stock <= 5 ? (
                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full text-[9px]">Only {product.stock} left</span>
                      ) : (
                        <span className="text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-full text-[9px]">{product.stock} pcs</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(product)}
                          className="rounded-lg border border-slate-100 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="rounded-lg border border-rose-50 p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          title="Delete"
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
          <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <Package size={24} className="text-slate-300" />
            <span>No products found. Click the button above to add a new product.</span>
          </div>
        )}
      </div>
    </div>
  )
}

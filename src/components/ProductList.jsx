import React, { useState, useMemo } from 'react'
import { Filter, Grid, Search } from 'lucide-react'
import { translations } from '../utils/translations'
import ProductCard from './ProductCard'
import { ITEM_CATEGORIES, parseProductSizes, stripHtml } from '../utils/productSizes'

export default function ProductList({ products, loading, lang = 'bn', onOrderClick }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const t = translations[lang]

  // Category filter options aligned with Tops item and Jeans/Pants item
  const categoryOptions = useMemo(() => {
    const defaultLabel = lang === 'bn' ? 'সব প্রোডাক্ট' : 'All Products'
    const topsLabel = lang === 'bn' ? 'Tops item (টপস)' : 'Tops item'
    const jeansLabel = lang === 'bn' ? 'Jeans/Pants item (জিন্স/প্যান্ট)' : 'Jeans/Pants item'

    return [
      { id: 'all', label: defaultLabel },
      { id: ITEM_CATEGORIES.TOPS, label: topsLabel },
      { id: ITEM_CATEGORIES.JEANS_PANTS, label: jeansLabel }
    ]
  }, [lang])

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const { cleanDescription, category: itemCategory } = parseProductSizes(product)

      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stripHtml(cleanDescription).toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory =
        selectedCategory === 'all' || itemCategory === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  return (
    <section id="products" class="scroll-mt-20 bg-slate-50 py-16 md:py-24">
      <div class="mx-auto max-w-6xl px-4">
        {/* Section Header */}
        <div class="text-center">
          <h2 class="text-2xl font-extrabold text-slate-900 md:text-3xl lg:text-4xl">
            {lang === 'bn' ? (
              <>আমাদের <span class="text-rose-500">বিশেষ পণ্যসমূহ</span></>
            ) : (
              <>Our <span class="text-rose-500">Special Products</span></>
            )}
          </h2>
          <p class="mx-auto mt-3 max-w-xl text-xs text-slate-500 md:text-sm">
            {lang === 'bn'
              ? 'বাংলাদেশের সেরা মূল্যে সেরা পণ্যগুলো ক্যাশ অন ডেলিভারিতে সরাসরি পেয়ে যান আপনার ঠিকানায়।'
              : 'Get the best quality products in Bangladesh at the lowest price, delivered cash on delivery to your door.'}
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div class="mt-10 flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-premium md:flex-row md:items-center md:justify-between md:p-6">
          {/* Search Box */}
          <div class="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              class="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-12 pr-4 text-sm outline-none transition-all focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
            />
          </div>

          {/* Category Filter Chips */}
          <div class="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1 flex-shrink-0">
              <Filter size={14} />
              <span>{t.categoryLabel}</span>
            </div>
            {categoryOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedCategory(opt.id)}
                class={`rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === opt.id
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-100 scale-95'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid / Loading State */}
        {loading ? (
          <div class="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} class="animate-pulse rounded-3xl border border-slate-100 bg-white p-4 shadow-premium">
                <div class="aspect-square w-full rounded-2xl bg-slate-100"></div>
                <div class="mt-4 h-6 w-3/4 rounded bg-slate-100"></div>
                <div class="mt-2 h-4 w-1/2 rounded bg-slate-100"></div>
                <div class="mt-6 flex justify-between">
                  <div class="h-6 w-1/3 rounded bg-slate-100"></div>
                  <div class="h-10 w-1/3 rounded-xl bg-slate-100"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div class="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                lang={lang}
                onOrderClick={onOrderClick}
              />
            ))}
          </div>
        ) : (
          <div class="mt-16 text-center">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Grid size={28} />
            </div>
            <h3 class="mt-4 text-base font-bold text-slate-800">{t.noProducts}</h3>
            <p class="mt-1 text-xs text-slate-400">{t.noProductsDesc}</p>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Product Size and Category Utilities for Denim Vault BD
 */

export const ITEM_CATEGORIES = {
  TOPS: 'Tops',
  JEANS_PANTS: 'Jeans/Pants'
}

export const CATEGORY_OPTIONS = [
  {
    id: ITEM_CATEGORIES.TOPS,
    labelBn: 'Tops item (টপস / শার্ট / টি-শার্ট)',
    labelEn: 'Tops item (Shirts, T-Shirts, Polos)',
    sizes: ['S', 'M', 'L', 'XL', 'XXL']
  },
  {
    id: ITEM_CATEGORIES.JEANS_PANTS,
    labelBn: 'Jeans/Pants item (জিন্স / প্যান্ট)',
    labelEn: 'Jeans/Pants item (Jeans, Trousers)',
    sizes: ['28', '30', '32', '34', '36', '38', '40', '42']
  }
]

export const TOPS_SIZES = ['S', 'M', 'L', 'XL', 'XXL']
export const JEANS_SIZES = ['28', '30', '32', '34', '36', '38', '40', '42']

/**
 * Get available sizes list for a given category
 */
export function getCategorySizes(category) {
  const catLower = (category || '').toLowerCase()
  if (catLower.includes('jean') || catLower.includes('pant')) {
    return JEANS_SIZES
  }
  return TOPS_SIZES
}

/**
 * Normalizes a category string to either 'Tops' or 'Jeans/Pants'
 */
export function normalizeCategory(category, productName = '', productDescription = '') {
  const text = `${category || ''} ${productName || ''} ${productDescription || ''}`.toLowerCase()
  if (text.includes('jean') || text.includes('pant') || text.includes('denim')) {
    return ITEM_CATEGORIES.JEANS_PANTS
  }
  return ITEM_CATEGORIES.TOPS
}

/**
 * Parse clean description and sizeStock from product
 */
export function parseProductSizes(product) {
  if (!product) {
    return {
      cleanDescription: '',
      sizeStock: {},
      category: ITEM_CATEGORIES.TOPS,
      allSizes: TOPS_SIZES,
      availableSizes: []
    }
  }

  let sizeStock = {}
  let cleanDescription = product.description || ''

  // 1. Direct property check (if present)
  if (product.size_stock && typeof product.size_stock === 'object') {
    sizeStock = { ...product.size_stock }
  } else if (cleanDescription) {
    // 2. Parse from description comment trailer <!--SIZES:{...}-->
    const match = cleanDescription.match(/<!--SIZES:({[\s\S]*?})-->/)
    if (match) {
      try {
        sizeStock = JSON.parse(match[1])
        cleanDescription = cleanDescription.replace(/<!--SIZES:({[\s\S]*?})-->/, '').trim()
      } catch (e) {
        console.error('Failed to parse size stock from description:', e)
      }
    }
  }

  const category = normalizeCategory(product.category, product.name, cleanDescription)
  const allSizes = getCategorySizes(category)

  // If sizeStock is empty but product has stock, generate initial stock distribution if needed
  const hasConfiguredSizes = Object.keys(sizeStock).length > 0

  // Filter available sizes (where stock > 0)
  const availableSizes = allSizes.filter((size) => {
    if (!hasConfiguredSizes) {
      // Fallback for older products with general stock
      return (product.stock || 0) > 0
    }
    const qty = Number(sizeStock[size])
    return !isNaN(qty) && qty > 0
  })

  return {
    cleanDescription,
    sizeStock,
    category,
    allSizes,
    availableSizes,
    hasConfiguredSizes
  }
}

/**
 * Encodes size stock map into description for safe database storage
 */
export function encodeProductDescription(cleanDescription, sizeStock) {
  const desc = (cleanDescription || '').trim()
  if (!sizeStock || Object.keys(sizeStock).length === 0) {
    return desc
  }
  return `${desc}\n\n<!--SIZES:${JSON.stringify(sizeStock)}-->`
}

/**
 * Calculates total stock from sizeStock map
 */
export function calculateTotalStock(sizeStock) {
  if (!sizeStock || typeof sizeStock !== 'object') return 0
  return Object.values(sizeStock).reduce((total, qty) => {
    const num = Number(qty)
    return total + (!isNaN(num) && num > 0 ? num : 0)
  }, 0)
}

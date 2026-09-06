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
      availableSizes: [],
      hasConfiguredSizes: false,
      isFreeDelivery: false,
      entryStock: null
    }
  }

  let sizeStock = {}
  let isFreeDelivery = false
  let entryStock = product.entry_stock !== undefined && product.entry_stock !== null ? Number(product.entry_stock) : null
  let cleanDescription = product.description || ''

  // 1. Direct property check (if column exists)
  if (product.is_free_delivery === true || product.free_delivery === true) {
    isFreeDelivery = true
  }

  // 2. Direct property check for size_stock
  if (product.size_stock && typeof product.size_stock === 'object') {
    sizeStock = { ...product.size_stock }
  }

  // 3. Parse metadata tags from description
  if (cleanDescription) {
    // Check entry stock marker <!--ENTRY_STOCK:50-->
    const entryMatch = cleanDescription.match(/<!--ENTRY_STOCK:(\d+)-->/)
    if (entryMatch) {
      entryStock = Number(entryMatch[1])
      cleanDescription = cleanDescription.replace(/<!--ENTRY_STOCK:\d+-->/g, '').trim()
    }

    // Check free delivery marker
    if (cleanDescription.includes('<!--FREE_DELIVERY-->')) {
      isFreeDelivery = true
      cleanDescription = cleanDescription.replace(/<!--FREE_DELIVERY-->/g, '').trim()
    }

    // Parse from description comment trailer <!--SIZES:{...}-->
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
    hasConfiguredSizes,
    isFreeDelivery,
    entryStock
  }
}

/**
 * Encodes size stock map, free delivery flag, and entry stock into description for safe database storage
 */
export function encodeProductDescription(cleanDescription, sizeStock, isFreeDelivery = false, entryStock = null) {
  const desc = (cleanDescription || '').trim()
  const parts = []
  if (desc) parts.push(desc)
  if (sizeStock && Object.keys(sizeStock).length > 0) {
    parts.push(`<!--SIZES:${JSON.stringify(sizeStock)}-->`)
  }
  if (isFreeDelivery) {
    parts.push('<!--FREE_DELIVERY-->')
  }
  if (entryStock !== null && entryStock !== undefined && !isNaN(Number(entryStock))) {
    parts.push(`<!--ENTRY_STOCK:${Number(entryStock)}-->`)
  }
  return parts.join('\n\n')
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

/**
 * Strips HTML tags from text for compact cards, summaries, and search queries
 */
export function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Formats rich text description for safe display.
 * If text contains no HTML tags, converts line breaks to <br/>.
 */
export function formatRichText(htmlOrText) {
  if (!htmlOrText) return ''
  const hasHtml = /<[a-z][\s\S]*>/i.test(htmlOrText)
  if (!hasHtml) {
    return htmlOrText.replace(/\n/g, '<br/>')
  }
  return htmlOrText
}


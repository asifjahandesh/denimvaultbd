import React, { useState, useMemo } from 'react'
import { parseProductSizes } from '../../utils/productSizes'
import {
  Boxes,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Eye,
  Search,
  X,
  Clock,
  Layers,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  FileSpreadsheet
} from 'lucide-react'

export default function InventoryManager({ products = [], orders = [], onProductUpdate }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [stockFilter, setStockFilter] = useState('all') // 'all', 'in_stock', 'low_stock', 'out_of_stock'
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Compute inventory data per product
  const inventoryData = useMemo(() => {
    return products.map((product) => {
      const { cleanDescription, sizeStock, category, allSizes, entryStock: parsedEntryStock, isFreeDelivery } = parseProductSizes(product)

      // Find all orders for this product
      const productOrders = orders.filter((o) => {
        const orderPName = (o.product_name || '').trim().toLowerCase()
        const currentPName = (product.name || '').trim().toLowerCase()
        return orderPName === currentPName
      })

      // Count only valid (non-cancelled) orders for sold stock
      const activeOrders = productOrders.filter((o) => o.status !== 'cancelled')
      const totalUnitsSold = activeOrders.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0)
      const totalRevenue = activeOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0)

      // Current stock directly from product.stock
      const currentStock = Number(product.stock || 0)

      // Entry stock:
      // 1. From direct column product.entry_stock if defined
      // 2. Or from parsed description tag
      // 3. Or auto-calculated for historical items as currentStock + totalUnitsSold
      let entryStock = null
      if (product.entry_stock !== undefined && product.entry_stock !== null && !isNaN(Number(product.entry_stock))) {
        entryStock = Number(product.entry_stock)
      } else if (parsedEntryStock !== null && parsedEntryStock !== undefined && !isNaN(Number(parsedEntryStock))) {
        entryStock = Number(parsedEntryStock)
      } else {
        entryStock = currentStock + totalUnitsSold
      }

      // Percentage sold
      const sellThroughPercent = entryStock > 0 ? Math.min(100, Math.round((totalUnitsSold / entryStock) * 100)) : 0

      // Stock status
      let stockStatus = 'in_stock'
      if (currentStock <= 0) {
        stockStatus = 'out_of_stock'
      } else if (currentStock <= 5) {
        stockStatus = 'low_stock'
      }

      const imageUrl = (product.image_urls && product.image_urls.length > 0)
        ? product.image_urls[0]
        : product.image_url || 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300'

      return {
        product,
        category,
        cleanDescription,
        sizeStock,
        allSizes,
        isFreeDelivery,
        imageUrl,
        entryStock,
        currentStock,
        totalUnitsSold,
        totalRevenue,
        sellThroughPercent,
        stockStatus,
        productOrders,
        activeOrders
      }
    })
  }, [products, orders])

  // Overall KPI aggregations
  const overallKPIs = useMemo(() => {
    const totalEntry = inventoryData.reduce((sum, item) => sum + item.entryStock, 0)
    const totalCurrent = inventoryData.reduce((sum, item) => sum + item.currentStock, 0)
    const totalSold = inventoryData.reduce((sum, item) => sum + item.totalUnitsSold, 0)
    const outOfStockCount = inventoryData.filter((item) => item.stockStatus === 'out_of_stock').length
    const lowStockCount = inventoryData.filter((item) => item.stockStatus === 'low_stock').length
    const inStockCount = inventoryData.filter((item) => item.stockStatus === 'in_stock').length
    const turnoverRate = totalEntry > 0 ? Math.round((totalSold / totalEntry) * 100) : 0

    return {
      totalEntry,
      totalCurrent,
      totalSold,
      outOfStockCount,
      lowStockCount,
      inStockCount,
      turnoverRate
    }
  }, [inventoryData])

  // Filter and search
  const filteredInventory = useMemo(() => {
    return inventoryData.filter((item) => {
      const matchesSearch =
        item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStock =
        stockFilter === 'all' || item.stockStatus === stockFilter

      return matchesSearch && matchesStock
    })
  }, [inventoryData, searchQuery, stockFilter])

  // Selected item data for detail modal
  const selectedItemData = useMemo(() => {
    if (!selectedProduct) return null
    return inventoryData.find((item) => item.product.id === selectedProduct.id) || null
  }, [selectedProduct, inventoryData])

  // Aggregate daily sales for selected product
  const dailySalesBreakdown = useMemo(() => {
    if (!selectedItemData) return []
    const map = {}
    selectedItemData.activeOrders.forEach((order) => {
      const dateKey = new Date(order.created_at).toISOString().split('T')[0]
      if (!map[dateKey]) {
        map[dateKey] = {
          dateStr: dateKey,
          formattedDate: new Date(order.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          totalQty: 0,
          totalAmount: 0,
          ordersCount: 0
        }
      }
      map[dateKey].totalQty += (Number(order.quantity) || 1)
      map[dateKey].totalAmount += (Number(order.total_price) || 0)
      map[dateKey].ordersCount += 1
    })

    return Object.values(map).sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr))
  }, [selectedItemData])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200">Delivered</span>
      case 'processing':
        return <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-200">Processing</span>
      case 'confirmed':
        return <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 border border-indigo-200">Confirmed</span>
      case 'cancelled':
        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">Cancelled</span>
      default:
        return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-200">Pending</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Boxes className="text-rose-500" size={22} />
            Inventory Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track initial entry stock, current inventory, and click product images for date-wise sales breakdown reports.
          </p>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">Total Entry Stock</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Package size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{overallKPIs.totalEntry.toLocaleString('en-US')} pcs</div>
          <div className="text-[10px] text-slate-400 mt-1">Total declared stock at upload</div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">Total Current Stock</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Boxes size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{overallKPIs.totalCurrent.toLocaleString('en-US')} pcs</div>
          <div className="text-[10px] text-slate-400 mt-1">Remaining stock after sales</div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">Total Units Sold</span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">{overallKPIs.totalSold.toLocaleString('en-US')} pcs</div>
          <div className="text-[10px] text-slate-400 mt-1">Units sold via confirmed orders</div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">Sell-Through Rate</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{overallKPIs.turnoverRate.toLocaleString('en-US')}%</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {overallKPIs.outOfStockCount > 0 ? `${overallKPIs.outOfStockCount} out of stock` : 'All items in stock'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-rose-400 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStockFilter('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                stockFilter === 'all'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({inventoryData.length})
            </button>
            <button
              onClick={() => setStockFilter('in_stock')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                stockFilter === 'in_stock'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              In Stock ({overallKPIs.inStockCount})
            </button>
            <button
              onClick={() => setStockFilter('low_stock')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                stockFilter === 'low_stock'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Low Stock ({overallKPIs.lowStockCount})
            </button>
            <button
              onClick={() => setStockFilter('out_of_stock')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                stockFilter === 'out_of_stock'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Out of Stock ({overallKPIs.outOfStockCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-rose-50/60 border border-rose-100 rounded-xl px-3 py-2">
          <Eye size={14} className="text-rose-600 shrink-0" />
          <span>
            <strong>Tip:</strong> <strong>Click any product image</strong> or the <strong>'Breakdown Report'</strong> button to see which dates and quantities were sold.
          </span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {filteredInventory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                  <th className="py-3.5 px-4">Product (Click Image)</th>
                  <th className="py-3.5 px-3 text-center">Entry Stock</th>
                  <th className="py-3.5 px-3 text-center">Units Sold</th>
                  <th className="py-3.5 px-3 text-center">Current Stock</th>
                  <th className="py-3.5 px-4">Sell-Through</th>
                  <th className="py-3.5 px-4 text-right">Breakdown Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => {
                  const { product, imageUrl, entryStock, currentStock, totalUnitsSold, sellThroughPercent, stockStatus, category } = item

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Product Thumbnail & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {/* Clickable Image with Zoom & Tooltip */}
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(product)}
                            className="relative group/thumb h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                            title="Click to view detailed sales breakdown report"
                          >
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye size={16} className="drop-shadow" />
                            </div>
                            <span className="sr-only">View Breakdown Report</span>
                          </button>

                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedProduct(product)}
                              className="text-left font-bold text-slate-900 hover:text-rose-600 transition-colors line-clamp-1 block text-xs"
                            >
                              {product.name}
                            </button>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                {category}
                              </span>
                              <span className="text-[11px] font-bold text-rose-600">
                                ৳{(product.discount_price || product.price).toLocaleString('en-US')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Entry Stock */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 border border-blue-100">
                          {entryStock.toLocaleString('en-US')} pcs
                        </span>
                        <span className="block text-[9px] text-slate-400 mt-0.5">Declared Initial</span>
                      </td>

                      {/* Sold Stock */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700 border border-rose-100">
                          {totalUnitsSold.toLocaleString('en-US')} pcs
                        </span>
                        <span className="block text-[9px] text-slate-400 mt-0.5">Sold Units</span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-3 text-center">
                        {stockStatus === 'out_of_stock' && (
                          <span className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1 text-xs font-black text-red-600 border border-red-200">
                            0 pcs (Out)
                          </span>
                        )}
                        {stockStatus === 'low_stock' && (
                          <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 border border-amber-200">
                            {currentStock.toLocaleString('en-US')} pcs (Low)
                          </span>
                        )}
                        {stockStatus === 'in_stock' && (
                          <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
                            {currentStock.toLocaleString('en-US')} pcs
                          </span>
                        )}
                        <span className="block text-[9px] text-slate-400 mt-0.5">Remaining</span>
                      </td>

                      {/* Progress Bar */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-500">Sold</span>
                            <span className="text-rose-600">{sellThroughPercent}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                sellThroughPercent >= 80
                                  ? 'bg-emerald-500'
                                  : sellThroughPercent >= 40
                                  ? 'bg-rose-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${sellThroughPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(product)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                        >
                          <FileSpreadsheet size={13} />
                          Breakdown Report
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Boxes size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-600">No inventory items found</p>
            <p className="text-xs text-slate-400 mt-1">Try a different search query or filter</p>
          </div>
        )}
      </div>

      {/* DETAIL BREAKDOWN REPORT MODAL */}
      {selectedItemData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedProduct(null)}
          />

          {/* Modal Card */}
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <img
                    src={selectedItemData.imageUrl}
                    alt={selectedItemData.product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                      Inventory Breakdown Report
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {selectedItemData.category}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 mt-0.5 line-clamp-1">
                    {selectedItemData.product.name}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* High-level Stock Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3.5">
                  <div className="flex items-center gap-1.5 text-blue-700 text-xs font-bold mb-1">
                    <Package size={14} />
                    Entry Stock
                  </div>
                  <div className="text-xl font-black text-blue-900">
                    {selectedItemData.entryStock.toLocaleString('en-US')} pcs
                  </div>
                  <p className="text-[9px] text-blue-600/80 mt-0.5">Initial stock at upload</p>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3.5">
                  <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold mb-1">
                    <TrendingUp size={14} />
                    Total Sold
                  </div>
                  <div className="text-xl font-black text-rose-900">
                    {selectedItemData.totalUnitsSold.toLocaleString('en-US')} pcs
                  </div>
                  <p className="text-[9px] text-rose-600/80 mt-0.5">Total units sold</p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5">
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1">
                    <Boxes size={14} />
                    Current Stock
                  </div>
                  <div className="text-xl font-black text-emerald-900">
                    {selectedItemData.currentStock.toLocaleString('en-US')} pcs
                  </div>
                  <p className="text-[9px] text-emerald-600/80 mt-0.5">Available in stock now</p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3.5">
                  <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold mb-1">
                    <ShoppingBag size={14} />
                    Total Revenue
                  </div>
                  <div className="text-xl font-black text-amber-900">
                    ৳{selectedItemData.totalRevenue.toLocaleString('en-US')}
                  </div>
                  <p className="text-[9px] text-amber-600/80 mt-0.5">Total gross sales</p>
                </div>
              </div>

              {/* Per-size Stock Breakdown if configured */}
              {selectedItemData.sizeStock && Object.keys(selectedItemData.sizeStock).length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers size={14} className="text-rose-500" />
                      Current Stock by Size (Per-Size Breakdown)
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Total Sizes: {Object.keys(selectedItemData.sizeStock).length}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
                    {Object.entries(selectedItemData.sizeStock).map(([sz, qty]) => {
                      const count = Number(qty) || 0
                      const isAvail = count > 0
                      return (
                        <div
                          key={sz}
                          className={`rounded-xl border p-2 text-center transition-all ${
                            isAvail
                              ? 'border-emerald-200 bg-white shadow-xs'
                              : 'border-slate-200 bg-slate-100/70 opacity-60'
                          }`}
                        >
                          <div className="text-[11px] font-black text-slate-800">{sz}</div>
                          <div className={`text-xs font-extrabold mt-0.5 ${isAvail ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isAvail ? `${count} pcs` : 'Out of stock'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Daily Sales Summary */}
              {dailySalesBreakdown.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar size={14} className="text-rose-500" />
                    Daily Sales Summary (Aggregated by Date)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {dailySalesBreakdown.map((day) => (
                      <div
                        key={day.dateStr}
                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-[11px] font-bold text-slate-800">{day.formattedDate}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{day.ordersCount} order(s)</div>
                        </div>
                        <div className="text-right">
                          <span className="rounded-lg bg-rose-100 px-2 py-1 text-xs font-black text-rose-700">
                            {day.totalQty} sold
                          </span>
                          <div className="text-[10px] font-bold text-slate-700 mt-1">
                            ৳{day.totalAmount.toLocaleString('en-US')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chronological Detailed Orders Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock size={14} className="text-rose-500" />
                    Chronological Sales Log (Date & Time Breakdown)
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    Total Orders: {selectedItemData.productOrders.length}
                  </span>
                </div>

                {selectedItemData.productOrders.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                          <th className="py-3 px-3.5">Date & Time</th>
                          <th className="py-3 px-3">Customer Info</th>
                          <th className="py-3 px-3">Size / Variant</th>
                          <th className="py-3 px-3 text-center">Quantity</th>
                          <th className="py-3 px-3">Total Price</th>
                          <th className="py-3 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedItemData.productOrders.map((order) => {
                          const orderDate = new Date(order.created_at)
                          const formattedDate = orderDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                          const formattedTime = orderDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })

                          return (
                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                              {/* Date & Time */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <div className="font-bold text-slate-800">{formattedDate}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                  <Clock size={10} />
                                  {formattedTime}
                                </div>
                              </td>

                              {/* Customer Details */}
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-800 flex items-center gap-1">
                                  <User size={11} className="text-slate-400" />
                                  {order.customer_name}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Phone size={10} className="text-slate-400" />
                                  {order.phone}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 line-clamp-1 max-w-xs">
                                  <MapPin size={10} className="text-slate-400 shrink-0" />
                                  {order.address}
                                </div>
                              </td>

                              {/* Variant */}
                              <td className="py-3 px-3">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                  {order.product_variant || 'Default'}
                                </span>
                              </td>

                              {/* Quantity Sold */}
                              <td className="py-3 px-3 text-center">
                                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 text-xs font-black text-rose-600 border border-rose-100">
                                  {order.quantity} pcs
                                </span>
                              </td>

                              {/* Price */}
                              <td className="py-3 px-3 font-bold text-slate-800">
                                ৳{Number(order.total_price).toLocaleString('en-US')}
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3 text-center">
                                {getStatusBadge(order.status)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-8 text-center">
                    <ShoppingBag size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-600">No sales recorded yet for this product</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">When new orders arrive, they will appear here chronologically.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              <span className="text-[11px] text-slate-500">
                Initial Entry Stock: <strong>{selectedItemData.entryStock} pcs</strong> | Current Stock: <strong>{selectedItemData.currentStock} pcs</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

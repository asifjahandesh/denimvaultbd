import React, { useState, useMemo } from 'react'
import { supabase } from '../../supabase'
import { Search, Filter, Phone, MapPin, Calendar, Clock, ShoppingCart, User, AlertCircle, Trash2, FileText, Printer, Check } from 'lucide-react'
import InvoiceModal from '../../components/admin/InvoiceModal'

export default function OrderManager({ orders, settings, onOrderUpdate }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [customerHistory, setCustomerHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Invoice Modal State
  const [invoiceOrder, setInvoiceOrder] = useState(null)
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false)

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.phone.includes(searchQuery) ||
        order.product_name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [orders, searchQuery, statusFilter])

  // Update order status in Supabase
  const handleStatusChange = async (orderOrId, newStatus) => {
    const orderId = typeof orderOrId === 'object' && orderOrId ? orderOrId.id : orderOrId
    const targetOrder = typeof orderOrId === 'object' && orderOrId
      ? orderOrId
      : orders.find((o) => o.id === orderId) || (selectedOrder && selectedOrder.id === orderId ? selectedOrder : null)

    // When status is changed to 'confirmed', open invoice modal immediately with zero delay
    if (newStatus === 'confirmed' && targetOrder) {
      setInvoiceOrder({ ...targetOrder, status: 'confirmed' })
      setAutoPrintInvoice(true)
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      onOrderUpdate() // trigger parent data refresh
      
      // Update local selected order view if open
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Failed to update order status.')
    }
  }

  // Delete order permanently from Supabase
  const handleDeleteOrder = async (orderId, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm('Are you sure you want to permanently delete this order? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (error) throw error

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null)
      }
      onOrderUpdate()
    } catch (err) {
      console.error('Error deleting order:', err)
      alert('Failed to delete order. Please check database connection.')
    }
  }

  // Fetch customer order history (by matching phone number)
  const viewCustomerHistory = async (phone) => {
    setHistoryLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCustomerHistory(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleOrderSelect = (order) => {
    setSelectedOrder(order)
    viewCustomerHistory(order.phone)
  }

  return (
    <div class="space-y-6">
      {/* Header */}
      <div>
        <h2 class="text-xl font-bold text-slate-800">Order Management (Orders)</h2>
        <p class="text-xs text-slate-500">Manage customer orders, update statuses, track delivery and records.</p>
      </div>

      {/* Filter and Search Bar */}
      <div class="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-premium md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div class="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            class="w-full rounded-2xl border border-slate-100 bg-slate-50 py-2.5 pl-11 pr-4 text-xs outline-none transition-all focus:border-rose-400 focus:bg-white"
          />
        </div>

        {/* Filter */}
        <div class="flex gap-2 items-center overflow-x-auto pb-1 md:pb-0">
          <div class="flex items-center gap-1.5 text-xs text-slate-400 font-bold flex-shrink-0">
            <Filter size={12} />
            <span>Filter:</span>
          </div>
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'pending', label: 'Pending' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'processing', label: 'Processing' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'cancelled', label: 'Cancelled' }
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setStatusFilter(id)}
              class={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === id
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-100'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid/Table & Details panel */}
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Orders List Table */}
        <div class="rounded-3xl border border-slate-100 bg-white p-5 shadow-premium lg:col-span-2">
          {filteredOrders.length > 0 ? (
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="text-slate-400 font-bold border-b border-slate-50">
                    <th class="py-3 pr-4">Customer & Date</th>
                    <th class="py-3 pr-4">Product & Qty</th>
                    <th class="py-3 pr-4">Total Amount</th>
                    <th class="py-3 pr-4">Status</th>
                    <th class="py-3 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => handleOrderSelect(order)}
                      class={`cursor-pointer transition-colors hover:bg-slate-50/50 ${
                        selectedOrder?.id === order.id ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td class="py-3.5 pr-4">
                        <p class="font-bold text-slate-800">{order.customer_name}</p>
                        <p class="text-[10px] text-slate-400">{order.phone}</p>
                        <p class="text-[9px] text-slate-400 mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </td>
                      <td class="py-3.5 pr-4">
                        <p class="font-bold text-slate-800">{order.product_name}</p>
                        <p class="text-[10px] text-slate-500">
                          {order.product_variant ? `Variant: ${order.product_variant} | ` : ''} Qty: {order.quantity}
                        </p>
                      </td>
                      <td class="py-3.5 pr-4 font-extrabold text-slate-800">
                        ৳{order.total_price}
                      </td>
                      <td class="py-3.5 pr-4">
                        <span class={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          order.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                          order.status === 'confirmed' ? 'bg-blue-50 text-blue-600' :
                          order.status === 'processing' ? 'bg-indigo-50 text-indigo-600' :
                          order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                          {order.status === 'pending' ? 'Pending' :
                           order.status === 'confirmed' ? 'Confirmed' :
                           order.status === 'processing' ? 'Processing' :
                           order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
                        </span>
                      </td>
                      <td class="py-3.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div class="flex items-center justify-end gap-1.5">
                          {order.status === 'pending' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange(order, 'confirmed')
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs transition-all hover:shadow-emerald-200"
                              title="Confirm Order & Generate PDF Invoice"
                            >
                              <Check size={11} strokeWidth={3} />
                              <span>Confirm</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setInvoiceOrder(order)
                              setAutoPrintInvoice(false)
                            }}
                            class="rounded-xl border border-blue-200 bg-blue-50/70 p-1.5 text-blue-600 hover:bg-blue-100 transition-colors"
                            title="View / Download Official PDF Invoice"
                          >
                            <FileText size={13} />
                          </button>
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order, e.target.value)}
                            class="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 outline-none hover:border-slate-300"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteOrder(order.id, e)}
                            class="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div class="py-12 text-center text-xs text-slate-400">
              No orders found.
            </div>
          )}
        </div>

        {/* Selected Order Details Panel */}
        <div class="rounded-3xl border border-slate-100 bg-white p-5 shadow-premium h-fit">
          {selectedOrder ? (
            <div class="space-y-5">
              <div class="flex items-center justify-between border-b border-slate-50 pb-3">
                <h3 class="text-sm font-bold text-slate-800 flex items-center gap-1">
                  <Clock size={14} className="text-rose-500" />
                  Order Details
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  class="text-xs text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>

              {/* Status Selector */}
              <div class="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span class="text-xs font-bold text-slate-500">Current Status:</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder, e.target.value)}
                  class="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Quick Confirm & PDF Button for Pending orders */}
              {selectedOrder.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedOrder, 'confirmed')}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-emerald-100 cursor-pointer"
                >
                  <Check size={14} strokeWidth={3} />
                  <span>Confirm Order & Generate PDF Invoice</span>
                </button>
              )}

              {/* View & Download Official PDF Invoice Button */}
              <button
                type="button"
                onClick={() => {
                  setInvoiceOrder(selectedOrder)
                  setAutoPrintInvoice(false)
                }}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100/80 px-4 py-2 text-xs font-bold text-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                <FileText size={14} />
                <span>View & Download Official PDF Invoice</span>
              </button>

              {/* Customer Details */}
              <div class="space-y-3.5 text-xs">
                <div class="flex items-start gap-2.5">
                  <User size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <p class="font-bold text-slate-800">{selectedOrder.customer_name}</p>
                    <p class="text-[10px] text-slate-400">Customer Name</p>
                  </div>
                </div>

                <div class="flex items-start gap-2.5">
                  <Phone size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <a href={`tel:${selectedOrder.phone}`} class="font-bold text-rose-500 hover:underline">
                      {selectedOrder.phone}
                    </a>
                    <p class="text-[10px] text-slate-400">Phone Number</p>
                  </div>
                </div>

                <div class="flex items-start gap-2.5">
                  <MapPin size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <p class="font-bold text-slate-800">{selectedOrder.address}</p>
                    <p class="text-[10px] text-slate-400">Delivery Address</p>
                  </div>
                </div>

                <div class="flex items-start gap-2.5">
                  <ShoppingCart size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <p class="font-bold text-slate-800">
                      {selectedOrder.product_name} ({selectedOrder.quantity} pcs)
                    </p>
                    {selectedOrder.product_variant && (
                      <p class="text-[10px] text-slate-500">Variant: {selectedOrder.product_variant}</p>
                    )}
                    <p class="text-[10px] text-slate-400">Ordered Product</p>
                  </div>
                </div>

                <div class="flex items-start gap-2.5">
                  <Calendar size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <p class="font-bold text-slate-800">
                      {new Date(selectedOrder.created_at).toLocaleString('en-US')}
                    </p>
                    <p class="text-[10px] text-slate-400">Order Time</p>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div class="flex items-start gap-2.5 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p class="font-semibold text-slate-700 italic">"{selectedOrder.notes}"</p>
                      <p class="text-[9px] text-slate-400 mt-0.5">Customer Special Instructions</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Lifetime History */}
              <div class="border-t border-slate-100 pt-4 space-y-3">
                <h4 class="text-xs font-bold text-slate-800">Customer Order History</h4>
                {historyLoading ? (
                  <p class="text-center text-[10px] text-slate-400">Loading...</p>
                ) : customerHistory.length > 1 ? (
                  <div class="space-y-2 max-h-40 overflow-y-auto">
                    {customerHistory
                      .filter((h) => h.id !== selectedOrder.id)
                      .map((h) => (
                        <div key={h.id} class="flex items-center justify-between rounded-xl bg-slate-50 p-2 text-[10px] border border-slate-100">
                          <div>
                            <p class="font-bold text-slate-700 line-clamp-1">{h.product_name}</p>
                            <p class="text-[9px] text-slate-400">
                              {new Date(h.created_at).toLocaleDateString('en-US')}
                            </p>
                          </div>
                          <span class="font-extrabold text-slate-800">৳{h.total_price}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p class="text-[10px] text-slate-400">This is the customer's first order.</p>
                )}
              </div>

              {/* Delete Action in Detail Drawer */}
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500 hover:text-white transition-all shadow-xs"
                >
                  <Trash2 size={14} />
                  Delete This Order
                </button>
              </div>
            </div>
          ) : (
            <div class="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <AlertCircle size={24} className="text-slate-300" />
              <span>Click on any order row to view details and customer history.</span>
            </div>
          )}
        </div>
      </div>

      {/* Official PDF Invoice Modal */}
      <InvoiceModal
        isOpen={!!invoiceOrder}
        order={invoiceOrder}
        settings={settings}
        autoPrint={autoPrintInvoice}
        onClose={() => {
          setInvoiceOrder(null)
          setAutoPrintInvoice(false)
        }}
      />
    </div>
  )
}

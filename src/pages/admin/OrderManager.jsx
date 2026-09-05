import React, { useState, useMemo } from 'react'
import { supabase } from '../../supabase'
import { Search, Filter, Phone, MapPin, Calendar, Clock, ShoppingCart, User, AlertCircle } from 'lucide-react'

export default function OrderManager({ orders, onOrderUpdate }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [customerHistory, setCustomerHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

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
  const handleStatusChange = async (orderId, newStatus) => {
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
      alert('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।')
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
        <h2 class="text-xl font-bold text-slate-800">অর্ডার ব্যবস্থাপনা (Orders)</h2>
        <p class="text-xs text-slate-500">আপনার স্টোরের সকল গ্রাহকের অর্ডার বিবরণ পরিচালনা করুন।</p>
      </div>

      {/* Filter and Search Bar */}
      <div class="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-premium md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div class="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="নাম, মোবাইল নাম্বার বা প্রডাক্ট দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            class="w-full rounded-2xl border border-slate-100 bg-slate-50 py-2.5 pl-11 pr-4 text-xs outline-none transition-all focus:border-rose-400 focus:bg-white"
          />
        </div>

        {/* Filter */}
        <div class="flex gap-2 items-center overflow-x-auto pb-1 md:pb-0">
          <div class="flex items-center gap-1.5 text-xs text-slate-400 font-bold flex-shrink-0">
            <Filter size={12} />
            <span>ফিল্টার:</span>
          </div>
          {['all', 'pending', 'confirmed', 'processing', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              class={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-100'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {status === 'all' ? 'সব অর্ডার' :
               status === 'pending' ? 'পেন্ডিং' :
               status === 'confirmed' ? 'কনফার্মড' :
               status === 'processing' ? 'প্রসেসিং' :
               status === 'delivered' ? 'ডেলিভার্ড' : 'বাতিল'}
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
                    <th class="py-3 pr-4">গ্রাহক ও তারিখ</th>
                    <th class="py-3 pr-4">পণ্য ও পরিমাণ</th>
                    <th class="py-3 pr-4">মোট বিল</th>
                    <th class="py-3 pr-4">স্ট্যাটাস</th>
                    <th class="py-3 pr-4 text-right">অ্যাকশন</th>
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
                          {new Date(order.created_at).toLocaleDateString('bn-BD')}
                        </p>
                      </td>
                      <td class="py-3.5 pr-4">
                        <p class="font-bold text-slate-800">{order.product_name}</p>
                        <p class="text-[10px] text-slate-500">
                          {order.product_variant ? `ভেরিয়েন্ট: ${order.product_variant} | ` : ''} পরিমাণ: {order.quantity} টি
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
                          {order.status === 'pending' ? 'পেন্ডিং' :
                           order.status === 'confirmed' ? 'কনফার্মড' :
                           order.status === 'processing' ? 'প্রসেসিং' :
                           order.status === 'delivered' ? 'ডেলিভার্ড' : 'বাতিল'}
                        </span>
                      </td>
                      <td class="py-3.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          class="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 outline-none hover:border-slate-300"
                        >
                          <option value="pending">পেন্ডিং</option>
                          <option value="confirmed">কনফার্মড</option>
                          <option value="processing">প্রসেসিং</option>
                          <option value="delivered">ডেলিভার্ড</option>
                          <option value="cancelled">বাতিল</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div class="py-12 text-center text-xs text-slate-400">
              কোন অর্ডার খুঁজে পাওয়া যায়নি।
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
                  অর্ডার বিস্তারিত
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  class="text-xs text-slate-400 hover:text-slate-600"
                >
                  বন্ধ করুন
                </button>
              </div>

              {/* Status Selector */}
              <div class="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span class="text-xs font-bold text-slate-500">বর্তমান স্ট্যাটাস:</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                  class="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="pending">পেন্ডিং</option>
                  <option value="confirmed">কনফার্মড</option>
                  <option value="processing">প্রসেসিং</option>
                  <option value="delivered">ডেলিভার্ড</option>
                  <option value="cancelled">বাতিল</option>
                </select>
              </div>

              {/* Customer Details */}
              <div class="space-y-3.5 text-xs">
                <div class="flex items-start gap-2.5">
                  <User size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <p class="font-bold text-slate-800">{selectedOrder.customer_name}</p>
                    <p class="text-[10px] text-slate-400">গ্রাহকের নাম</p>
                  </div>
                </div>

                <div class="flex items-start gap-2.5">
                  <Phone size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <a href={`tel:${selectedOrder.phone}`} class="font-bold text-rose-500 hover:underline">
                      {selectedOrder.phone}
                    </a>
                    <p class="text-[10px] text-slate-400">মোবাইল নাম্বার</p>
                  </div>
                </div>

                <div class="flex items-start gap-2.5">
                  <MapPin size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <p class="font-bold text-slate-800">{selectedOrder.address}</p>
                    <p class="text-[10px] text-slate-400">ডেলিভারি ঠিকানা</p>
                  </div>
                </div>

                <div class="flex items-start gap-2.5">
                  <ShoppingCart size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <p class="font-bold text-slate-800">
                      {selectedOrder.product_name} ({selectedOrder.quantity} পিস)
                    </p>
                    {selectedOrder.product_variant && (
                      <p class="text-[10px] text-slate-500">কালার/সাইজ: {selectedOrder.product_variant}</p>
                    )}
                    <p class="text-[10px] text-slate-400">অর্ডারকৃত পণ্য</p>
                  </div>
                </div>

                <div class="flex items-start gap-2.5">
                  <Calendar size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <p class="font-bold text-slate-800">
                      {new Date(selectedOrder.created_at).toLocaleString('bn-BD')}
                    </p>
                    <p class="text-[10px] text-slate-400">অর্ডারের সময়</p>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div class="flex items-start gap-2.5 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p class="font-semibold text-slate-700 italic">"{selectedOrder.notes}"</p>
                      <p class="text-[9px] text-slate-400 mt-0.5">গ্রাহকের বিশেষ নির্দেশনা</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Lifetime History */}
              <div class="border-t border-slate-100 pt-4 space-y-3">
                <h4 class="text-xs font-bold text-slate-800">ক্রেতার পূর্বের অর্ডার ইতিহাস (History)</h4>
                {historyLoading ? (
                  <p class="text-center text-[10px] text-slate-400">লোড হচ্ছে...</p>
                ) : customerHistory.length > 1 ? (
                  <div class="space-y-2 max-h-40 overflow-y-auto">
                    {customerHistory
                      .filter((h) => h.id !== selectedOrder.id)
                      .map((h) => (
                        <div key={h.id} class="flex items-center justify-between rounded-xl bg-slate-50 p-2 text-[10px] border border-slate-100">
                          <div>
                            <p class="font-bold text-slate-700 line-clamp-1">{h.product_name}</p>
                            <p class="text-[9px] text-slate-400">
                              {new Date(h.created_at).toLocaleDateString('bn-BD')}
                            </p>
                          </div>
                          <span class="font-extrabold text-slate-800">৳{h.total_price}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p class="text-[10px] text-slate-400">এটি এই ক্রেতার প্রথম অর্ডার।</p>
                )}
              </div>
            </div>
          ) : (
            <div class="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <AlertCircle size={24} className="text-slate-300" />
              <span>যেকোনো অর্ডারের লাইনে ক্লিক করে বিস্তারিত ও কাস্টমার হিস্ট্রি দেখুন।</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

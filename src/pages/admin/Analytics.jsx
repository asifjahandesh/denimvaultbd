import React, { useMemo } from 'react'
import { DollarSign, ShoppingBag, Calendar, Package, TrendingUp } from 'lucide-react'

export default function Analytics({ orders, products }) {
  
  const stats = useMemo(() => {
    // 1. Total Orders
    const totalOrders = orders.length

    // 2. Today's Orders & Today's Revenue
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayOrdersList = orders.filter((o) => {
      const orderDate = new Date(o.created_at)
      return orderDate >= today
    })
    
    const todayOrders = todayOrdersList.length

    // 3. Total Revenue (excl. cancelled orders)
    const validOrders = orders.filter((o) => o.status !== 'cancelled')
    const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0)
    
    // 4. Today's Revenue
    const todayRevenue = todayOrdersList
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_price || 0), 0)

    // 5. Total Products
    const totalProducts = products.length

    return {
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      totalProducts
    }
  }, [orders, products])

  // Get recent 5 orders
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
  }, [orders])

  const statCards = [
    {
      title: 'Total Revenue',
      value: `৳${stats.totalRevenue.toLocaleString()}`,
      subtitle: `Today's Revenue: ৳${stats.todayRevenue.toLocaleString()}`,
      icon: <DollarSign size={20} />,
      color: 'from-emerald-500 to-teal-600 shadow-emerald-100',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      subtitle: `Today's Orders: ${stats.todayOrders}`,
      icon: <ShoppingBag size={20} />,
      color: 'from-rose-500 to-rose-600 shadow-rose-100',
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      subtitle: 'Active product inventory',
      icon: <Package size={20} />,
      color: 'from-indigo-500 to-blue-600 shadow-indigo-100',
    },
    {
      title: "Today's Orders",
      value: stats.todayOrders,
      subtitle: 'Review pending orders',
      icon: <Calendar size={20} />,
      color: 'from-amber-500 to-orange-600 shadow-amber-100',
    },
  ]

  return (
    <div class="space-y-8">
      {/* Page Title */}
      <div>
        <h2 class="text-xl font-bold text-slate-800">Analytics Dashboard</h2>
        <p class="text-xs text-slate-500">Overall performance report of your store business and orders.</p>
      </div>

      {/* Stats Cards Grid */}
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            class="overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-premium"
          >
            <div class="flex items-center justify-between">
              <div class="space-y-2">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.title}</p>
                <h3 class="text-2xl font-black text-slate-800">{card.value}</h3>
              </div>
              <div class={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr ${card.color} text-white shadow-lg`}>
                {card.icon}
              </div>
            </div>
            <div class="mt-4 border-t border-slate-50 pt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <TrendingUp size={12} className="text-emerald-500" />
              <span>{card.subtitle}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders Section */}
      <div class="rounded-3xl border border-slate-100 bg-white p-5 shadow-premium">
        <div class="flex items-center justify-between border-b border-slate-50 pb-4">
          <h3 class="text-sm font-bold text-slate-800">Recent 5 Orders</h3>
          <span class="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-500">
            Real-time Update
          </span>
        </div>

        {recentOrders.length > 0 ? (
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="text-slate-400 font-bold border-b border-slate-50">
                  <th class="py-3.5 pr-4">Customer</th>
                  <th class="py-3.5 pr-4">Product</th>
                  <th class="py-3.5 pr-4">Date</th>
                  <th class="py-3.5 pr-4">Amount</th>
                  <th class="py-3.5 pr-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} class="text-slate-600 font-semibold hover:bg-slate-50/50 transition-colors">
                    <td class="py-3.5 pr-4">
                      <p class="font-bold text-slate-800">{order.customer_name}</p>
                      <p class="text-[10px] text-slate-400">{order.phone}</p>
                    </td>
                    <td class="py-3.5 pr-4">
                      <p class="font-bold text-slate-800">{order.product_name}</p>
                      {order.product_variant && (
                        <p class="text-[10px] text-slate-400">Variant: {order.product_variant}</p>
                      )}
                    </td>
                    <td class="py-3.5 pr-4 text-slate-500">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td class="py-3.5 pr-4 font-bold text-rose-600">৳{order.total_price}</td>
                    <td class="py-3.5 pr-4 text-right">
                      <span class={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div class="py-8 text-center text-xs text-slate-400">
            No orders have been placed yet.
          </div>
        )}
      </div>
    </div>
  )
}

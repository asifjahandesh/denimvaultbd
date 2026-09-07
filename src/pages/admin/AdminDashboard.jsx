import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import AdminLogin from './AdminLogin'
import Analytics from './Analytics'
import OrderManager from './OrderManager'
import ProductManager from './ProductManager'
import InventoryManager from './InventoryManager'
import SettingsManager from './SettingsManager'
import ReviewManager from './ReviewManager'
import Logo from '../../components/Logo'
import { BarChart3, ShoppingCart, Package, Boxes, Settings, LogOut, Menu, X, ShieldAlert, MessageSquare, ShoppingBag } from 'lucide-react'
import { registerServiceWorker, playOrderAlertChime } from '../../utils/pushManager'

export default function AdminDashboard() {
  // Authentication is kept purely in-memory (React state).
  // Once the page is refreshed or closed, the session is cleared.
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState('analytics')
  
  // Data State
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState({})
  const [dataLoading, setDataLoading] = useState(false)
  const [orderAlert, setOrderAlert] = useState({ visible: false, customer: '', total: 0, product: '' })

  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Fetch all required tables for admin panel
  const fetchDashboardData = async () => {
    setDataLoading(true)
    try {
      // Fetch products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      setProducts(productsData || [])

      // Fetch orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      setOrders(ordersData || [])

      // Fetch settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
      
      const settingsMap = {}
      if (settingsData) {
        settingsData.forEach((item) => {
          settingsMap[item.key] = item.value
        })
      }
      setSettings(settingsMap)
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err)
    } finally {
      setDataLoading(false)
    }
  }

  // Realtime order listener & Service Worker initialization
  useEffect(() => {
    if (!isAuthenticated) return

    // Register service worker for background push
    registerServiceWorker().catch(() => {})

    // Realtime channel for instant in-tab order alerts
    const channel = supabase
      .channel('admin:realtime-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new || {}
          playOrderAlertChime()
          fetchDashboardData()
          setOrderAlert({
            visible: true,
            customer: newOrder.customer_name || 'Customer',
            total: newOrder.total_price || 0,
            product: newOrder.product_name || 'Product'
          })
          setTimeout(() => {
            setOrderAlert((prev) => ({ ...prev, visible: false }))
          }, 7000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
    fetchDashboardData()
  }

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to log out?')) return
    setIsAuthenticated(false)
  }

  // Not authenticated? Show secure Login
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />
  }

  // Sidebar/Navbar Tabs definition
  const navigationItems = [
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart size={18} /> },
    { id: 'products', label: 'Products', icon: <Package size={18} /> },
    { id: 'inventory', label: 'Inventory', icon: <Boxes size={18} /> },
    { id: 'reviews', label: 'Reviews', icon: <MessageSquare size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ]

  return (
    <div class="flex min-h-screen bg-slate-50 text-slate-800">
      
      {/* Sidebar for Desktop */}
      <aside class="hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div class="flex h-16 items-center gap-2.5 px-5 border-b border-slate-100">
          <Logo size="sm" />
          <span class="font-black text-slate-900 text-sm">Denim Vault Admin</span>
        </div>
        
        <nav class="space-y-1.5 p-4">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              class={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                activeTab === item.id
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <button
            onClick={handleLogout}
            class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all mt-8"
          >
            <LogOut size={18} />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div class="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <div class="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span class="font-extrabold text-slate-900 text-sm">Admin Panel</span>
          </div>

          <div class="hidden lg:block">
            {dataLoading && (
              <span class="text-[11px] font-bold text-rose-500">
                Refreshing data...
              </span>
            )}
          </div>

          <div class="flex items-center gap-4">
            <span class="text-xs font-bold text-slate-800">
              Admin Mode (Active)
            </span>
            <button
              onClick={handleLogout}
              class="rounded-xl border border-slate-100 p-2 text-slate-500 hover:bg-slate-50 hover:text-rose-600 lg:hidden"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div class="fixed inset-0 z-30 flex lg:hidden">
            <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
            <nav class="relative flex w-64 flex-col bg-white p-4 shadow-2xl">
              <div class="flex h-12 items-center gap-2 border-b border-slate-50 mb-4 px-2">
                <ShieldAlert size={16} className="text-rose-500" />
                <span class="font-bold text-slate-800 text-sm">Dashboard Menu</span>
              </div>
              <div class="space-y-1">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id)
                      setMobileMenuOpen(false)
                    }}
                    class={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                      activeTab === item.id
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={handleLogout}
                  class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all mt-6"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Live Order Incoming Toast Alert */}
        {orderAlert.visible && (
          <div className="fixed top-20 right-4 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 text-white p-4 shadow-2xl border border-slate-800 max-w-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-900/50">
              <ShoppingBag size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-black text-rose-400">🛍️ NEW ORDER RECEIVED!</span>
                <span className="text-xs font-bold text-white">৳{Number(orderAlert.total).toLocaleString('en-US')}</span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5 font-medium">
                {orderAlert.customer} &bull; {orderAlert.product}
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('orders')
                  setOrderAlert((prev) => ({ ...prev, visible: false }))
                }}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold underline mt-1 block"
              >
                View in Orders Tab &rarr;
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOrderAlert((prev) => ({ ...prev, visible: false }))}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Dynamic Tab Body */}
        <main class="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto pb-16">
          {activeTab === 'analytics' && (
            <Analytics orders={orders} products={products} />
          )}
          {activeTab === 'orders' && (
            <OrderManager orders={orders} settings={settings} onOrderUpdate={fetchDashboardData} />
          )}
          {activeTab === 'products' && (
            <ProductManager products={products} onProductUpdate={fetchDashboardData} />
          )}
          {activeTab === 'inventory' && (
            <InventoryManager products={products} orders={orders} onProductUpdate={fetchDashboardData} />
          )}
          {activeTab === 'reviews' && (
            <ReviewManager onReviewsUpdate={fetchDashboardData} />
          )}
          {activeTab === 'settings' && (
            <SettingsManager settings={settings} onSettingsUpdate={fetchDashboardData} />
          )}
        </main>
      </div>
    </div>
  )
}

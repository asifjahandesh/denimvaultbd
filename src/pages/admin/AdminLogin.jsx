import React, { useState } from 'react'
import { ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react'
import Logo from '../../components/Logo'

export default function AdminLogin({ onLoginSuccess }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')

    // Validate password
    if (password === '0707') {
      // Trigger success callback - state will be kept in memory only
      onLoginSuccess()
    } else {
      setError('পাসওয়ার্ডটি ভুল হয়েছে। আবার চেষ্টা করুন।')
    }
  }

  return (
    <div class="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      {/* Decorative Gradient Background */}
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-rose-900/20 via-slate-950 to-slate-950 z-0"></div>

      <div class="relative z-10 w-full max-w-md space-y-8 rounded-3xl bg-slate-950/40 p-8 border border-slate-800 shadow-2xl backdrop-blur-md">
        {/* Title */}
        <div class="text-center">
          <div class="mx-auto flex justify-center">
            <Logo size="xl" />
          </div>
          <h2 class="mt-5 text-xl font-extrabold text-white sm:text-2xl">Denim Vault BD</h2>
          <p class="mt-1 text-xs text-slate-400">অ্যাডমিন কন্ট্রোল প্যানেলে প্রবেশ করতে পাসওয়ার্ড দিন।</p>
        </div>

        {error && (
          <div class="rounded-xl border border-rose-900/30 bg-rose-950/20 p-3.5 text-xs font-semibold text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} class="mt-8 space-y-6">
          <div class="space-y-4 rounded-md shadow-sm">
            {/* Password Field */}
            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1.5">অ্যাডমিন পাসওয়ার্ড (Password)</label>
              <div class="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="পাসওয়ার্ড লিখুন..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  class="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-11 pr-11 text-xs text-white outline-none transition-all placeholder:text-slate-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-center tracking-widest font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              class="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 py-3 text-xs font-bold text-white shadow-xl shadow-rose-950/40 hover:from-rose-600 hover:to-rose-700 focus:outline-none transition-all"
            >
              প্রবেশ করুন (Login)
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

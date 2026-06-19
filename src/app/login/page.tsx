'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cm-sidebar">
      <div className="w-full max-w-sm px-4">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cm-blue mb-5 shadow-lg">
            <span className="text-white font-bold text-xl tracking-tight">CM</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Code Mode</h1>
          <p className="text-cm-steel text-sm mt-1">Internal System</p>
        </div>

        {/* Card */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl p-7 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-cm-muted uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-cm-bg border border-cm-border rounded-xl px-4 py-3 text-cm-text text-sm placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue focus:border-transparent transition-shadow"
              placeholder="you@codemodeai.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-cm-muted uppercase tracking-wide">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-cm-bg border border-cm-border rounded-xl px-4 py-3 text-cm-text text-sm placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue focus:border-transparent transition-shadow"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cm-blue hover:bg-cm-blue-dim disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors shadow-sm"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-cm-steel text-xs mt-6">
          Restricted access · Code Mode operations only
        </p>
      </div>
    </div>
  )
}

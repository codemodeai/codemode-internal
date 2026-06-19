'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PLAN_TYPES = ['authority', 'launch', 'results', 'custom'] as const

export default function MonthlyPlanGenerator() {
  const router = useRouter()
  const [month, setMonth] = useState('')
  const [planType, setPlanType] = useState<typeof PLAN_TYPES[number]>('authority')
  const [theme, setTheme] = useState('')
  const [targetPosts, setTargetPosts] = useState('20')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ items_created: number; plan_id: string } | null>(null)
  const [error, setError] = useState('')

  async function generate() {
    if (!month) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/ai/monthly-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, plan_type: planType, theme, target_posts: Number(targetPosts) }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Plan Type</label>
          <select value={planType} onChange={e => setPlanType(e.target.value as typeof PLAN_TYPES[number])}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {PLAN_TYPES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Theme (optional)</label>
        <input value={theme} onChange={e => setTheme(e.target.value)} placeholder="e.g. Automation for coaches"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Target posts</label>
        <input type="number" value={targetPosts} onChange={e => setTargetPosts(e.target.value)} min="5" max="40"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <button onClick={generate} disabled={loading || !month}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg py-2.5 transition-colors">
        {loading ? 'Generating plan…' : '✨ Generate Monthly Plan'}
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {result && (
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg px-4 py-3">
          <p className="text-sm text-emerald-300">
            Created {result.items_created} content items.{' '}
            <button onClick={() => router.push('/content')} className="underline hover:no-underline">
              View in Content calendar →
            </button>
          </p>
        </div>
      )}
    </div>
  )
}

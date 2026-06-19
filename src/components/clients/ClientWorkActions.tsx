'use client'

import { useState, useTransition } from 'react'
import {
  createScopeItem, updateScopeItemStatus, deleteScopeItem,
  createPaymentMilestone, markPaymentPaid, deletePayment,
  createCorrection, createExtra, createError,
  updateClientStatus,
} from '@/lib/actions/clients'
import type { ScopeItemStatus, PaymentMethod, ClientStatus, ErrorSeverity } from '@/types/database'

interface Props {
  clientId: string
  projectId: string
  tab: string
  itemId?: string
  currentStatus?: string
  paymentId?: string
}

export default function ClientWorkActions({ clientId, projectId, tab, itemId, currentStatus, paymentId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')

  // Form state
  const [f1, setF1] = useState('')
  const [f2, setF2] = useState('')
  const [f3, setF3] = useState('')
  const [f4, setF4] = useState('')
  const [bool1, setBool1] = useState(true)

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      try {
        await fn()
        setMsg('Saved')
        setShowForm(false)
        setF1(''); setF2(''); setF3(''); setF4('')
        setTimeout(() => setMsg(''), 2000)
      } catch (e) {
        setMsg((e as Error).message)
      }
    })
  }

  if (msg) return <span className="text-xs text-blue-400">{msg}</span>

  // Scope item status toggle
  if (tab === 'scope-item' && itemId) {
    const next: ScopeItemStatus =
      currentStatus === 'not_started' ? 'in_progress' :
      currentStatus === 'in_progress' ? 'done' : 'not_started'
    return (
      <button
        onClick={() => run(() => updateScopeItemStatus(itemId, clientId, next))}
        disabled={isPending}
        className="text-xs text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
      >
        {isPending ? '…' : '→ ' + next.replace(/_/g, ' ')}
      </button>
    )
  }

  // Mark payment paid inline
  if (tab === 'mark-paid' && paymentId) {
    if (!showForm) return (
      <button onClick={() => setShowForm(true)} className="text-xs text-emerald-400 hover:text-emerald-300">Mark paid</button>
    )
    return (
      <div className="flex items-center gap-2">
        <select value={f1} onChange={e => setF1(e.target.value)} className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white">
          <option value="">Method</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>
        <button onClick={() => run(() => markPaymentPaid(paymentId, clientId, (f1 || 'other') as PaymentMethod))} disabled={isPending} className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-40">Confirm</button>
        <button onClick={() => setShowForm(false)} className="text-xs text-slate-500">Cancel</button>
      </div>
    )
  }

  // Add scope item
  if (tab === 'scope') {
    if (!showForm) return (
      <button onClick={() => setShowForm(true)} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">+ Add scope item</button>
    )
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">New Scope Item</h4>
        <input value={f1} onChange={e => setF1(e.target.value)} placeholder="Title *" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input value={f2} onChange={e => setF2(e.target.value)} placeholder="Description" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-3">
          <button onClick={() => { if (f1.trim()) run(() => createScopeItem(projectId, clientId, f1, f2)) }} disabled={isPending || !f1.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">Add</button>
          <button onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-white">Cancel</button>
        </div>
      </div>
    )
  }

  // Add payment
  if (tab === 'payments') {
    if (!showForm) return (
      <button onClick={() => setShowForm(true)} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">+ Add milestone</button>
    )
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">New Payment Milestone</h4>
        <input value={f1} onChange={e => setF1(e.target.value)} placeholder="Milestone name *" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input value={f2} onChange={e => setF2(e.target.value)} type="number" placeholder="Amount (₹) *" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input value={f3} onChange={e => setF3(e.target.value)} type="date" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-3">
          <button onClick={() => { if (f1.trim() && f2) run(() => createPaymentMilestone(projectId, clientId, f1, Number(f2), f3)) }} disabled={isPending || !f1.trim() || !f2} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">Add</button>
          <button onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-white">Cancel</button>
        </div>
      </div>
    )
  }

  // Add correction
  if (tab === 'work-corrections') {
    if (!showForm) return (
      <button onClick={() => setShowForm(true)} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">+ Log correction</button>
    )
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Log Correction</h4>
        <textarea value={f1} onChange={e => setF1(e.target.value)} rows={3} placeholder="Describe the correction *" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input type="checkbox" checked={bool1} onChange={e => setBool1(e.target.checked)} className="rounded" />
          In scope
        </label>
        <div className="flex gap-3">
          <button onClick={() => { if (f1.trim()) run(() => createCorrection(projectId, clientId, f1, bool1)) }} disabled={isPending || !f1.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">Log</button>
          <button onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-white">Cancel</button>
        </div>
      </div>
    )
  }

  // Add extra
  if (tab === 'work-extras') {
    if (!showForm) return (
      <button onClick={() => setShowForm(true)} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">+ Log extra work</button>
    )
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Log Extra Work</h4>
        <textarea value={f1} onChange={e => setF1(e.target.value)} rows={2} placeholder="Description *" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        <input value={f2} onChange={e => setF2(e.target.value)} placeholder="Effort estimate (e.g. 4hrs)" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input value={f3} onChange={e => setF3(e.target.value)} type="number" placeholder="Agreed price (₹)" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-3">
          <button onClick={() => { if (f1.trim()) run(() => createExtra(projectId, clientId, f1, f2, f3 ? Number(f3) : null)) }} disabled={isPending || !f1.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">Log</button>
          <button onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-white">Cancel</button>
        </div>
      </div>
    )
  }

  // Add error
  if (tab === 'work-errors') {
    if (!showForm) return (
      <button onClick={() => setShowForm(true)} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">+ Log error</button>
    )
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Log Error</h4>
        <input value={f1} onChange={e => setF1(e.target.value)} placeholder="Title *" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <textarea value={f2} onChange={e => setF2(e.target.value)} rows={2} placeholder="Description" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        <select value={f3} onChange={e => setF3(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="minor">Minor</option>
          <option value="major">Major</option>
          <option value="critical">Critical</option>
        </select>
        <div className="flex gap-3">
          <button onClick={() => { if (f1.trim()) run(() => createError(projectId, clientId, f1, f2, (f3 || 'minor') as ErrorSeverity)) }} disabled={isPending || !f1.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">Log</button>
          <button onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-white">Cancel</button>
        </div>
      </div>
    )
  }

  // Quote tab — status progression
  if (tab === 'quote') {
    const statuses: ClientStatus[] = ['quote_sent', 'agreement_signed', 'in_progress', 'review', 'corrections', 'delivered', 'retained', 'closed']
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => run(() => updateClientStatus(clientId, s))}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            → {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
    )
  }

  return null
}

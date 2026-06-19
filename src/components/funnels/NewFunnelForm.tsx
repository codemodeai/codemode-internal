'use client'

import { useState, useTransition } from 'react'
import { createFunnel } from '@/lib/actions/funnels'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export default function NewFunnelForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [source, setSource] = useState('')
  const [msg, setMsg] = useState('')
  const router = useRouter()

  function handleSubmit() {
    if (!name.trim()) return
    startTransition(async () => {
      try {
        const funnel = await createFunnel({ name, description, source })
        setOpen(false)
        setName(''); setDescription(''); setSource('')
        router.push(`/funnels/${funnel.id}`)
      } catch (e) {
        setMsg((e as Error).message)
      }
    })
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="bg-cm-blue hover:bg-cm-blue-dim text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors"
    >
      + New Funnel
    </button>
  )

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-cm-text">New Funnel</h2>
          <button onClick={() => setOpen(false)} className="text-cm-subtle hover:text-cm-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {msg && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{msg}</p>}

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-cm-muted">Funnel Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Instagram DM Funnel"
              className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-cm-muted">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this funnel capture?"
              className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-cm-muted">Source Tag</label>
            <input
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="e.g. instagram_dm (auto-generated if blank)"
              className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue"
            />
            <p className="text-xs text-cm-subtle">Stored as the lead&apos;s source field</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            className="flex-1 bg-cm-blue hover:bg-cm-blue-dim disabled:opacity-40 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
          >
            {isPending ? 'Creating…' : 'Create Funnel'}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="flex-1 bg-cm-bg hover:bg-cm-border text-cm-muted text-sm font-medium rounded-xl py-2.5 transition-colors border border-cm-border"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

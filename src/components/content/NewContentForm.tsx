'use client'

import { useState, useTransition } from 'react'
import { createContentItem } from '@/lib/actions/content'
import type { ContentPillar, ContentPlatform, ContentFormat } from '@/types/database'
import { PILLAR_LABELS } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

const PLATFORMS: ContentPlatform[] = ['instagram', 'linkedin', 'youtube', 'all']
const FORMATS: ContentFormat[] = ['reel', 'carousel', 'post', 'short', 'article']

export default function NewContentForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [pillar, setPillar] = useState<ContentPillar>('valuable')
  const [platform, setPlatform] = useState<ContentPlatform>('instagram')
  const [format, setFormat] = useState<ContentFormat>('reel')
  const [date, setDate] = useState('')
  const [msg, setMsg] = useState('')

  const pillars = Object.keys(PILLAR_LABELS) as ContentPillar[]

  function handleSubmit() {
    if (!title.trim()) return
    startTransition(async () => {
      try {
        const item = await createContentItem({ title: title.trim(), pillar, platform, format, scheduled_date: date || null, plan_id: null })
        setOpen(false)
        setTitle(''); setDate('')
        router.push(`/content/${item.id}`)
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
      + New Content
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-cm-text">New Content Item</h2>
          <button onClick={() => setOpen(false)} className="text-cm-subtle hover:text-cm-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {msg && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{msg}</p>}

        <div className="space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title *"
            className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue"
          />
          <select value={pillar} onChange={e => setPillar(e.target.value as ContentPillar)}
            className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:ring-2 focus:ring-cm-blue">
            {pillars.map(p => <option key={p} value={p}>{PILLAR_LABELS[p]}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select value={platform} onChange={e => setPlatform(e.target.value as ContentPlatform)}
              className="bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:ring-2 focus:ring-cm-blue">
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={format} onChange={e => setFormat(e.target.value as ContentFormat)}
              className="bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:ring-2 focus:ring-cm-blue">
              {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:ring-2 focus:ring-cm-blue" />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isPending || !title.trim()}
            className="flex-1 bg-cm-blue hover:bg-cm-blue-dim disabled:opacity-40 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
          >
            {isPending ? 'Creating…' : 'Create'}
          </button>
          <button onClick={() => setOpen(false)}
            className="flex-1 bg-cm-bg hover:bg-cm-border text-cm-muted text-sm font-medium rounded-xl py-2.5 transition-colors border border-cm-border">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { createIdea } from '@/lib/actions/tasks'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export default function NewIdeaForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState('')

  function handleSubmit() {
    if (!title.trim()) return
    startTransition(async () => {
      try {
        await createIdea({ title: title.trim(), notes: notes.trim() || null })
        setOpen(false)
        setTitle(''); setNotes(''); setMsg('')
        router.refresh()
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
      + New Idea
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-cm-text">New Idea</h2>
          <button onClick={() => setOpen(false)} className="text-cm-subtle hover:text-cm-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {msg && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{msg}</p>}

        <div className="space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Idea title *"
            autoFocus
            className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue"
          />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Describe the idea…"
            rows={4}
            className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isPending || !title.trim()}
            className="flex-1 bg-cm-blue hover:bg-cm-blue-dim disabled:opacity-40 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
          >
            {isPending ? 'Saving…' : 'Save Idea'}
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

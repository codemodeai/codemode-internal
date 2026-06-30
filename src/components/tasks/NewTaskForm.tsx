'use client'

import { useState, useTransition } from 'react'
import { createTask } from '@/lib/actions/tasks'
import type { TaskPriority } from '@/types/database'
import { TASK_PRIORITY_LABELS } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']

export default function NewTaskForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [msg, setMsg] = useState('')

  function reset() {
    setTitle(''); setNotes(''); setPriority('medium'); setDueDate(''); setMsg('')
  }

  function handleSubmit() {
    if (!title.trim()) return
    startTransition(async () => {
      try {
        await createTask({ title: title.trim(), notes: notes.trim() || null, priority, due_date: dueDate || null })
        setOpen(false)
        reset()
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
      + New Task
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-cm-text">New Task</h2>
          <button onClick={() => setOpen(false)} className="text-cm-subtle hover:text-cm-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {msg && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{msg}</p>}

        <div className="space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs to be done? *"
            autoFocus
            className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue"
          />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={3}
            className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}
              className="bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:ring-2 focus:ring-cm-blue">
              {PRIORITIES.map(p => <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]} priority</option>)}
            </select>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:ring-2 focus:ring-cm-blue" />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isPending || !title.trim()}
            className="flex-1 bg-cm-blue hover:bg-cm-blue-dim disabled:opacity-40 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
          >
            {isPending ? 'Adding…' : 'Add Task'}
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

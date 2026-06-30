'use client'

import { useState, useTransition } from 'react'
import { updateIdea, setIdeaStatus, deleteIdea, convertIdeaToTask } from '@/lib/actions/tasks'
import type { Idea } from '@/types/database'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, ListChecks, Pencil, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'

export default function IdeaCard({ idea }: { idea: Idea }) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const router = useRouter()

  const [title, setTitle] = useState(idea.title)
  const [notes, setNotes] = useState(idea.notes ?? '')

  const archived = idea.status === 'archived'

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => { await fn(); router.refresh() })
  }

  function saveEdit() {
    if (!title.trim()) return
    run(async () => {
      await updateIdea(idea.id, { title: title.trim(), notes: notes.trim() || null })
      setEditing(false)
    })
  }

  function convert() {
    run(async () => {
      await convertIdeaToTask(idea.id)
      router.push('/tasks?tab=tasks')
    })
  }

  return (
    <>
      <div className={`bg-white rounded-2xl shadow-sm border border-cm-border p-4 flex flex-col ${archived ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-cm-text flex-1 min-w-0">{idea.title}</h3>
          {archived && <span className="text-[10px] font-medium text-cm-subtle bg-cm-bg rounded-full px-2 py-0.5 flex-shrink-0">Archived</span>}
        </div>
        {idea.notes && <p className="text-xs text-cm-muted mt-1.5 whitespace-pre-wrap flex-1">{idea.notes}</p>}
        <p className="text-[11px] text-cm-subtle mt-2">{format(new Date(idea.created_at), 'd MMM yyyy')}</p>

        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-50">
          <button onClick={convert} disabled={isPending}
            className="flex items-center gap-1.5 text-xs font-medium text-cm-blue hover:text-cm-blue-dim transition-colors px-2 py-1 rounded-lg"
            title="Convert to task">
            <ListChecks size={14} /> To Task
          </button>
          <div className="flex-1" />
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-cm-subtle hover:text-cm-blue transition-colors" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => run(() => setIdeaStatus(idea.id, archived ? 'active' : 'archived'))} disabled={isPending}
            className="p-1.5 rounded-lg text-cm-subtle hover:text-cm-muted transition-colors" title={archived ? 'Unarchive' : 'Archive'}>
            {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </button>
          <button onClick={() => run(() => deleteIdea(idea.id))} disabled={isPending}
            className="p-1.5 rounded-lg text-cm-subtle hover:text-red-500 transition-colors" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setEditing(false) }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-cm-text">Edit Idea</h2>
              <button onClick={() => setEditing(false)} className="text-cm-subtle hover:text-cm-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *"
                className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue" />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe the idea…" rows={4}
                className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={saveEdit} disabled={isPending || !title.trim()}
                className="flex-1 bg-cm-blue hover:bg-cm-blue-dim disabled:opacity-40 text-white text-sm font-medium rounded-xl py-2.5 transition-colors">
                {isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)}
                className="flex-1 bg-cm-bg hover:bg-cm-border text-cm-muted text-sm font-medium rounded-xl py-2.5 transition-colors border border-cm-border">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

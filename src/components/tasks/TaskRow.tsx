'use client'

import { useState, useTransition } from 'react'
import { setTaskStatus, updateTask, deleteTask } from '@/lib/actions/tasks'
import type { Task, TaskPriority, TaskStatus } from '@/types/database'
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { Check, Circle, CircleDot, Pencil, Trash2, X } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']

export default function TaskRow({ task }: { task: Task }) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const router = useRouter()

  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [dueDate, setDueDate] = useState(task.due_date ?? '')

  const done = task.status === 'done'
  const pc = TASK_PRIORITY_COLORS[task.priority]

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => { await fn(); router.refresh() })
  }

  function toggleDone() {
    run(() => setTaskStatus(task.id, done ? 'todo' : 'done'))
  }

  function cycleProgress() {
    const next: TaskStatus = task.status === 'in_progress' ? 'todo' : 'in_progress'
    run(() => setTaskStatus(task.id, next))
  }

  function saveEdit() {
    if (!title.trim()) return
    run(async () => {
      await updateTask(task.id, { title: title.trim(), notes: notes.trim() || null, priority, due_date: dueDate || null })
      setEditing(false)
    })
  }

  const due = task.due_date ? new Date(task.due_date + 'T00:00:00') : null
  const overdue = due && !done && isPast(due) && !isToday(due)
  const dueToday = due && !done && isToday(due)

  return (
    <>
      <div className="flex items-start gap-3 px-4 py-3 hover:bg-cm-bg transition-colors">
        {/* Complete toggle */}
        <button onClick={toggleDone} disabled={isPending}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-cm-border text-transparent hover:border-cm-blue'}`}
          title={done ? 'Mark as not done' : 'Mark as done'}>
          <Check size={13} strokeWidth={3} />
        </button>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${done ? 'text-cm-subtle line-through' : 'text-cm-text'}`}>{task.title}</p>
          {task.notes && <p className="text-xs text-cm-muted mt-0.5 whitespace-pre-wrap">{task.notes}</p>}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${pc.bg} ${pc.text} ${pc.border}`}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
            {due && (
              <span className={`text-[11px] font-medium ${overdue ? 'text-red-600' : dueToday ? 'text-amber-600' : 'text-cm-subtle'}`}>
                {overdue ? 'Overdue · ' : dueToday ? 'Due today · ' : 'Due '}{format(due, 'd MMM')}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!done && (
            <button onClick={cycleProgress} disabled={isPending}
              className={`p-1.5 rounded-lg transition-colors ${task.status === 'in_progress' ? 'text-cm-blue' : 'text-cm-subtle hover:text-cm-muted'}`}
              title={task.status === 'in_progress' ? 'Move back to To Do' : 'Mark as In Progress'}>
              {task.status === 'in_progress' ? <CircleDot size={16} /> : <Circle size={16} />}
            </button>
          )}
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-cm-subtle hover:text-cm-blue transition-colors" title="Edit">
            <Pencil size={15} />
          </button>
          <button onClick={() => run(() => deleteTask(task.id))} disabled={isPending}
            className="p-1.5 rounded-lg text-cm-subtle hover:text-red-500 transition-colors" title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setEditing(false) }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-cm-text">Edit Task</h2>
              <button onClick={() => setEditing(false)} className="text-cm-subtle hover:text-cm-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *"
                className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue" />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={3}
                className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue resize-none" />
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

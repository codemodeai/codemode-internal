'use client'

import { useState, useTransition, useRef } from 'react'
import { createTask, updateTask, setTaskStatus, deleteTask } from '@/lib/actions/tasks'
import type { Task, TaskPriority, TaskStatus } from '@/types/database'
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TASK_PRIORITY_COLORS } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { Check, Trash2, Plus, ChevronDown } from 'lucide-react'

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']
const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']

const cellInput =
  'w-full bg-transparent text-sm text-cm-text placeholder-cm-subtle px-2 py-1.5 rounded-md focus:outline-none focus:bg-cm-bg focus:ring-1 focus:ring-cm-blue/40'
const cellSelect =
  'w-full bg-transparent text-xs text-cm-text px-1.5 py-1.5 rounded-md focus:outline-none focus:bg-cm-bg focus:ring-1 focus:ring-cm-blue/40 cursor-pointer'

function TaskTableRow({ task }: { task: Task }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [expanded, setExpanded] = useState(false)

  const done = task.status === 'done'
  const pc = TASK_PRIORITY_COLORS[task.priority]

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => { await fn(); router.refresh() })
  }

  return (
    <tr className={`border-b border-gray-50 hover:bg-cm-bg/50 transition-colors ${done ? 'opacity-60' : ''}`}>
      {/* Complete toggle */}
      <td className="pl-4 pr-1 py-1.5 w-9">
        <button
          onClick={() => run(() => setTaskStatus(task.id, done ? 'todo' : 'done'))}
          disabled={isPending}
          className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-cm-border text-transparent hover:border-cm-blue'}`}
          title={done ? 'Mark as not done' : 'Mark as done'}
        >
          <Check size={12} strokeWidth={3} />
        </button>
      </td>

      {/* Task title + mobile collapsible details (priority/status/date/remarks) */}
      <td className="py-1 pr-2">
        <div className="flex items-center">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() && title !== task.title) run(() => updateTask(task.id, { title: title.trim() })) }}
            placeholder="Task…"
            className={`${cellInput} font-medium ${done ? 'line-through text-cm-subtle' : ''}`}
          />
          {/* Expand/collapse toggle — mobile only */}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="md:hidden flex-shrink-0 p-1.5 text-cm-subtle hover:text-cm-muted"
            aria-label={expanded ? 'Hide details' : 'Show details'}
            aria-expanded={expanded}
          >
            <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Collapsible details — mobile only, the dedicated columns are hidden < md */}
        {expanded && (
          <div className="md:hidden mt-1 mb-1.5 mx-1 px-2 py-2 space-y-2 bg-cm-bg rounded-lg">
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-cm-subtle w-16 flex-shrink-0">Priority</span>
              <select
                value={task.priority}
                onChange={e => run(() => updateTask(task.id, { priority: e.target.value as TaskPriority }))}
                disabled={isPending}
                className={`text-xs font-medium rounded-full border px-2 py-0.5 focus:outline-none cursor-pointer ${pc.bg} ${pc.text} ${pc.border}`}
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-cm-subtle w-16 flex-shrink-0">Status</span>
              <select
                value={task.status}
                onChange={e => run(() => setTaskStatus(task.id, e.target.value as TaskStatus))}
                disabled={isPending}
                className="text-xs text-cm-text bg-white border border-cm-border rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
              >
                {STATUSES.map(s => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-cm-subtle w-16 flex-shrink-0">Date</span>
              <input
                type="date"
                value={task.due_date ?? ''}
                onChange={e => run(() => updateTask(task.id, { due_date: e.target.value || null }))}
                onKeyDown={e => e.preventDefault()}
                onMouseDown={e => { e.preventDefault(); (e.currentTarget as HTMLInputElement).focus(); try { (e.currentTarget as HTMLInputElement).showPicker() } catch {} }}
                className="text-xs text-cm-text bg-white border border-cm-border rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-cm-subtle w-16 flex-shrink-0">Remarks</span>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={() => { if (notes !== (task.notes ?? '')) run(() => updateTask(task.id, { notes: notes.trim() || null })) }}
                placeholder="Remarks…"
                className="flex-1 min-w-0 text-xs text-cm-text bg-white border border-cm-border rounded-lg px-2 py-1 focus:outline-none"
              />
            </label>
          </div>
        )}
      </td>

      {/* Priority */}
      <td className="py-1 pr-2 w-28 hidden md:table-cell">
        <select
          value={task.priority}
          onChange={e => run(() => updateTask(task.id, { priority: e.target.value as TaskPriority }))}
          disabled={isPending}
          className={`${cellSelect} font-medium rounded-full border ${pc.bg} ${pc.text} ${pc.border}`}
        >
          {PRIORITIES.map(p => <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>)}
        </select>
      </td>

      {/* Status */}
      <td className="py-1 pr-2 w-32 hidden md:table-cell">
        <select
          value={task.status}
          onChange={e => run(() => setTaskStatus(task.id, e.target.value as TaskStatus))}
          disabled={isPending}
          className={cellSelect}
        >
          {STATUSES.map(s => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
        </select>
      </td>

      {/* Date — calendar picker only, no typing */}
      <td className="py-1 pr-2 w-36 hidden md:table-cell">
        <input
          type="date"
          value={task.due_date ?? ''}
          onChange={e => run(() => updateTask(task.id, { due_date: e.target.value || null }))}
          onKeyDown={e => e.preventDefault()}
          onMouseDown={e => { e.preventDefault(); (e.currentTarget as HTMLInputElement).focus(); try { (e.currentTarget as HTMLInputElement).showPicker() } catch {} }}
          className={`${cellInput} text-xs text-cm-muted cursor-pointer`}
        />
      </td>

      {/* Remarks */}
      <td className="py-1 pr-2 hidden md:table-cell">
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => { if (notes !== (task.notes ?? '')) run(() => updateTask(task.id, { notes: notes.trim() || null })) }}
          placeholder="Remarks…"
          className={`${cellInput} text-cm-muted`}
        />
      </td>

      {/* Delete */}
      <td className="pr-3 pl-1 py-1.5 w-10 text-right">
        <button
          onClick={() => run(() => deleteTask(task.id))}
          disabled={isPending}
          className="p-1.5 rounded-lg text-cm-subtle hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  )
}

function AddTaskRow() {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function add() {
    const t = title.trim()
    if (!t) return
    setTitle('') // clear first so a follow-up blur after Enter can't double-create
    startTransition(async () => {
      await createTask({ title: t })
      router.refresh()
      inputRef.current?.focus()
    })
  }

  return (
    <tr className="border-t border-cm-border bg-cm-bg/30">
      <td className="pl-4 pr-1 py-1.5 w-9 text-cm-subtle">
        <Plus size={16} />
      </td>
      <td className="py-1.5 pr-2" colSpan={6}>
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          onBlur={add}
          disabled={isPending}
          placeholder="Add a task and press Enter…"
          className="w-full bg-transparent text-sm text-cm-text placeholder-cm-subtle px-2 py-1.5 rounded-md focus:outline-none focus:bg-white focus:ring-1 focus:ring-cm-blue/40"
        />
      </td>
    </tr>
  )
}

export default function TasksTable({ tasks }: { tasks: Task[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
      <table className="w-full md:min-w-[680px]">
        <thead>
          <tr className="border-b border-cm-border bg-cm-bg text-left">
            <th className="pl-4 pr-1 py-2.5 w-9" />
            <th className="px-2 py-2.5 text-xs font-semibold text-cm-muted uppercase tracking-wide">Task</th>
            <th className="px-2 py-2.5 text-xs font-semibold text-cm-muted uppercase tracking-wide hidden md:table-cell">Priority</th>
            <th className="px-2 py-2.5 text-xs font-semibold text-cm-muted uppercase tracking-wide hidden md:table-cell">Status</th>
            <th className="px-2 py-2.5 text-xs font-semibold text-cm-muted uppercase tracking-wide hidden md:table-cell">Date</th>
            <th className="px-2 py-2.5 text-xs font-semibold text-cm-muted uppercase tracking-wide hidden md:table-cell">Remarks</th>
            <th className="pr-3 pl-1 py-2.5 w-10" />
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => <TaskTableRow key={task.id} task={task} />)}
          <AddTaskRow />
        </tbody>
      </table>
    </div>
  )
}

'use client'

import { useState, useTransition, useRef } from 'react'
import { createIdea, updateIdea, setIdeaStatus, deleteIdea, convertIdeaToTask } from '@/lib/actions/tasks'
import type { Idea } from '@/types/database'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, ListChecks, Archive, ArchiveRestore } from 'lucide-react'

const cellInput =
  'w-full bg-transparent text-sm text-cm-text placeholder-cm-subtle px-2 py-1.5 rounded-md focus:outline-none focus:bg-cm-bg focus:ring-1 focus:ring-cm-blue/40'

const PROJECTS_LIST_ID = 'idea-projects-datalist'

function IdeaTableRow({ idea }: { idea: Idea }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [title, setTitle] = useState(idea.title)
  const [project, setProject] = useState(idea.project ?? '')

  const archived = idea.status === 'archived'

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => { await fn(); router.refresh() })
  }

  return (
    <tr className={`border-b border-gray-50 hover:bg-cm-bg/50 transition-colors ${archived ? 'opacity-60' : ''}`}>
      {/* Idea sentence */}
      <td className="py-1 pl-4 pr-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => { if (title.trim() && title !== idea.title) run(() => updateIdea(idea.id, { title: title.trim() })) }}
          placeholder="Idea…"
          className={`${cellInput} font-medium`}
        />
      </td>

      {/* Project (new or existing) */}
      <td className="py-1 pr-2 w-56">
        <input
          list={PROJECTS_LIST_ID}
          value={project}
          onChange={e => setProject(e.target.value)}
          onBlur={() => { if (project !== (idea.project ?? '')) run(() => updateIdea(idea.id, { project: project.trim() || null })) }}
          placeholder="Project…"
          className={`${cellInput} text-cm-muted`}
        />
      </td>

      {/* Actions */}
      <td className="pr-3 pl-1 py-1.5 w-32 text-right whitespace-nowrap">
        <button
          onClick={() => run(async () => { await convertIdeaToTask(idea.id); router.push('/tasks?tab=tasks') })}
          disabled={isPending}
          className="p-1.5 rounded-lg text-cm-subtle hover:text-cm-blue transition-colors"
          title="Convert to task"
        >
          <ListChecks size={15} />
        </button>
        <button
          onClick={() => run(() => setIdeaStatus(idea.id, archived ? 'active' : 'archived'))}
          disabled={isPending}
          className="p-1.5 rounded-lg text-cm-subtle hover:text-cm-muted transition-colors"
          title={archived ? 'Unarchive' : 'Archive'}
        >
          {archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
        </button>
        <button
          onClick={() => run(() => deleteIdea(idea.id))}
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

function AddIdeaRow() {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function add() {
    const t = title.trim()
    if (!t) return
    const p = project.trim() || null
    setTitle(''); setProject('') // clear first so a follow-up blur can't double-create
    startTransition(async () => {
      await createIdea({ title: t, project: p })
      router.refresh()
      inputRef.current?.focus()
    })
  }

  return (
    <tr className="border-t border-cm-border bg-cm-bg/30">
      <td className="py-1.5 pl-4 pr-2">
        <div className="flex items-center gap-1.5">
          <Plus size={16} className="text-cm-subtle flex-shrink-0" />
          <input
            ref={inputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }}
            onBlur={e => { if (!e.relatedTarget || (e.relatedTarget as HTMLElement).getAttribute('list') !== PROJECTS_LIST_ID) add() }}
            disabled={isPending}
            placeholder="Add an idea and press Enter…"
            className="w-full bg-transparent text-sm text-cm-text placeholder-cm-subtle px-2 py-1.5 rounded-md focus:outline-none focus:bg-white focus:ring-1 focus:ring-cm-blue/40"
          />
        </div>
      </td>
      <td className="py-1.5 pr-2 w-56">
        <input
          list={PROJECTS_LIST_ID}
          value={project}
          onChange={e => setProject(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          onBlur={() => { if (title.trim()) add() }}
          disabled={isPending}
          placeholder="Project…"
          className="w-full bg-transparent text-sm text-cm-muted placeholder-cm-subtle px-2 py-1.5 rounded-md focus:outline-none focus:bg-white focus:ring-1 focus:ring-cm-blue/40"
        />
      </td>
      <td className="w-32" />
    </tr>
  )
}

export default function IdeasTable({ ideas, projects }: { ideas: Idea[]; projects: string[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <datalist id={PROJECTS_LIST_ID}>
        {projects.map(p => <option key={p} value={p} />)}
      </datalist>
      <table className="w-full">
        <thead>
          <tr className="border-b border-cm-border bg-cm-bg text-left">
            <th className="px-2 py-2.5 pl-4 text-xs font-semibold text-cm-muted uppercase tracking-wide">Idea</th>
            <th className="px-2 py-2.5 text-xs font-semibold text-cm-muted uppercase tracking-wide">Project</th>
            <th className="pr-3 pl-1 py-2.5 w-32" />
          </tr>
        </thead>
        <tbody>
          {ideas.map(idea => <IdeaTableRow key={idea.id} idea={idea} />)}
          <AddIdeaRow />
        </tbody>
      </table>
    </div>
  )
}

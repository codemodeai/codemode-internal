'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createIdea, updateIdea, setIdeaStatus, deleteIdea, convertIdeaToTask } from '@/lib/actions/tasks'
import type { Idea } from '@/types/database'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, ListChecks, Archive, ArchiveRestore, ChevronDown } from 'lucide-react'

const cellInput =
  'w-full bg-transparent text-sm text-cm-text placeholder-cm-subtle px-2 py-1.5 rounded-md focus:outline-none focus:bg-cm-bg focus:ring-1 focus:ring-cm-blue/40'

const PROJECTS_LIST_ID = 'idea-projects-datalist'

// Grow a textarea to fit its content so long idea sentences wrap and show in full.
function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function IdeaTableRow({ idea }: { idea: Idea }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [title, setTitle] = useState(idea.title)
  const [project, setProject] = useState(idea.project ?? '')
  const [expanded, setExpanded] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { autosize(titleRef.current) }, [title])

  const archived = idea.status === 'archived'

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => { await fn(); router.refresh() })
  }

  return (
    <tr className={`border-b border-gray-50 hover:bg-cm-bg/50 transition-colors ${archived ? 'opacity-60' : ''}`}>
      {/* Idea sentence + mobile collapsible project */}
      <td className="py-1 pl-4 pr-2">
        <div className="flex items-start">
          {/* Mobile: wrapping textarea so the full sentence shows on multiple lines */}
          <textarea
            ref={titleRef}
            rows={1}
            value={title}
            onChange={e => { setTitle(e.target.value); autosize(e.target) }}
            onBlur={() => { if (title.trim() && title !== idea.title) run(() => updateIdea(idea.id, { title: title.trim() })) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
            placeholder="Idea…"
            className={`md:hidden ${cellInput} font-medium resize-none overflow-hidden leading-snug`}
          />
          {/* Desktop: single-line input (the column is wide enough) */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() && title !== idea.title) run(() => updateIdea(idea.id, { title: title.trim() })) }}
            placeholder="Idea…"
            className={`hidden md:block ${cellInput} font-medium`}
          />
          {/* Expand/collapse toggle — mobile only */}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="md:hidden flex-shrink-0 p-1.5 mt-0.5 text-cm-subtle hover:text-cm-muted"
            aria-label={expanded ? 'Hide details' : 'Show details'}
            aria-expanded={expanded}
          >
            <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Collapsible details — mobile only, the dedicated column is hidden < md */}
        {expanded && (
          <div className="md:hidden mt-1 mb-1.5 mx-1 px-2 py-2 bg-cm-bg rounded-lg">
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-cm-subtle w-16 flex-shrink-0">Project</span>
              <input
                list={PROJECTS_LIST_ID}
                value={project}
                onChange={e => setProject(e.target.value)}
                onBlur={() => { if (project !== (idea.project ?? '')) run(() => updateIdea(idea.id, { project: project.trim() || null })) }}
                placeholder="Project…"
                className="flex-1 min-w-0 text-xs text-cm-text bg-white border border-cm-border rounded-lg px-2 py-1 focus:outline-none"
              />
            </label>
          </div>
        )}
      </td>

      {/* Project (new or existing) */}
      <td className="py-1 pr-2 w-56 hidden md:table-cell">
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
        {/* Mobile-only project field for the add row */}
        <input
          list={PROJECTS_LIST_ID}
          value={project}
          onChange={e => setProject(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          disabled={isPending}
          placeholder="Project…"
          className="md:hidden w-full bg-transparent text-[11px] text-cm-muted placeholder-cm-subtle px-2 pb-1 pl-7 focus:outline-none"
        />
      </td>
      <td className="py-1.5 pr-2 w-56 hidden md:table-cell">
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
    <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
      <datalist id={PROJECTS_LIST_ID}>
        {projects.map(p => <option key={p} value={p} />)}
      </datalist>
      <table className="w-full md:min-w-[520px]">
        <thead>
          <tr className="border-b border-cm-border bg-cm-bg text-left">
            <th className="px-2 py-2.5 pl-4 text-xs font-semibold text-cm-muted uppercase tracking-wide">Idea</th>
            <th className="px-2 py-2.5 text-xs font-semibold text-cm-muted uppercase tracking-wide hidden md:table-cell">Project</th>
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

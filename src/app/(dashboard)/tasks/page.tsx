import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Task, Idea } from '@/types/database'
import TasksTable from '@/components/tasks/TasksTable'
import IdeasTable from '@/components/tasks/IdeasTable'

type SearchParams = Promise<{ tab?: string }>

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const tab = sp.tab === 'ideas' ? 'ideas' : 'tasks'
  const supabase = await createClient()

  const [{ data: tasksData }, { data: ideasData }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .order('status', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('ideas')
      .select('*')
      .neq('status', 'converted')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const tasks = (tasksData ?? []) as Task[]
  const ideas = (ideasData ?? []) as Idea[]

  const openCount = tasks.filter(t => t.status !== 'done').length
  const projects = Array.from(new Set(ideas.map(i => i.project).filter((p): p is string => !!p))).sort()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-cm-text">Tasks &amp; Ideas</h1>
        <p className="text-sm text-cm-muted mt-0.5">
          {tab === 'tasks'
            ? `${openCount} open task${openCount === 1 ? '' : 's'}`
            : `${ideas.length} idea${ideas.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Link href="/tasks?tab=tasks"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === 'tasks' ? 'bg-cm-blue text-white' : 'bg-white text-cm-muted hover:text-cm-text shadow-sm border border-cm-border'}`}>
          Tasks
        </Link>
        <Link href="/tasks?tab=ideas"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === 'ideas' ? 'bg-cm-blue text-white' : 'bg-white text-cm-muted hover:text-cm-text shadow-sm border border-cm-border'}`}>
          Ideas
        </Link>
      </div>

      {tab === 'tasks' ? <TasksTable tasks={tasks} /> : <IdeasTable ideas={ideas} projects={projects} />}
    </div>
  )
}

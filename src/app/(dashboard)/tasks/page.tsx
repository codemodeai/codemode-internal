import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Task, Idea, TaskStatus } from '@/types/database'
import NewTaskForm from '@/components/tasks/NewTaskForm'
import NewIdeaForm from '@/components/tasks/NewIdeaForm'
import TaskRow from '@/components/tasks/TaskRow'
import IdeaCard from '@/components/tasks/IdeaCard'
import { TASK_STATUS_LABELS } from '@/lib/constants'

type SearchParams = Promise<{ tab?: string; status?: string }>

const TASK_GROUPS: TaskStatus[] = ['todo', 'in_progress', 'done']

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
  const tasksByStatus = TASK_GROUPS.reduce<Record<TaskStatus, Task[]>>((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s)
    return acc
  }, { todo: [], in_progress: [], done: [] })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-cm-text">Tasks &amp; Ideas</h1>
          <p className="text-sm text-cm-muted mt-0.5">
            {tab === 'tasks' ? `${openCount} open task${openCount === 1 ? '' : 's'}` : `${ideas.length} idea${ideas.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'tasks' ? <NewTaskForm /> : <NewIdeaForm />}
        </div>
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

      {/* Tasks tab */}
      {tab === 'tasks' && (
        tasks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm py-16 text-center text-cm-subtle">
            No tasks yet. Click “+ New Task” to add your first one.
          </div>
        ) : (
          <div className="space-y-5">
            {TASK_GROUPS.map(status => {
              const group = tasksByStatus[status]
              if (group.length === 0) return null
              return (
                <div key={status}>
                  <h2 className="text-sm font-semibold text-cm-muted mb-2 flex items-center gap-2">
                    {TASK_STATUS_LABELS[status]}
                    <span className="text-cm-subtle font-normal">({group.length})</span>
                  </h2>
                  <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50 overflow-hidden">
                    {group.map(task => <TaskRow key={task.id} task={task} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Ideas tab */}
      {tab === 'ideas' && (
        ideas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm py-16 text-center text-cm-subtle">
            No ideas captured yet. Click “+ New Idea” to jot one down.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ideas.map(idea => <IdeaCard key={idea.id} idea={idea} />)}
          </div>
        )
      )}
    </div>
  )
}

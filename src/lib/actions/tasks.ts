'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { TaskStatus, TaskPriority, IdeaStatus } from '@/types/database'

// ── Tasks ──────────────────────────────────────────────────────────────────

export async function createTask(data: {
  title: string
  notes?: string | null
  priority?: TaskPriority
  due_date?: string | null
}) {
  const supabase = await createClient()
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title: data.title,
      notes: data.notes ?? null,
      priority: data.priority ?? 'medium',
      due_date: data.due_date || null,
      status: 'todo' as TaskStatus,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
  return task
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = await createClient()
  const updates: Record<string, unknown> = { status }
  updates.completed_at = status === 'done' ? new Date().toISOString() : null
  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
}

export async function updateTask(taskId: string, data: {
  title?: string
  notes?: string | null
  priority?: TaskPriority
  due_date?: string | null
  status?: TaskStatus
}) {
  const supabase = await createClient()
  const updates: Record<string, unknown> = { ...data }
  if (data.status !== undefined) {
    updates.completed_at = data.status === 'done' ? new Date().toISOString() : null
  }
  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
}

// ── Ideas ──────────────────────────────────────────────────────────────────

export async function createIdea(data: { title: string; notes?: string | null; project?: string | null }) {
  const supabase = await createClient()
  const { data: idea, error } = await supabase
    .from('ideas')
    .insert({ title: data.title, notes: data.notes ?? null, project: data.project || null, status: 'active' as IdeaStatus })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
  return idea
}

export async function updateIdea(ideaId: string, data: { title?: string; notes?: string | null; project?: string | null }) {
  const supabase = await createClient()
  const { error } = await supabase.from('ideas').update(data).eq('id', ideaId)
  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
}

export async function setIdeaStatus(ideaId: string, status: IdeaStatus) {
  const supabase = await createClient()
  const { error } = await supabase.from('ideas').update({ status }).eq('id', ideaId)
  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
}

export async function deleteIdea(ideaId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('ideas').delete().eq('id', ideaId)
  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
}

// Promote an idea into an actionable task, marking the idea as converted.
export async function convertIdeaToTask(ideaId: string) {
  const supabase = await createClient()
  const { data: idea, error: readErr } = await supabase
    .from('ideas')
    .select('title, notes')
    .eq('id', ideaId)
    .single()
  if (readErr) throw new Error(readErr.message)

  const { data: task, error: insErr } = await supabase
    .from('tasks')
    .insert({
      title: idea.title,
      notes: idea.notes ?? null,
      priority: 'medium' as TaskPriority,
      status: 'todo' as TaskStatus,
    })
    .select()
    .single()
  if (insErr) throw new Error(insErr.message)

  await supabase
    .from('ideas')
    .update({ status: 'converted' as IdeaStatus, converted_task_id: task.id })
    .eq('id', ideaId)

  revalidatePath('/tasks')
  return task
}

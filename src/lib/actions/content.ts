'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ContentStatus, ContentPillar, ContentPlatform, ContentFormat } from '@/types/database'

export async function createContentItem(data: {
  title: string
  pillar: ContentPillar
  platform: ContentPlatform
  format: ContentFormat | null
  scheduled_date: string | null
  plan_id: string | null
}) {
  const supabase = await createClient()
  const { data: item, error } = await supabase
    .from('content_items')
    .insert({ ...data, status: 'idea' as ContentStatus, views: 0, likes: 0, comments: 0, saves: 0, dm_triggers: 0 })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/content')
  return item
}

export async function updateContentStatus(itemId: string, status: ContentStatus) {
  const supabase = await createClient()
  const updates: Record<string, unknown> = { status }
  if (status === 'published') updates.published_at = new Date().toISOString()
  await supabase.from('content_items').update(updates).eq('id', itemId)
  revalidatePath('/content')
  revalidatePath(`/content/${itemId}`)
}

export async function updateContentItem(itemId: string, data: {
  title?: string
  hook?: string
  script?: string
  cta?: string
  hashtags?: string
  scheduled_date?: string | null
  status?: ContentStatus
}) {
  const supabase = await createClient()
  await supabase.from('content_items').update(data).eq('id', itemId)
  revalidatePath('/content')
  revalidatePath(`/content/${itemId}`)
}

export async function updateContentPerformance(itemId: string, data: {
  views: number; likes: number; comments: number; saves: number; dm_triggers: number
}) {
  const supabase = await createClient()
  await supabase.from('content_items').update(data).eq('id', itemId)
  revalidatePath(`/content/${itemId}`)
}

export async function archiveContentItem(itemId: string) {
  await updateContentStatus(itemId, 'archived')
}

export async function rescheduleContentItem(itemId: string, newDate: string) {
  const supabase = await createClient()
  await supabase.from('content_items').update({ scheduled_date: newDate }).eq('id', itemId)
  revalidatePath('/content')
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Funnel } from '@/types/database'

export async function createFunnel(data: { name: string; description?: string; source?: string }) {
  const supabase = await createClient()
  const { data: funnel, error } = await supabase
    .from('funnels')
    .insert({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      source: data.source?.trim() || data.name.toLowerCase().replace(/\s+/g, '_'),
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/funnels')
  return funnel as unknown as Funnel
}

export async function updateFunnel(
  id: string,
  data: Partial<Pick<Funnel, 'name' | 'description' | 'source' | 'field_mappings' | 'active'>>
) {
  const supabase = await createClient()
  const { error } = await supabase.from('funnels').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/funnels')
  revalidatePath(`/funnels/${id}`)
}

export async function deleteFunnel(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('funnels').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/funnels')
}

export async function regenerateWebhookKey(id: string) {
  const service = createServiceClient()
  const newKey = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const { data, error } = await service
    .from('funnels')
    .update({ webhook_key: newKey })
    .eq('id', id)
    .select('webhook_key')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath(`/funnels/${id}`)
  return (data as { webhook_key: string }).webhook_key
}

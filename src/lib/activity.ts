import type { ActivityEntityType, ActivityEventType } from '@/types/database'
import { createServiceClient } from '@/lib/supabase/server'

interface LogParams {
  entity_type: ActivityEntityType
  entity_id: string
  event_type: ActivityEventType
  description: string
  metadata?: Record<string, unknown>
}

export async function logActivity(params: LogParams) {
  try {
    const supabase = createServiceClient()
    await supabase.from('activity_log').insert(params)
  } catch {
    // Non-blocking — never let logging failures break the main flow
  }
}

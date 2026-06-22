import { createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import type { QualificationState, DealTemperature } from '@/types/database'

/**
 * Moves a lead's qualification_state with sensible guards so signals never
 * downgrade a stronger state:
 *   - `disqualified` is terminal (opted out / not a fit) — never changed here.
 *   - `booked` always wins (a booked call is the strongest signal).
 *   - `engaged` (they replied) can override pending/no_response, but not booked.
 *   - `no_response` is only applied to a still-`pending` lead (someone who
 *     replied is `engaged`, not silent).
 */
export async function setQualification(
  leadId: string,
  next: QualificationState,
  reason: string,
): Promise<void> {
  const supabase = createServiceClient()
  const { data: lead } = await supabase
    .from('leads')
    .select('qualification_state')
    .eq('id', leadId)
    .single()

  const current = (lead?.qualification_state as QualificationState | undefined) ?? 'pending'
  if (current === 'disqualified' || current === next) return
  if (next === 'engaged' && current === 'booked') return
  if (next === 'no_response' && current !== 'pending') return

  await supabase
    .from('leads')
    .update({ qualification_state: next, qualified_at: new Date().toISOString() })
    .eq('id', leadId)

  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'system',
    description: `Qualification → ${next} (${reason})`,
    metadata: { from: current, to: next, reason },
  })
}

/**
 * Sets the post-meeting deal temperature (hot/warm/cold) and logs the change.
 * No-ops if unchanged. Used by the acceptance classifier (hot) and the daily
 * silence-cooling sweep (warm/cold).
 */
export async function setDealTemperature(
  leadId: string,
  next: DealTemperature,
  reason: string,
): Promise<void> {
  const supabase = createServiceClient()
  const { data: lead } = await supabase
    .from('leads')
    .select('deal_temperature')
    .eq('id', leadId)
    .single()

  const current = (lead?.deal_temperature as DealTemperature | undefined) ?? null
  if (current === next) return

  await supabase
    .from('leads')
    .update({ deal_temperature: next, deal_temp_updated_at: new Date().toISOString() })
    .eq('id', leadId)

  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'system',
    description: `Deal temperature → ${next} (${reason})`,
    metadata: { from: current, to: next, reason },
  })
}

/**
 * Records that the lead read one of our sent WhatsApp messages (read receipt).
 * Matches the Meta message id against our stored template sends, then stamps
 * the lead so Phase 3 can do the "seen-but-no-reply" 24h nudge.
 */
export async function recordWhatsAppRead(waMessageId: string, readAtIso: string): Promise<void> {
  const supabase = createServiceClient()
  const { data: msg } = await supabase
    .from('whatsapp_messages')
    .select('lead_id')
    .eq('wati_message_id', waMessageId)
    .maybeSingle()

  const leadId = (msg as { lead_id?: string } | null)?.lead_id
  if (!leadId) return

  await supabase
    .from('leads')
    .update({ whatsapp_last_read_at: readAtIso })
    .eq('id', leadId)
}

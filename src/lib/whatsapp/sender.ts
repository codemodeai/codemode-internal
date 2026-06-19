import { createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import { sendTemplateMessage, normalizePhone } from './meta-client'
import {
  buildSequenceTemplate,
  buildMeetingScheduled,
  type SequenceStep,
  type WhatsAppPayload,
} from './templates'
import type { Lead } from '@/types/database'

/**
 * Core send: records a pending row, sends via Meta Cloud API, updates status.
 * `step` is stored for sequence tracking (0 = non-sequence message like meeting confirm).
 */
async function dispatch(lead: Lead, payload: WhatsAppPayload, step: number): Promise<boolean> {
  if (!lead.phone) {
    console.log(`[WA] Lead ${lead.id} has no phone — skipping ${payload.templateName}`)
    return false
  }
  if (!lead.whatsapp_opted_in) {
    console.log(`[WA] Lead ${lead.id} opted out — skipping ${payload.templateName}`)
    return false
  }

  const phone = normalizePhone(lead.phone)
  if (!phone) {
    console.warn(`[WA] Could not normalize phone "${lead.phone}" for lead ${lead.id}`)
    return false
  }

  const supabase = createServiceClient()

  const { data: msgRow } = await supabase
    .from('whatsapp_messages')
    .insert({
      lead_id: lead.id,
      sequence_step: step,
      template_name: payload.templateName,
      phone,
      params: (payload.bodyParams ?? []).map((value, i) => ({ name: String(i + 1), value })),
      status: 'pending',
    })
    .select('id')
    .single()

  const result = await sendTemplateMessage(phone, payload.templateName, {
    headerDocument: payload.headerDocument,
    bodyParams: payload.bodyParams,
    urlButtonParams: payload.urlButtonParams,
  })

  await supabase
    .from('whatsapp_messages')
    .update({
      status: result.ok ? 'sent' : 'failed',
      wati_message_id: result.messageId,
      error_message: result.error,
    })
    .eq('id', (msgRow as { id: string } | null)?.id ?? '')

  if (result.ok) {
    console.log(`[WA] Sent ${payload.templateName} to ${phone} (lead ${lead.id})`)
    return true
  }
  console.error(`[WA] Failed ${payload.templateName} for lead ${lead.id}:`, result.error)
  return false
}

/**
 * Sends a numbered nurture-sequence step.
 * For step 2 (audit ready), pass the generated PDF public URL.
 */
export async function sendWhatsAppStep(lead: Lead, step: SequenceStep, pdfUrl?: string | null): Promise<void> {
  const payload = buildSequenceTemplate(step, lead, pdfUrl)
  const ok = await dispatch(lead, payload, step)

  if (ok) {
    const supabase = createServiceClient()
    await supabase
      .from('leads')
      .update({
        whatsapp_sequence_step: step,
        whatsapp_last_sent_at: new Date().toISOString(),
      })
      .eq('id', lead.id)

    await logActivity({
      entity_type: 'lead',
      entity_id: lead.id,
      event_type: 'system',
      description: `WhatsApp step ${step} sent (${payload.templateName})`,
      metadata: { step, template: payload.templateName },
    })
  }
}

/**
 * Sends the meeting-scheduled confirmation (fired from Calendly sync).
 * Not part of the numbered nurture sequence.
 */
export async function sendWhatsAppMeetingConfirmation(lead: Lead): Promise<void> {
  const payload = buildMeetingScheduled(lead)
  const ok = await dispatch(lead, payload, 0)

  if (ok) {
    await logActivity({
      entity_type: 'lead',
      entity_id: lead.id,
      event_type: 'system',
      description: 'WhatsApp meeting confirmation sent',
      metadata: { template: payload.templateName, call_datetime: lead.call_datetime },
    })
  }
}

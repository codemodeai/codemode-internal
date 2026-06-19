import { createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import { sendTemplate, normalizePhone } from './client'
import { buildTemplate, type SequenceStep } from './templates'
import type { Lead } from '@/types/database'

export async function sendWhatsAppStep(lead: Lead, step: SequenceStep): Promise<void> {
  if (!lead.phone) {
    console.log(`[WA] Lead ${lead.id} has no phone — skipping step ${step}`)
    return
  }

  if (!lead.whatsapp_opted_in) {
    console.log(`[WA] Lead ${lead.id} opted out — skipping`)
    return
  }

  const phone = normalizePhone(lead.phone)
  if (!phone) {
    console.warn(`[WA] Could not normalize phone "${lead.phone}" for lead ${lead.id}`)
    return
  }

  const { templateName, params } = buildTemplate(step, lead)
  const supabase = createServiceClient()

  // Insert pending record
  const { data: msgRow } = await supabase
    .from('whatsapp_messages')
    .insert({
      lead_id: lead.id,
      sequence_step: step,
      template_name: templateName,
      phone,
      params,
      status: 'pending',
    })
    .select('id')
    .single()

  const result = await sendTemplate(templateName, { whatsappNumber: phone, customParams: params })

  const status = result.ok ? 'sent' : 'failed'

  await supabase
    .from('whatsapp_messages')
    .update({
      status,
      wati_message_id: result.messageId,
      error_message: result.error,
    })
    .eq('id', (msgRow as { id: string } | null)?.id ?? '')

  // Advance sequence step on lead
  if (result.ok) {
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
      description: `WhatsApp step ${step} sent (${templateName})`,
      metadata: { step, phone, template: templateName },
    })

    console.log(`[WA] Step ${step} sent to ${phone} (lead ${lead.id})`)
  } else {
    console.error(`[WA] Step ${step} failed for lead ${lead.id}:`, result.error)
  }
}

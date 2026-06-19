'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import { sendAuditReport, sendCallConfirmation, sendNurtureDay1, sendNotAFit, sendNeedMoreInfo } from '@/lib/email/resend'
import { sendWhatsAppMeetingConfirmation } from '@/lib/whatsapp/sender'
import { CALENDLY_LINK } from '@/lib/constants'
import type { Lead, LeadStatus, ProjectType } from '@/types/database'

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const supabase = await createClient()
  const { data: lead, error } = await supabase
    .from('leads')
    .update({ status, last_activity_at: new Date().toISOString() })
    .eq('id', leadId)
    .select()
    .single()
  if (error) throw new Error(error.message)

  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'status_change',
    description: `Status changed to ${status}`,
    metadata: { status },
  })

  if (status === 'audit_ready' && lead.email) {
    await sendAuditReport(lead, CALENDLY_LINK).catch(() => null)
  }
  if (status === 'nurture' && lead.email) {
    await sendNurtureDay1(lead).catch(() => null)
  }
  if (status === 'not_fit' && lead.email) {
    await sendNotAFit(lead).catch(() => null)
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

export async function addLeadNote(leadId: string, note: string) {
  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'note_added',
    description: note,
  })
  const supabase = await createClient()
  await supabase
    .from('leads')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', leadId)
  revalidatePath(`/leads/${leadId}`)
}

export async function qualifyLead(leadId: string, notes: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .update({
      qualified: true,
      qualification_notes: notes,
      status: 'qualified' as LeadStatus,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', leadId)
  if (error) throw new Error(error.message)

  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'operator_action',
    description: `Lead marked as qualified. Notes: ${notes}`,
  })
  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

export async function disqualifyLead(leadId: string, reason: string) {
  const supabase = await createClient()
  await supabase
    .from('leads')
    .update({
      status: 'not_fit' as LeadStatus,
      qualification_notes: reason,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'operator_action',
    description: `Lead marked not a fit. Reason: ${reason}`,
  })
  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

export async function sendAuditEmail(leadId: string) {
  const supabase = await createClient()
  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
  if (!lead || !lead.email) return
  await sendAuditReport(lead, CALENDLY_LINK)
  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'email_sent',
    description: 'Audit report email sent',
  })
  revalidatePath(`/leads/${leadId}`)
}

export async function requestMoreInfo(leadId: string) {
  const supabase = await createClient()
  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
  if (!lead || !lead.email) return
  await sendNeedMoreInfo(lead)
  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'email_sent',
    description: 'Need-more-info email sent',
  })
  revalidatePath(`/leads/${leadId}`)
}

export async function markBlueprintSent(leadId: string, blueprintUrl: string) {
  const supabase = await createClient()
  await supabase
    .from('leads')
    .update({
      blueprint_sent: true,
      blueprint_sent_at: new Date().toISOString(),
      blueprint_url: blueprintUrl || null,
      status: 'blueprint_sent' as LeadStatus,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'operator_action',
    description: 'Blueprint marked as sent',
    metadata: { blueprint_url: blueprintUrl },
  })
  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

export async function convertToClient(
  leadId: string,
  projectType: ProjectType,
  contractValue: number | null
) {
  const supabase = await createClient()
  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
  if (!lead) throw new Error('Lead not found')

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      lead_id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      business_name: lead.business_name,
      status: 'agreement_signed' as const,
    })
    .select()
    .single()
  if (clientError || !client) throw new Error(clientError?.message ?? 'Failed to create client')

  await supabase.from('projects').insert({
    client_id: client.id,
    project_type: projectType,
    title: `${projectType.replace(/_/g, ' ')} for ${lead.name}`,
    contract_value: contractValue,
    status: 'signed' as const,
    start_date: new Date().toISOString().split('T')[0],
  })

  await supabase
    .from('leads')
    .update({
      status: 'closed_won' as LeadStatus,
      converted_to_client: true,
      client_id: client.id,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'conversion',
    description: `Lead manually converted to client`,
    metadata: { client_id: client.id },
  })

  revalidatePath('/leads')
  revalidatePath('/clients')
  return client.id
}

export async function markCallBooked(leadId: string, datetime: string, meetLink: string) {
  const supabase = await createClient()
  const { data: lead, error } = await supabase
    .from('leads')
    .update({
      call_booked: true,
      call_datetime: datetime || null,
      call_meet_link: meetLink || null,
      status: 'call_scheduled' as LeadStatus,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .select()
    .single()
  if (error) throw new Error(error.message)

  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'operator_action',
    description: `Call scheduled${datetime ? ` for ${new Date(datetime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : ''}`,
    metadata: { call_datetime: datetime, meet_link: meetLink },
  })

  if (lead?.email && meetLink) {
    await sendCallConfirmation(lead).catch(() => null)
  }
  if (lead?.phone) {
    await sendWhatsAppMeetingConfirmation(lead as unknown as Lead).catch(() => null)
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

export async function archiveLead(leadId: string) {
  const supabase = await createClient()
  await supabase.from('leads').update({ archived: true }).eq('id', leadId)
  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'operator_action',
    description: 'Lead archived',
  })
  revalidatePath('/leads')
}

export async function updateCallConfirmation(leadId: string, meetLink: string) {
  const supabase = await createClient()
  const { data: lead } = await supabase
    .from('leads')
    .update({ call_meet_link: meetLink, last_activity_at: new Date().toISOString() })
    .eq('id', leadId)
    .select()
    .single()
  if (lead?.email) await sendCallConfirmation(lead).catch(() => null)
  await logActivity({
    entity_type: 'lead',
    entity_id: leadId,
    event_type: 'email_sent',
    description: 'Call confirmation email sent',
  })
  revalidatePath(`/leads/${leadId}`)
}

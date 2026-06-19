'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import type { ClientStatus, ProjectStatus, ScopeItemStatus, PaymentStatus, CorrectionStatus, ExtraStatus, ErrorStatus, ErrorSeverity, PaymentMethod } from '@/types/database'

// ── Client ────────────────────────────────────────────────────────────────────

export async function updateClientStatus(clientId: string, status: ClientStatus) {
  const supabase = await createSupabaseClient()
  await supabase.from('clients').update({ status }).eq('id', clientId)
  await logActivity({ entity_type: 'client', entity_id: clientId, event_type: 'status_change', description: `Client status → ${status}` })
  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
}

export async function updateClientNotes(clientId: string, note: string) {
  await logActivity({ entity_type: 'client', entity_id: clientId, event_type: 'note_added', description: note })
  const supabase = await createSupabaseClient()
  await supabase.from('clients').update({ updated_at: new Date().toISOString() }).eq('id', clientId)
  revalidatePath(`/clients/${clientId}`)
}

// ── Project ───────────────────────────────────────────────────────────────────

export async function updateProjectStatus(projectId: string, clientId: string, status: ProjectStatus) {
  const supabase = await createSupabaseClient()
  await supabase.from('projects').update({ status }).eq('id', projectId)
  await logActivity({ entity_type: 'client', entity_id: clientId, event_type: 'status_change', description: `Project status → ${status}` })
  revalidatePath(`/clients/${clientId}`)
}

export async function updateProjectDates(projectId: string, clientId: string, startDate: string, deliveryDate: string) {
  const supabase = await createSupabaseClient()
  await supabase.from('projects').update({ start_date: startDate || null, delivery_date: deliveryDate || null }).eq('id', projectId)
  revalidatePath(`/clients/${clientId}`)
}

export async function updateContractValue(projectId: string, clientId: string, value: number) {
  const supabase = await createSupabaseClient()
  await supabase.from('projects').update({ contract_value: value }).eq('id', projectId)
  revalidatePath(`/clients/${clientId}`)
}

// ── Scope items ───────────────────────────────────────────────────────────────

export async function createScopeItem(projectId: string, clientId: string, title: string, description: string) {
  const supabase = await createSupabaseClient()
  await supabase.from('scope_items').insert({ project_id: projectId, title, description: description || null, in_scope: true, status: 'not_started' as ScopeItemStatus })
  revalidatePath(`/clients/${clientId}`)
}

export async function updateScopeItemStatus(itemId: string, clientId: string, status: ScopeItemStatus) {
  const supabase = await createSupabaseClient()
  const completedAt = status === 'done' ? new Date().toISOString() : null
  await supabase.from('scope_items').update({ status, completed_at: completedAt }).eq('id', itemId)
  revalidatePath(`/clients/${clientId}`)
}

export async function deleteScopeItem(itemId: string, clientId: string) {
  const supabase = await createSupabaseClient()
  await supabase.from('scope_items').delete().eq('id', itemId)
  revalidatePath(`/clients/${clientId}`)
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function createPaymentMilestone(projectId: string, clientId: string, milestoneName: string, amount: number, dueDate: string) {
  const supabase = await createSupabaseClient()
  await supabase.from('payments').insert({
    project_id: projectId,
    milestone_name: milestoneName,
    amount,
    due_date: dueDate || null,
    status: 'pending' as PaymentStatus,
  })
  revalidatePath(`/clients/${clientId}`)
}

export async function markPaymentPaid(paymentId: string, clientId: string, method: PaymentMethod) {
  const supabase = await createSupabaseClient()
  await supabase.from('payments').update({ status: 'paid' as PaymentStatus, paid_at: new Date().toISOString(), payment_method: method }).eq('id', paymentId)
  await logActivity({ entity_type: 'client', entity_id: clientId, event_type: 'operator_action', description: `Payment marked paid` })
  revalidatePath(`/clients/${clientId}`)
}

export async function deletePayment(paymentId: string, clientId: string) {
  const supabase = await createSupabaseClient()
  await supabase.from('payments').delete().eq('id', paymentId)
  revalidatePath(`/clients/${clientId}`)
}

// ── Corrections ───────────────────────────────────────────────────────────────

export async function createCorrection(projectId: string, clientId: string, description: string, inScope: boolean) {
  const supabase = await createSupabaseClient()
  const { data: existing } = await supabase.from('corrections').select('round_number').eq('project_id', projectId).order('round_number', { ascending: false }).limit(1).single()
  const round = (existing?.round_number ?? 0) + 1
  await supabase.from('corrections').insert({
    project_id: projectId, round_number: round, description, in_scope: inScope, status: 'pending' as CorrectionStatus, requested_at: new Date().toISOString(),
  })
  revalidatePath(`/clients/${clientId}`)
}

export async function updateCorrectionStatus(correctionId: string, clientId: string, status: CorrectionStatus) {
  const supabase = await createSupabaseClient()
  const completedAt = status === 'done' ? new Date().toISOString() : null
  await supabase.from('corrections').update({ status, completed_at: completedAt }).eq('id', correctionId)
  revalidatePath(`/clients/${clientId}`)
}

// ── Extras ────────────────────────────────────────────────────────────────────

export async function createExtra(projectId: string, clientId: string, description: string, effortEstimate: string, agreedPrice: number | null) {
  const supabase = await createSupabaseClient()
  await supabase.from('extras').insert({
    project_id: projectId, description, effort_estimate: effortEstimate || null, agreed_price: agreedPrice, status: 'requested' as ExtraStatus, client_approved: false, invoiced: false, requested_at: new Date().toISOString(),
  })
  revalidatePath(`/clients/${clientId}`)
}

export async function updateExtraStatus(extraId: string, clientId: string, status: ExtraStatus) {
  const supabase = await createSupabaseClient()
  await supabase.from('extras').update({ status }).eq('id', extraId)
  revalidatePath(`/clients/${clientId}`)
}

export async function approveExtra(extraId: string, clientId: string) {
  const supabase = await createSupabaseClient()
  await supabase.from('extras').update({ client_approved: true, status: 'approved' as ExtraStatus }).eq('id', extraId)
  revalidatePath(`/clients/${clientId}`)
}

// ── Errors ────────────────────────────────────────────────────────────────────

export async function createError(projectId: string, clientId: string, title: string, description: string, severity: ErrorSeverity) {
  const supabase = await createSupabaseClient()
  await supabase.from('errors').insert({
    project_id: projectId, title, description: description || null, severity, reported_by: 'operator', status: 'open' as ErrorStatus, is_recurring: false, reported_at: new Date().toISOString(),
  })
  revalidatePath(`/clients/${clientId}`)
}

export async function updateErrorStatus(errorId: string, clientId: string, status: ErrorStatus) {
  const supabase = await createSupabaseClient()
  const fixedAt = status === 'fixed' ? new Date().toISOString() : null
  await supabase.from('errors').update({ status, fixed_at: fixedAt }).eq('id', errorId)
  revalidatePath(`/clients/${clientId}`)
}

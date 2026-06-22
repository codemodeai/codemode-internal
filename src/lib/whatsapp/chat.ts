import { createServiceClient } from '@/lib/supabase/server'
import { sendTextMessage, normalizePhone } from './meta-client'
import type { ChatTurn } from './agent'
import type { Lead } from '@/types/database'

export interface Conversation {
  id: string
  lead_id: string | null
  phone: string
  contact_name: string | null
  ai_enabled: boolean
  unread_count: number
  last_inbound_at: string | null
  last_message_at: string | null
}

/**
 * Finds a lead by phone (by last 10 digits). Matches against the generated
 * `phone_digits` column so any stored formatting (spaces, dashes, +country) is
 * ignored — a lead saved as "+91 90000 00001" still matches inbound "919000000001".
 */
export async function findLeadByPhone(phone: string): Promise<Lead | null> {
  const supabase = createServiceClient()
  const last10 = phone.replace(/\D/g, '').slice(-10)
  if (!last10) return null

  const { data } = await supabase
    .from('leads')
    .select('*')
    .like('phone_digits', `%${last10}%`)
    .order('created_at', { ascending: false })
    .limit(1)

  return (data?.[0] as unknown as Lead) ?? null
}

/** Gets or creates the conversation for a phone, linking the lead if found. */
export async function upsertConversation(phone: string, contactName?: string | null): Promise<Conversation> {
  const supabase = createServiceClient()
  const normalized = normalizePhone(phone) ?? phone.replace(/\D/g, '')

  const { data: existing } = await supabase
    .from('wa_conversations')
    .select('*')
    .eq('phone', normalized)
    .maybeSingle()

  if (existing) {
    // Backfill lead link if missing
    if (!existing.lead_id) {
      const lead = await findLeadByPhone(normalized)
      if (lead) {
        await supabase.from('wa_conversations').update({ lead_id: lead.id }).eq('id', existing.id)
        existing.lead_id = lead.id
      }
    }
    return existing as Conversation
  }

  const lead = await findLeadByPhone(normalized)
  const { data: created } = await supabase
    .from('wa_conversations')
    .insert({
      phone: normalized,
      contact_name: contactName ?? lead?.name ?? null,
      lead_id: lead?.id ?? null,
    })
    .select('*')
    .single()

  return created as Conversation
}

export async function recordMessage(args: {
  conversationId: string
  leadId: string | null
  direction: 'inbound' | 'outbound'
  body: string
  sender: 'lead' | 'ai' | 'operator'
  waMessageId?: string | null
  status?: string
}): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('wa_messages').insert({
    conversation_id: args.conversationId,
    lead_id: args.leadId,
    direction: args.direction,
    body: args.body,
    sender: args.sender,
    wa_message_id: args.waMessageId ?? null,
    status: args.status ?? (args.direction === 'inbound' ? 'received' : 'sent'),
  })

  const now = new Date().toISOString()
  if (args.direction === 'inbound') {
    // bump unread + timestamps
    const { data: conv } = await supabase
      .from('wa_conversations')
      .select('unread_count')
      .eq('id', args.conversationId)
      .single()
    await supabase
      .from('wa_conversations')
      .update({
        last_inbound_at: now,
        last_message_at: now,
        unread_count: ((conv?.unread_count as number) ?? 0) + 1,
      })
      .eq('id', args.conversationId)
  } else {
    await supabase
      .from('wa_conversations')
      .update({ last_message_at: now })
      .eq('id', args.conversationId)
  }
}

/** Returns recent history oldest→newest as ChatTurns for the AI. */
export async function getHistory(conversationId: string, limit = 20): Promise<ChatTurn[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('wa_messages')
    .select('direction, body')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  const rows = (data ?? []).reverse()
  return rows
    .filter(r => r.body)
    .map(r => ({
      role: r.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
      content: r.body as string,
    }))
}

/** Sends a free-form text message and stores it as outbound. */
export async function sendAndStore(
  conv: Conversation,
  text: string,
  sender: 'ai' | 'operator',
): Promise<boolean> {
  const result = await sendTextMessage(conv.phone, text)
  await recordMessage({
    conversationId: conv.id,
    leadId: conv.lead_id,
    direction: 'outbound',
    body: text,
    sender,
    waMessageId: result.messageId,
    status: result.ok ? 'sent' : 'failed',
  })
  return result.ok
}

/** Marks a conversation as read (clears unread count). */
export async function markRead(conversationId: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('wa_conversations').update({ unread_count: 0 }).eq('id', conversationId)
}

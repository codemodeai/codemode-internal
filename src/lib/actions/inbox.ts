'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendAndStore, markRead, type Conversation } from '@/lib/whatsapp/chat'

export async function sendOperatorReply(conversationId: string, text: string) {
  if (!text.trim()) return
  const supabase = await createClient()
  const { data: conv } = await supabase
    .from('wa_conversations')
    .select('*')
    .eq('id', conversationId)
    .single()
  if (!conv) throw new Error('Conversation not found')

  await sendAndStore(conv as Conversation, text.trim(), 'operator')
  revalidatePath('/inbox')
}

export async function toggleAi(conversationId: string, enabled: boolean) {
  const supabase = await createClient()
  await supabase.from('wa_conversations').update({ ai_enabled: enabled }).eq('id', conversationId)
  revalidatePath('/inbox')
}

export async function markConversationRead(conversationId: string) {
  await markRead(conversationId)
  revalidatePath('/inbox')
}

import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import {
  upsertConversation,
  recordMessage,
  getHistory,
  sendAndStore,
  findLeadByPhone,
} from '@/lib/whatsapp/chat'
import { generateAgentReply } from '@/lib/whatsapp/agent'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()
const VERIFY_TOKEN = clean(process.env.WHATSAPP_VERIFY_TOKEN) || 'codemode-verify'

// ── Meta webhook verification (GET) ────────────────────────────────
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ── Incoming messages (POST) ───────────────────────────────────────
interface WaMessage {
  from: string
  id: string
  type: string
  text?: { body: string }
  button?: { text: string }
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } }
}
interface WaContact { profile?: { name?: string }; wa_id: string }

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const payload = body as {
    entry?: { changes?: { value?: { contacts?: WaContact[]; messages?: WaMessage[] } }[] }[]
  }

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value
        if (!value?.messages) continue

        const contactName = value.contacts?.[0]?.profile?.name ?? null

        for (const msg of value.messages) {
          const text =
            msg.text?.body ??
            msg.button?.text ??
            msg.interactive?.button_reply?.title ??
            msg.interactive?.list_reply?.title ??
            null

          if (!text) continue // skip media/unsupported for now

          const conv = await upsertConversation(msg.from, contactName)

          await recordMessage({
            conversationId: conv.id,
            leadId: conv.lead_id,
            direction: 'inbound',
            body: text,
            sender: 'lead',
            waMessageId: msg.id,
          })

          if (conv.lead_id) {
            await logActivity({
              entity_type: 'lead',
              entity_id: conv.lead_id,
              event_type: 'system',
              description: `WhatsApp message received: "${text.slice(0, 80)}"`,
            })
          }

          // AI auto-reply (within the 24h window, which is open since they just messaged)
          if (conv.ai_enabled) {
            try {
              const lead = conv.lead_id ? await findLeadByPhone(conv.phone) : null
              const history = await getHistory(conv.id, 20)
              const reply = await generateAgentReply(lead, history)
              await sendAndStore(conv, reply, 'ai')
            } catch (aiErr) {
              console.error('[WA Webhook] AI reply failed:', aiErr)
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[WA Webhook] Processing error:', err)
  }

  // Always 200 so Meta doesn't retry-storm
  return NextResponse.json({ ok: true })
}

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
import { setQualification, recordWhatsAppRead, setDealTemperature } from '@/lib/leads/qualification'
import { classifyDealSignal, temperatureForSignal } from '@/lib/whatsapp/classify'
import { createServiceClient } from '@/lib/supabase/server'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()
const VERIFY_TOKEN = clean(process.env.WHATSAPP_VERIFY_TOKEN) || 'codemode-verify'

// Clear opt-out / not-interested signals → disqualify and stop messaging.
// Kept conservative so a normal "no thanks for now" doesn't disqualify a warm lead.
function isOptOut(text: string): boolean {
  const s = text.toLowerCase()
  return (
    /\b(stop|unsubscribe)\b/.test(s) ||
    /\bopt[\s-]?out\b/.test(s) ||
    s.includes('not interested') ||
    s.includes('remove me') ||
    s.includes('leave me alone') ||
    s.includes("don't message") ||
    s.includes('dont message') ||
    s.includes('do not message')
  )
}

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
    entry?: { changes?: { value?: {
      contacts?: WaContact[]
      messages?: WaMessage[]
      statuses?: { id: string; status: string; timestamp: string }[]
    } }[] }[]
  }

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value

        // Delivery/read receipts for messages WE sent — stamp read time on the lead.
        for (const st of value?.statuses ?? []) {
          if (st.status === 'read') {
            const readAt = new Date(Number(st.timestamp) * 1000).toISOString()
            await recordWhatsAppRead(st.id, readAt).catch(() => {})
          }
        }

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

          const optedOut = isOptOut(text)
          const lead = conv.lead_id ? await findLeadByPhone(conv.phone) : null

          if (conv.lead_id) {
            await logActivity({
              entity_type: 'lead',
              entity_id: conv.lead_id,
              event_type: 'system',
              description: `WhatsApp message received: "${text.slice(0, 80)}"`,
            })
            // Stamp last inbound for post-meeting silence tracking.
            await createServiceClient()
              .from('leads')
              .update({ last_inbound_at: new Date().toISOString() })
              .eq('id', conv.lead_id)

            if (optedOut) {
              // Clear opt-out → disqualify (terminal) and stop all future sends.
              await setQualification(conv.lead_id, 'disqualified', 'opted out on WhatsApp').catch(() => {})
              await createServiceClient()
                .from('leads')
                .update({ whatsapp_opted_in: false })
                .eq('id', conv.lead_id)
            } else {
              // They replied → engaged (won't downgrade a booked lead)
              await setQualification(conv.lead_id, 'engaged', 'replied on WhatsApp').catch(() => {})
              // Post-quote: read their stance and update the deal temperature (hot on accept).
              if (lead?.quoted_price) {
                try {
                  const hist = await getHistory(conv.id, 10)
                  const signal = await classifyDealSignal(lead.quoted_price, hist)
                  const temp = temperatureForSignal(signal)
                  if (temp) await setDealTemperature(conv.lead_id, temp, `reply after quote classified "${signal}"`)
                } catch (clsErr) {
                  console.error('[WA Webhook] deal classify failed:', clsErr)
                }
              }
            }
          }

          if (optedOut) {
            // Acknowledge the opt-out once; do NOT run the AI agent.
            await sendAndStore(
              conv,
              "Done — you won't get any more messages from us. If you ever change your mind, just reply here. 👋",
              'ai',
            ).catch(() => {})
          } else if (conv.ai_enabled) {
            // AI auto-reply (within the 24h window, which is open since they just messaged)
            try {
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

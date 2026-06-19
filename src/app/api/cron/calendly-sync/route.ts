import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import { sendWhatsAppMeetingConfirmation } from '@/lib/whatsapp/sender'
import type { Lead } from '@/types/database'

const CALENDLY_API = 'https://api.calendly.com'

function headers() {
  return {
    Authorization: `Bearer ${process.env.CALENDLY_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

async function getUserUri(): Promise<string> {
  const res = await fetch(`${CALENDLY_API}/users/me`, { headers: headers() })
  if (!res.ok) throw new Error(`Calendly /users/me failed: ${res.status}`)
  const data = await res.json()
  return data.resource.uri as string
}

async function getActiveEvents(userUri: string): Promise<CalendlyEvent[]> {
  const minTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const maxTime = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
  const url = `${CALENDLY_API}/scheduled_events?user=${encodeURIComponent(userUri)}&status=active&min_start_time=${minTime}&max_start_time=${maxTime}&count=100`
  const res = await fetch(url, { headers: headers() })
  if (!res.ok) throw new Error(`Calendly /scheduled_events failed: ${res.status}`)
  const data = await res.json()
  return (data.collection ?? []) as CalendlyEvent[]
}

async function getInvitees(eventUri: string): Promise<CalendlyInvitee[]> {
  const uuid = eventUri.split('/').pop()
  const res = await fetch(`${CALENDLY_API}/scheduled_events/${uuid}/invitees?count=100`, { headers: headers() })
  if (!res.ok) return []
  const data = await res.json()
  return (data.collection ?? []) as CalendlyInvitee[]
}

interface CalendlyEvent {
  uri: string
  start_time: string
  end_time: string
  location?: { join_url?: string; type?: string }
}

interface CalendlyInvitee {
  uri: string
  email: string
  name: string
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!process.env.CALENDLY_API_TOKEN) {
    return NextResponse.json({ error: 'CALENDLY_API_TOKEN not set' }, { status: 500 })
  }

  const supabase = createServiceClient()
  let synced = 0
  let skipped = 0

  try {
    const userUri = await getUserUri()
    const events = await getActiveEvents(userUri)

    console.log(`[Calendly Sync] Found ${events.length} active events`)

    for (const event of events) {
      const invitees = await getInvitees(event.uri)

      for (const invitee of invitees) {
        const email = invitee.email?.toLowerCase()
        if (!email) continue

        // Find matching lead by email
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name, email, phone, whatsapp_opted_in, call_booked, call_datetime, call_meet_link')
          .ilike('email', email)
          .order('created_at', { ascending: false })
          .limit(1)

        if (!leads || leads.length === 0) {
          console.log(`[Calendly Sync] No lead found for ${email}`)
          skipped++
          continue
        }

        const lead = leads[0]

        // Skip if already synced with this exact datetime
        if (lead.call_booked && lead.call_datetime === event.start_time) {
          skipped++
          continue
        }

        const joinUrl = event.location?.join_url ?? null

        await supabase.from('leads').update({
          call_booked: true,
          call_datetime: event.start_time,
          call_meet_link: joinUrl,
          status: 'call_scheduled',
          last_activity_at: new Date().toISOString(),
        }).eq('id', lead.id)

        await logActivity({
          entity_type: 'lead',
          entity_id: lead.id,
          event_type: 'operator_action',
          description: `Call booked via Calendly for ${new Date(event.start_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
          metadata: {
            start_time: event.start_time,
            join_url: joinUrl,
            invitee_email: email,
          },
        })

        // WhatsApp meeting confirmation
        try {
          await sendWhatsAppMeetingConfirmation({
            ...lead,
            call_datetime: event.start_time,
            call_meet_link: joinUrl,
          } as unknown as Lead)
        } catch (waErr) {
          console.error('[Calendly Sync] WhatsApp confirmation failed:', waErr)
        }

        console.log(`[Calendly Sync] Updated lead ${lead.id} (${lead.name}) — call at ${event.start_time}`)
        synced++
      }
    }

    return NextResponse.json({ ok: true, synced, skipped, total_events: events.length })
  } catch (err) {
    console.error('[Calendly Sync] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

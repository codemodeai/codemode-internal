import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const payload = body as {
    event?: string
    payload?: {
      event?: {
        start_time?: string
        end_time?: string
        location?: { join_url?: string; type?: string }
      }
      invitee?: { email?: string; name?: string }
    }
  }

  const eventType = payload.event
  const invitee = payload.payload?.invitee
  const scheduledEvent = payload.payload?.event

  // Only handle booking created events
  if (eventType !== 'invitee.created') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const email = invitee?.email
  const startTime = scheduledEvent?.start_time
  const joinUrl = scheduledEvent?.location?.join_url ?? null

  if (!email) {
    return NextResponse.json({ error: 'No invitee email in payload' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Find matching lead by email (most recent one)
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, email, status')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!leads || leads.length === 0) {
    console.warn('[Calendly] No lead found for email:', email)
    return NextResponse.json({ ok: true, message: 'No matching lead found' })
  }

  const lead = leads[0]

  await supabase.from('leads').update({
    call_booked: true,
    call_datetime: startTime ?? null,
    call_meet_link: joinUrl,
    status: 'call_scheduled',
    last_activity_at: new Date().toISOString(),
  }).eq('id', lead.id)

  await logActivity({
    entity_type: 'lead',
    entity_id: lead.id,
    event_type: 'operator_action',
    description: `Call booked via Calendly${startTime ? ` for ${new Date(startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : ''}`,
    metadata: { calendly_event: eventType, start_time: startTime, join_url: joinUrl },
  })

  console.log(`[Calendly] Call booked for lead ${lead.id} (${lead.name}) at ${startTime}`)

  return NextResponse.json({ ok: true, lead_id: lead.id })
}

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsAppMeetingReminder } from '@/lib/whatsapp/sender'
import type { Lead } from '@/types/database'

// Phase 3 — Meeting reminders.
// Call this endpoint frequently (~every 10 min) via an external scheduler
// (cron-job.org). GET /api/cron/meeting-reminders  with header  x-cron-secret: {CRON_SECRET}
//
// For each booked call it sends:
//   • a "starting in 30 minutes" reminder (once, within 30 min before the call)
//   • a "starting now" join-link reminder (once, at call time)
// Dedupe is via leads.reminder_30_sent_at / leads.reminder_start_sent_at.

const MIN = 60_000

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = Date.now()

  // Pull only calls near their start time. Lower bound (-20 min) lets a slightly
  // late cron tick still fire the on-time send; upper bound (+35 min) covers the
  // 30-min reminder window with cron-cadence slack.
  const windowStart = new Date(now - 20 * MIN).toISOString()
  const windowEnd = new Date(now + 35 * MIN).toISOString()

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('call_booked', true)
    .eq('whatsapp_opted_in', true)
    .not('phone', 'is', null)
    .not('call_datetime', 'is', null)
    .gte('call_datetime', windowStart)
    .lte('call_datetime', windowEnd)

  if (error) {
    console.error('[Reminder Cron] DB error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const results: { leadId: string; phase: '30m' | 'start' }[] = []

  for (const row of (leads ?? [])) {
    const lead = row as unknown as Lead
    if (!lead.call_datetime) continue
    const minsUntil = (new Date(lead.call_datetime).getTime() - now) / MIN

    // On-time send wins when we're at/just past the start time and it hasn't gone yet.
    if (minsUntil <= 5 && minsUntil > -20 && !lead.reminder_start_sent_at) {
      await sendWhatsAppMeetingReminder(lead, 'start')
      results.push({ leadId: lead.id, phase: 'start' })
    }
    // Otherwise the 30-min-before reminder, once, in the window before the call.
    else if (minsUntil > 5 && minsUntil <= 30 && !lead.reminder_30_sent_at) {
      await sendWhatsAppMeetingReminder(lead, '30m')
      results.push({ leadId: lead.id, phase: '30m' })
    }
  }

  console.log(`[Reminder Cron] Checked ${leads?.length ?? 0} upcoming calls, sent ${results.length} reminders`)
  return NextResponse.json({ checked: leads?.length ?? 0, sent: results })
}

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsAppStep } from '@/lib/whatsapp/sender'
import { setQualification } from '@/lib/leads/qualification'
import type { Lead } from '@/types/database'

// Call this endpoint daily via a cron job (e.g., cron-job.org, GitHub Actions, or Vercel Cron)
// GET /api/cron/whatsapp-followup  with header  x-cron-secret: {CRON_SECRET}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
}

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // --- Qualification sweep (Phase 2): leads who got their report but stayed
  // silent for 2+ days (never replied → still 'pending', not booked) → no_response.
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString()
  const { data: silent } = await supabase
    .from('leads')
    .select('id')
    .eq('qualification_state', 'pending')
    .eq('call_booked', false)
    .not('audit_report', 'is', null)
    .lte('created_at', twoDaysAgo)
  let qualifiedNoResponse = 0
  for (const s of silent ?? []) {
    await setQualification((s as { id: string }).id, 'no_response', '2 days silent after report')
    qualifiedNoResponse++
  }

  // Fetch all active leads with phone that haven't completed the sequence
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .not('phone', 'is', null)
    .eq('whatsapp_opted_in', true)
    .lt('whatsapp_sequence_step', 5)
    .not('status', 'in', '("closed_won","closed_lost","not_fit","archived")')
    .eq('call_booked', false)

  if (error) {
    console.error('[WA Cron] DB error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const results: { leadId: string; step: number; action: string }[] = []

  for (const row of (leads ?? [])) {
    const lead = row as unknown as Lead
    const currentStep = (lead.whatsapp_sequence_step as number | null) ?? 0
    const lastSentAt = lead.whatsapp_last_sent_at as string | null
    const auditReady = lead.status === 'audit_ready' || (lead.audit_report !== null)
    const daysSinceLast = lastSentAt ? daysSince(lastSentAt) : daysSince(lead.created_at)
    const daysSinceCreated = daysSince(lead.created_at)

    let nextStep: 3 | 4 | 5 | null = null

    // Step 3 — Day 1 follow-up (1+ days after audit ready, step 2 already sent)
    if (currentStep === 2 && auditReady && daysSinceLast >= 1) {
      nextStep = 3
    }
    // Step 4 — Day 3 follow-up
    else if (currentStep === 3 && daysSinceLast >= 2) {
      nextStep = 4
    }
    // Step 5 — Day 7 follow-up
    else if (currentStep === 4 && daysSinceLast >= 4) {
      nextStep = 5
    }
    // Safety: if stuck at step 0/1 and audit ready for 1+ day, nudge to step 3
    else if (currentStep <= 1 && auditReady && daysSinceCreated >= 1) {
      nextStep = 3
    }

    if (nextStep) {
      await sendWhatsAppStep(lead, nextStep)
      results.push({ leadId: lead.id, step: nextStep, action: 'sent' })
    }
  }

  console.log(`[WA Cron] Processed ${leads?.length ?? 0} leads, sent ${results.length} messages`)
  return NextResponse.json({ processed: leads?.length ?? 0, sent: results, qualified_no_response: qualifiedNoResponse })
}

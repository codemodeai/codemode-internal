import { createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import { sendAuditReport } from '@/lib/email/resend'
import { sendWhatsAppStep } from '@/lib/whatsapp/sender'
import { scrapeAll } from './scraper'
import { analyzeWithClaude } from './auditor'
import type { Lead } from '@/types/database'

const CALENDLY_LINK = process.env.CALENDLY_LINK ?? 'https://calendly.com/codemodeai'

export async function runAuditPipeline(leadId: string): Promise<void> {
  const supabase = createServiceClient()

  // Fetch lead
  const { data: leadRow, error: fetchErr } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (fetchErr || !leadRow) {
    console.error('[Audit] Could not fetch lead', leadId, fetchErr)
    return
  }

  const lead = leadRow as unknown as Lead

  // Mark as auditing
  await supabase.from('leads').update({ status: 'auditing' }).eq('id', leadId)

  console.log(`[Audit] Starting pipeline for lead ${leadId} (${lead.name})`)

  let analysisError: string | null = null

  try {
    // Scrape all platforms in parallel
    const scrape = await scrapeAll(lead.instagram_url, lead.facebook_url, lead.website_url)

    if (scrape.errors.length > 0) {
      console.warn('[Audit] Scrape errors:', scrape.errors)
    }

    // AI analysis
    const analysis = await analyzeWithClaude(lead, scrape)

    // Update lead with audit results
    const { data: updatedRow } = await supabase
      .from('leads')
      .update({
        status: 'audit_ready',
        instagram_score: analysis.instagram_score,
        facebook_score: analysis.facebook_score,
        website_score: analysis.website_score,
        growth_scorecard: analysis.growth_scorecard,
        gaps: analysis.gaps,
        opportunities: analysis.opportunities,
        call_talking_points: analysis.call_talking_points,
        audit_report: {
          summary: analysis.summary,
          generated_at: new Date().toISOString(),
          scrape_errors: scrape.errors,
        },
      })
      .eq('id', leadId)
      .select('*')
      .single()

    await logActivity({
      entity_type: 'lead',
      entity_id: leadId,
      event_type: 'system',
      description: 'Audit completed',
      metadata: {
        instagram_score: analysis.instagram_score,
        facebook_score: analysis.facebook_score,
        website_score: analysis.website_score,
        gaps_count: analysis.gaps.length,
      },
    })

    const updatedLead = updatedRow as unknown as Lead

    // Send email report
    if (lead.email && updatedRow) {
      try {
        const { data: emailData, error: emailError } = await sendAuditReport(updatedLead, CALENDLY_LINK)
        if (emailError) {
          console.error('[Audit] Resend rejected email:', emailError)
          await logActivity({
            entity_type: 'lead',
            entity_id: leadId,
            event_type: 'system',
            description: `Email send failed: ${(emailError as Error).message ?? String(emailError)}`,
            metadata: { to: lead.email, resend_error: emailError },
          })
        } else {
          console.log('[Audit] Email sent, Resend id:', (emailData as { id?: string })?.id)
          await logActivity({
            entity_type: 'lead',
            entity_id: leadId,
            event_type: 'email_sent',
            description: 'Audit report emailed to lead',
            metadata: { to: lead.email, resend_id: (emailData as { id?: string })?.id },
          })
        }
      } catch (emailErr) {
        console.error('[Audit] Email send failed:', emailErr)
      }
    }

    // WhatsApp Step 2 — audit ready notification
    if (lead.phone) {
      try {
        await sendWhatsAppStep(updatedLead, 2)
      } catch (waErr) {
        console.error('[Audit] WhatsApp step 2 failed:', waErr)
      }
    }

    console.log(`[Audit] Pipeline complete for lead ${leadId}`)
  } catch (err) {
    analysisError = err instanceof Error ? err.message : String(err)
    console.error('[Audit] Pipeline failed:', err)

    await supabase.from('leads').update({ status: 'new' }).eq('id', leadId)

    await logActivity({
      entity_type: 'lead',
      entity_id: leadId,
      event_type: 'system',
      description: `Audit pipeline failed: ${analysisError}`,
      metadata: { error: analysisError },
    })
  }
}

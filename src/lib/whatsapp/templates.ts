import type { Lead } from '@/types/database'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()
const CALENDLY = clean(process.env.CALENDLY_LINK) || 'https://calendly.com/codemodeai-support/code-mode'

export interface WhatsAppPayload {
  templateName: string
  bodyParams?: string[]
  headerDocument?: { link: string; filename: string }
  urlButtonParams?: { index: number; value: string }[]
}

/*
  ════════════════════════════════════════════════════════════════════
  META WHATSAPP TEMPLATES TO CREATE & SUBMIT FOR APPROVAL
  (Meta Business Suite → WhatsApp Manager → Message Templates)
  Language: English  ·  {{n}} = body variable
  ════════════════════════════════════════════════════════════════════

  1) cm_gao_welcome              Category: UTILITY
     Body:
       Hi {{1}}, thanks for requesting your free growth audit for *{{2}}*! ✅
       We're analysing your online presence now. Your full report lands in
       WhatsApp within a few minutes.
       — Code Mode

  2) cm_gao_audit_ready          Category: UTILITY
     Header: DOCUMENT  (a PDF will be attached at send time)
     Body:
       Hi {{1}}, your GAO growth audit is ready! 🎯
       *Biggest gap:* {{2}}
       *Revenue impact:* {{3}}
       Your full report is attached above as a PDF.
     Buttons:
       • URL button → "📅 Book Strategy Call"  →  <your Calendly link>  (static URL)

  3) cm_gao_meeting_scheduled    Category: UTILITY
     Body:
       Hi {{1}}, your strategy call is confirmed! 📅
       *When:* {{2}} (IST)
       *Join link:* {{3}}
       We'll walk through your audit and build your 90-day growth plan.
       See you then! — Code Mode

  4) cm_gao_followup_d1          Category: MARKETING
     Body:
       Hi {{1}}, quick follow-up on your audit for *{{2}}*.
       The biggest gap we found: *{{3}}*
       Most businesses fix this in 2–4 weeks. Want to see how?
     Buttons:
       • URL button → "📅 Book Free Call"  →  <your Calendly link>  (static URL)

  5) cm_gao_followup_d3          Category: MARKETING
     Body:
       Hi {{1}}, your *{{2}}* score was {{3}}/10.
       There's a clear path to 8+ — it starts with fixing: {{4}}
     Buttons:
       • URL button → "📅 Book Free Call"  →  <your Calendly link>  (static URL)

  6) cm_gao_followup_d7          Category: MARKETING
     Body:
       Hi {{1}}, last note from Code Mode.
       Your free growth audit is still waiting to be actioned.
       When you're ready to close your growth gaps, we're here.
     Buttons:
       • URL button → "📅 Book Free Call"  →  <your Calendly link>  (static URL)

  NOTE: When the Calendly URL is fixed (same for everyone), set it as a
  STATIC url button in the template — no runtime parameter needed.
  ════════════════════════════════════════════════════════════════════
*/

export function buildWelcome(lead: Lead): WhatsAppPayload {
  return {
    templateName: 'cm_gao_welcome',
    bodyParams: [lead.name, lead.business_name ?? lead.name],
  }
}

export function buildAuditReady(lead: Lead, pdfUrl: string | null): WhatsAppPayload {
  const topGap = lead.gaps?.[0]
  return {
    templateName: 'cm_gao_audit_ready',
    ...(pdfUrl
      ? { headerDocument: { link: pdfUrl, filename: `GAO-Audit-${(lead.business_name ?? lead.name).replace(/\s+/g, '-')}.pdf` } }
      : {}),
    bodyParams: [
      lead.name,
      topGap?.gap ?? 'See your full report',
      topGap?.revenue_impact ?? 'See report',
    ],
  }
}

export function buildMeetingScheduled(lead: Lead): WhatsAppPayload {
  const when = lead.call_datetime
    ? new Date(lead.call_datetime).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'your scheduled time'
  return {
    templateName: 'cm_gao_meeting_scheduled',
    bodyParams: [lead.name, when, lead.call_meet_link ?? CALENDLY],
  }
}

export function buildFollowupD1(lead: Lead): WhatsAppPayload {
  const topGap = lead.gaps?.[0]
  return {
    templateName: 'cm_gao_followup_d1',
    bodyParams: [lead.name, lead.business_name ?? lead.name, topGap?.gap ?? 'your lead-capture gap'],
  }
}

export function buildFollowupD3(lead: Lead): WhatsAppPayload {
  const lowest = [
    { label: 'Instagram', score: lead.instagram_score },
    { label: 'Facebook', score: lead.facebook_score },
    { label: 'Website', score: lead.website_score },
  ]
    .filter(p => p.score !== null)
    .sort((a, b) => (a.score ?? 10) - (b.score ?? 10))[0]
  const topGap = lead.gaps?.[0]
  return {
    templateName: 'cm_gao_followup_d3',
    bodyParams: [
      lead.name,
      lowest?.label ?? 'overall',
      String(lowest?.score ?? '?'),
      topGap?.gap ?? 'your main growth gap',
    ],
  }
}

export function buildFollowupD7(lead: Lead): WhatsAppPayload {
  return {
    templateName: 'cm_gao_followup_d7',
    bodyParams: [lead.name],
  }
}

export type SequenceStep = 1 | 2 | 3 | 4 | 5

// Numbered nurture-sequence steps (step 2 needs the PDF URL passed at call time)
export function buildSequenceTemplate(step: SequenceStep, lead: Lead, pdfUrl?: string | null): WhatsAppPayload {
  switch (step) {
    case 1: return buildWelcome(lead)
    case 2: return buildAuditReady(lead, pdfUrl ?? null)
    case 3: return buildFollowupD1(lead)
    case 4: return buildFollowupD3(lead)
    case 5: return buildFollowupD7(lead)
  }
}

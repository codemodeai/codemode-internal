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

  7) cm_gao_meeting_reminder     Category: UTILITY        ← NEW (Phase 3)
     Body:
       Hi {{1}}, your Code Mode strategy call is {{2}}! 📅
       *When:* {{3}} (IST)
       *Join link:* {{4}}
       See you there!
     NOTES:
       • One template covers BOTH reminder sends — {{2}} carries the timing
         phrase ("starting in 30 minutes" for the 30-min reminder, "starting
         now" for the on-time send). Saves a second Meta approval.
       • Body does NOT end on a variable (ends "See you there!") to satisfy
         Meta's rule that bit us on cm_gao_followup_d3.
       • No buttons — the join link is in the body as {{4}}.

  8) cm_gao_seen_nudge           Category: UTILITY        ← NEW (Phase 3 #6)
     Body:
       Hi {{1}}, noticed you checked out your Code Mode growth audit 👀
       Want us to walk you through turning *{{2}}* into a 90-day growth plan? It is a quick, free call.
     Buttons:
       • URL button → "Book Free Call"  →  <your Calendly link>  (static URL)
     NOTE: fired by the "report read but no reply for 24h" sweep. {{2}} = top gap.

  NOTE: When the Calendly URL is fixed (same for everyone), set it as a
  STATIC url button in the template — no runtime parameter needed.
  ════════════════════════════════════════════════════════════════════
*/

function formatIST(iso: string | null, fallback = 'your scheduled time'): string {
  if (!iso) return fallback
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function buildWelcome(lead: Lead): WhatsAppPayload {
  return {
    templateName: 'cm_gao_welcome',
    bodyParams: [lead.name, lead.business_name ?? lead.name],
  }
}

export function buildAuditReady(lead: Lead, pdfUrl: string | null): WhatsAppPayload {
  const topGap = lead.gaps?.[0]
  return {
    // v2 uses quick-reply buttons ("Book my call" / "I have a question") instead of a
    // URL button — tapping them opens the 24h window so the AI can take over free-form.
    templateName: 'cm_gao_audit_ready_v2',
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
  return {
    templateName: 'cm_gao_meeting_scheduled',
    bodyParams: [lead.name, formatIST(lead.call_datetime), lead.call_meet_link ?? CALENDLY],
  }
}

export type ReminderPhase = '30m' | 'start'

// Phase 3 meeting reminder. One template, the timing phrase ({{2}}) distinguishes
// the 30-min-before reminder from the on-time "starting now" send.
export function buildMeetingReminder(lead: Lead, phase: ReminderPhase): WhatsAppPayload {
  const timing = phase === '30m' ? 'starting in 30 minutes' : 'starting now'
  return {
    templateName: 'cm_gao_meeting_reminder',
    bodyParams: [lead.name, timing, formatIST(lead.call_datetime), lead.call_meet_link ?? CALENDLY],
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

// Phase 3 #6 — fired when a lead READ their audit but didn't reply for 24h.
export function buildSeenNudge(lead: Lead): WhatsAppPayload {
  const topGap = lead.gaps?.[0]
  return {
    templateName: 'cm_gao_seen_nudge',
    bodyParams: [lead.name, topGap?.gap ?? 'your biggest growth gap'],
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

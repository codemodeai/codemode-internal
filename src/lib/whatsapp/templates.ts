import type { Lead } from '@/types/database'

const CALENDLY = process.env.CALENDLY_LINK ?? 'https://calendly.com/codemodeai-support/code-mode'

export interface TemplatePayload {
  templateName: string
  params: { name: string; value: string }[]
}

/*
  WATI templates to create (Settings → Template Messages):

  cm_gao_welcome  (UTILITY)
  ───────────────
  Hi {{1}}, thanks for requesting your free growth audit for *{{2}}*! ✅
  We're analysing your presence now. Your personalised report will be in your inbox within 24 hours.
  — Code Mode

  cm_gao_audit_ready  (UTILITY)
  ────────────────────
  Hi {{1}}, your growth audit is ready! 🎯
  *Top gap:* {{2}}
  *Revenue impact:* {{3}}/month
  Check your email for the full report and scores.
  👉 Book your free strategy call: {{4}}

  cm_gao_followup_d1  (MARKETING)
  ────────────────────
  Hi {{1}}, quick follow-up on your Code Mode audit for *{{2}}*.
  The biggest gap we found: *{{3}}*
  Most businesses fix this in 2–4 weeks. Want to know how?
  Book a free 30-min call: {{4}}
  Reply STOP to unsubscribe.

  cm_gao_followup_d3  (MARKETING)
  ────────────────────
  Hi {{1}}, your *{{2}}* audit score was {{3}}/10.
  There's a clear path to 8+ — it starts with fixing: {{4}}
  Free strategy call (30 min): {{5}}
  Reply STOP to unsubscribe.

  cm_gao_followup_d7  (MARKETING)
  ────────────────────
  Hi {{1}}, last message from Code Mode.
  Your free growth audit is still waiting to be actioned.
  When you're ready to close your growth gaps: {{2}}
  Reply STOP to unsubscribe.
*/

export function buildStep1Welcome(lead: Lead): TemplatePayload {
  return {
    templateName: 'cm_gao_welcome',
    params: [
      { name: '1', value: lead.name },
      { name: '2', value: lead.business_name ?? lead.name },
    ],
  }
}

export function buildStep2AuditReady(lead: Lead): TemplatePayload {
  const topGap = lead.gaps?.[0]
  return {
    templateName: 'cm_gao_audit_ready',
    params: [
      { name: '1', value: lead.name },
      { name: '2', value: topGap?.gap ?? 'Found in your full report' },
      { name: '3', value: topGap?.revenue_impact ?? 'See report' },
      { name: '4', value: CALENDLY },
    ],
  }
}

export function buildStep3Day1(lead: Lead): TemplatePayload {
  const topGap = lead.gaps?.[0]
  return {
    templateName: 'cm_gao_followup_d1',
    params: [
      { name: '1', value: lead.name },
      { name: '2', value: lead.business_name ?? lead.name },
      { name: '3', value: topGap?.gap ?? 'lead capture gap' },
      { name: '4', value: CALENDLY },
    ],
  }
}

export function buildStep4Day3(lead: Lead): TemplatePayload {
  const lowestPlatform = [
    { label: 'Instagram', score: lead.instagram_score },
    { label: 'Facebook', score: lead.facebook_score },
    { label: 'Website', score: lead.website_score },
  ]
    .filter(p => p.score !== null)
    .sort((a, b) => (a.score ?? 10) - (b.score ?? 10))[0]

  const topGap = lead.gaps?.[0]

  return {
    templateName: 'cm_gao_followup_d3',
    params: [
      { name: '1', value: lead.name },
      { name: '2', value: lowestPlatform?.label ?? 'overall' },
      { name: '3', value: String(lowestPlatform?.score ?? '?') },
      { name: '4', value: topGap?.gap ?? 'your main growth gap' },
      { name: '5', value: CALENDLY },
    ],
  }
}

export function buildStep5Day7(lead: Lead): TemplatePayload {
  return {
    templateName: 'cm_gao_followup_d7',
    params: [
      { name: '1', value: lead.name },
      { name: '2', value: CALENDLY },
    ],
  }
}

export type SequenceStep = 1 | 2 | 3 | 4 | 5

export function buildTemplate(step: SequenceStep, lead: Lead): TemplatePayload {
  switch (step) {
    case 1: return buildStep1Welcome(lead)
    case 2: return buildStep2AuditReady(lead)
    case 3: return buildStep3Day1(lead)
    case 4: return buildStep4Day3(lead)
    case 5: return buildStep5Day7(lead)
  }
}

import type { Lead } from '@/types/database'

export async function notifyAuditReady(lead: Lead) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const avgScore = [lead.instagram_score, lead.facebook_score, lead.website_score]
    .filter((s): s is number => s !== null)
    .reduce((a, b, _, arr) => a + b / arr.length, 0)
    .toFixed(1)

  const topGaps = (lead.gaps ?? []).slice(0, 3).map(g => `• ${g.gap} — ${g.revenue_impact}`).join('\n')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `*New Audit Ready* — ${lead.name}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `Audit Ready: ${lead.name}` },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Business:*\n${lead.business_name ?? '—'}` },
            { type: 'mrkdwn', text: `*Source:*\n${lead.source}` },
            { type: 'mrkdwn', text: `*Avg Score:*\n${avgScore}/10` },
            { type: 'mrkdwn', text: `*Revenue:*\n${lead.revenue_range ?? '—'}` },
          ],
        },
        ...(topGaps ? [{
          type: 'section',
          text: { type: 'mrkdwn', text: `*Top Gaps:*\n${topGaps}` },
        }] : []),
        {
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: 'View Lead' },
            url: `${baseUrl}/leads/${lead.id}`,
            style: 'primary',
          }],
        },
      ],
    }),
  })
}

export async function notifyGeneric(text: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

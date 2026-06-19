import { Resend } from 'resend'
import type { Lead, Client } from '@/types/database'

const resend = new Resend(process.env.RESEND_API_KEY)
// Switch to 'Code Mode <hello@codemodeai.com>' once codemodeai.com is verified in Resend
const FROM = process.env.EMAIL_FROM ?? 'Code Mode <onboarding@resend.dev>'

export async function sendAuditReport(lead: Lead, calendlyLink: string) {
  return resend.emails.send({
    from: FROM,
    to: lead.email!,
    subject: `Your Free GAO Audit is Ready — ${lead.business_name ?? lead.name}`,
    html: auditReportHtml(lead, calendlyLink),
  })
}

export async function sendNeedMoreInfo(lead: Lead) {
  return resend.emails.send({
    from: FROM,
    to: lead.email!,
    subject: `Quick question about your business — ${lead.name}`,
    html: `<p>Hi ${lead.name},</p><p>Thanks for requesting your audit. I have a couple of quick follow-up questions to make sure I give you the most accurate report.</p><p>Reply to this email with a bit more detail about: <strong>${lead.bottleneck_text ?? 'your current situation'}</strong></p><p>— Code Mode</p>`,
  })
}

export async function sendNotAFit(lead: Lead) {
  return resend.emails.send({
    from: FROM,
    to: lead.email!,
    subject: `Your GAO Audit — ${lead.name}`,
    html: `<p>Hi ${lead.name},</p><p>Thank you for going through the audit. After reviewing your submission, I don't think we're the right fit right now — but I want to make sure you leave with something useful.</p><p>Here's a free resource to get you started: <a href="https://codemodeai.com/resources">Growth Systems Starter Guide</a></p><p>Wishing you the best,<br/>— Code Mode</p>`,
  })
}

export async function sendCallConfirmation(lead: Lead) {
  if (!lead.call_datetime) return
  const date = new Date(lead.call_datetime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  return resend.emails.send({
    from: FROM,
    to: lead.email!,
    subject: `Your Strategy Call is Confirmed — ${date}`,
    html: `<p>Hi ${lead.name},</p><p>Your strategy call is confirmed for <strong>${date} IST</strong>.</p>${lead.call_meet_link ? `<p><a href="${lead.call_meet_link}">Join the call here</a></p>` : ''}<p>See you then,<br/>— Code Mode</p>`,
  })
}

export async function sendNurtureDay1(lead: Lead) {
  return resend.emails.send({
    from: FROM,
    to: lead.email!,
    subject: `The #1 growth leak killing most coaching businesses`,
    html: `<p>Hi ${lead.name},</p><p>Most businesses I audit share the same gap — not in their product, but in their follow-up system. The average lead needs 5–7 touches before they make a decision. Most operators give up at 2.</p><p>Here's what a complete follow-up system looks like in 2026: [link]</p><p>— Code Mode</p>`,
  })
}

export async function sendOnboarding(client: Client) {
  return resend.emails.send({
    from: FROM,
    to: client.email!,
    subject: `Welcome to Code Mode — Let's Build Your Growth System`,
    html: `<p>Hi ${client.name},</p><p>Welcome aboard. I'm excited to get started on building your growth system.</p><p>Here's what happens next:</p><ul><li>I'll send the project scope document within 24 hours for your review</li><li>We'll kick off with a brief onboarding call to align on priorities</li><li>Weekly check-ins every Friday</li></ul><p>You can reach me directly at support@codemodeai.com for anything urgent.</p><p>Let's build something great,<br/>— Code Mode</p>`,
  })
}

function scoreBar(score: number): string {
  const filled = Math.round(score)
  const bars = Array.from({ length: 10 }, (_, i) =>
    `<span style="display:inline-block;width:18px;height:8px;border-radius:2px;margin-right:2px;background:${i < filled ? '#1A8FD1' : '#1e293b'};"></span>`
  ).join('')
  return `${bars} <strong style="color:${score >= 7 ? '#22c55e' : score >= 5 ? '#f59e0b' : '#ef4444'}">${score}/10</strong>`
}

function severityColor(s: string): string {
  return s === 'critical' ? '#ef4444' : s === 'major' ? '#f59e0b' : '#64748b'
}

function auditReportHtml(lead: Lead, calendlyLink: string): string {
  const scores = [
    { label: 'Instagram', score: lead.instagram_score, emoji: '📸' },
    { label: 'Facebook', score: lead.facebook_score, emoji: '📘' },
    { label: 'Website', score: lead.website_score, emoji: '🌐' },
  ].filter(s => s.score !== null) as { label: string; score: number; emoji: string }[]

  const sc = lead.growth_scorecard
  const summary = (lead.audit_report as { summary?: string } | null)?.summary ?? ''

  const scoreSection = scores.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      ${scores.map(s => `
        <tr>
          <td style="padding:10px 0;color:#94a3b8;font-size:14px;width:100px;">${s.emoji} ${s.label}</td>
          <td style="padding:10px 0;">${scoreBar(s.score)}</td>
        </tr>
      `).join('')}
    </table>` : ''

  const scorecardSection = sc ? `
    <h3 style="color:#94a3b8;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:32px 0 12px;">5-Dimension Growth Scorecard</h3>
    <table style="width:100%;border-collapse:collapse;">
      ${[
        ['Lead Capture', sc.lead_capture],
        ['Follow-up Speed', sc.followup_speed],
        ['Content Consistency', sc.content_consistency],
        ['Sales Process', sc.sales_process],
        ['Automation Maturity', sc.automation_maturity],
      ].map(([label, val]) => `
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;width:160px;">${label}</td>
          <td style="padding:8px 0;">${scoreBar(val as number)}</td>
        </tr>
      `).join('')}
    </table>` : ''

  const gapsSection = (lead.gaps ?? []).length > 0 ? `
    <h3 style="color:#94a3b8;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:32px 0 12px;">Top Growth Gaps</h3>
    ${(lead.gaps ?? []).map(g => `
      <div style="border-left:3px solid ${severityColor(g.severity)};padding:12px 16px;margin-bottom:10px;background:#0d1a2d;border-radius:0 6px 6px 0;">
        <p style="margin:0 0 4px;color:#f1f5f9;font-size:14px;font-weight:600;">${g.gap}</p>
        <p style="margin:0;color:#64748b;font-size:12px;">Revenue impact: <span style="color:#f59e0b">${g.revenue_impact}</span> &middot; Severity: <span style="color:${severityColor(g.severity)}">${g.severity}</span></p>
      </div>
    `).join('')}` : ''

  const opportunitiesSection = (lead.opportunities ?? []).length > 0 ? `
    <h3 style="color:#94a3b8;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:32px 0 12px;">Quick Win Opportunities</h3>
    ${(lead.opportunities ?? []).map(o => `
      <div style="border-left:3px solid #1A8FD1;padding:12px 16px;margin-bottom:10px;background:#0d1a2d;border-radius:0 6px 6px 0;">
        <p style="margin:0 0 4px;color:#f1f5f9;font-size:14px;">${o.opportunity}</p>
        <p style="margin:0;color:#64748b;font-size:12px;">Impact: <span style="color:#22c55e">${o.impact}</span></p>
      </div>
    `).join('')}` : ''

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#05090D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#1A8FD1,#0d6ba8);color:#fff;font-weight:700;font-size:12px;padding:6px 10px;border-radius:6px;letter-spacing:0.05em;">CM</div>
      <span style="color:#8099B5;font-size:13px;margin-left:10px;">Code Mode</span>
    </div>

    <!-- Title -->
    <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0 0 8px;line-height:1.2;">
      Your GAO Audit Report
    </h1>
    <p style="color:#8099B5;font-size:15px;margin:0 0 24px;">${lead.business_name ?? lead.name}</p>

    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(26,143,209,0.3),transparent);margin:24px 0;"></div>

    <!-- Summary -->
    ${summary ? `<p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 24px;">${summary}</p>` : ''}

    <!-- Platform Scores -->
    ${scores.length > 0 ? `
    <h3 style="color:#94a3b8;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 4px;">Platform Scores</h3>
    ${scoreSection}` : ''}

    <!-- Growth Scorecard -->
    ${scorecardSection}

    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(26,143,209,0.2),transparent);margin:32px 0;"></div>

    <!-- Gaps -->
    ${gapsSection}

    <!-- Opportunities -->
    ${opportunitiesSection}

    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(26,143,209,0.2),transparent);margin:32px 0;"></div>

    <!-- CTA -->
    <div style="text-align:center;padding:32px 24px;background:#0d1a2d;border-radius:12px;border:1px solid rgba(26,143,209,0.15);">
      <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px;">Ready to fix these gaps?</h2>
      <p style="color:#8099B5;font-size:14px;margin:0 0 24px;">Book a free 30-minute strategy call. We'll walk through your results and build your 90-day growth plan.</p>
      <a href="${calendlyLink}" style="display:inline-block;background:linear-gradient(135deg,#1A8FD1,#0d6ba8);color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">Book Your Strategy Call →</a>
    </div>

    <!-- Footer -->
    <p style="color:#475569;font-size:12px;text-align:center;margin:32px 0 0;">
      Code Mode &middot; <a href="mailto:support@codemodeai.com" style="color:#475569;">support@codemodeai.com</a>
    </p>

  </div>
</body>
</html>`
}

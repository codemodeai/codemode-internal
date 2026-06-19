import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { createServiceClient } from '@/lib/supabase/server'
import type { Lead } from '@/types/database'

// Brand palette
const BLUE = rgb(0.102, 0.561, 0.819)   // #1A8FD1
const DARK = rgb(0.07, 0.1, 0.16)
const GRAY = rgb(0.42, 0.45, 0.5)
const LIGHT = rgb(0.93, 0.95, 0.97)
const GREEN = rgb(0.13, 0.77, 0.37)
const AMBER = rgb(0.96, 0.62, 0.07)
const RED = rgb(0.94, 0.27, 0.27)

const PAGE_W = 595
const PAGE_H = 842
const MARGIN = 50

function scoreColor(v: number) {
  return v >= 7 ? GREEN : v >= 5 ? AMBER : RED
}

export async function generateAuditPdf(lead: Lead): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  let page = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H])
      y = PAGE_H - MARGIN
    }
  }

  // Wrap text to a width, return lines
  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = text.split(/\s+/)
    const lines: string[] = []
    let line = ''
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (f.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line)
        line = w
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    return lines
  }

  const drawParagraph = (text: string, f: PDFFont, size: number, color = DARK, lineGap = 4) => {
    const lines = wrap(text, f, size, PAGE_W - MARGIN * 2)
    for (const ln of lines) {
      newPageIfNeeded(size + lineGap)
      page.drawText(ln, { x: MARGIN, y, size, font: f, color })
      y -= size + lineGap
    }
  }

  const sectionTitle = (label: string) => {
    newPageIfNeeded(40)
    y -= 14
    page.drawText(label.toUpperCase(), { x: MARGIN, y, size: 11, font: bold, color: BLUE })
    y -= 6
    page.drawRectangle({ x: MARGIN, y, width: PAGE_W - MARGIN * 2, height: 1, color: LIGHT })
    y -= 14
  }

  // ── Header band ───────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PAGE_H - 90, width: PAGE_W, height: 90, color: DARK })
  page.drawRectangle({ x: MARGIN, y: PAGE_H - 56, width: 30, height: 22, color: BLUE })
  page.drawText('CM', { x: MARGIN + 6, y: PAGE_H - 51, size: 12, font: bold, color: rgb(1, 1, 1) })
  page.drawText('Code Mode', { x: MARGIN + 40, y: PAGE_H - 51, size: 13, font: bold, color: rgb(1, 1, 1) })
  page.drawText('GAO Growth Audit Report', { x: MARGIN, y: PAGE_H - 78, size: 18, font: bold, color: rgb(1, 1, 1) })
  y = PAGE_H - 120

  // Business name
  page.drawText(lead.business_name ?? lead.name, { x: MARGIN, y, size: 20, font: bold, color: DARK })
  y -= 18
  page.drawText(`Prepared for ${lead.name} · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    { x: MARGIN, y, size: 10, font, color: GRAY })
  y -= 10

  // ── Summary ───────────────────────────────────────────────────
  const summary = (lead.audit_report as { summary?: string } | null)?.summary
  if (summary) {
    sectionTitle('Executive Summary')
    drawParagraph(summary, font, 11, DARK, 5)
  }

  // ── Platform scores ───────────────────────────────────────────
  const scores = [
    { label: 'Instagram', score: lead.instagram_score },
    { label: 'Facebook', score: lead.facebook_score },
    { label: 'Website', score: lead.website_score },
  ].filter(s => s.score !== null) as { label: string; score: number }[]

  if (scores.length > 0) {
    sectionTitle('Platform Scores')
    const colW = (PAGE_W - MARGIN * 2) / scores.length
    newPageIfNeeded(60)
    scores.forEach((s, i) => {
      const cx = MARGIN + colW * i
      page.drawText(`${s.score}/10`, { x: cx, y: y - 4, size: 22, font: bold, color: scoreColor(s.score) })
      page.drawText(s.label, { x: cx, y: y - 22, size: 10, font, color: GRAY })
    })
    y -= 42
  }

  // ── Growth scorecard ──────────────────────────────────────────
  const sc = lead.growth_scorecard
  if (sc) {
    sectionTitle('5-Dimension Growth Scorecard')
    const dims: [string, number][] = [
      ['Lead Capture', sc.lead_capture],
      ['Follow-up Speed', sc.followup_speed],
      ['Content Consistency', sc.content_consistency],
      ['Sales Process', sc.sales_process],
      ['Automation Maturity', sc.automation_maturity],
    ]
    for (const [label, v] of dims) {
      newPageIfNeeded(22)
      page.drawText(label, { x: MARGIN, y, size: 10, font, color: DARK })
      const barX = MARGIN + 160
      const barW = PAGE_W - MARGIN - barX - 40
      page.drawRectangle({ x: barX, y: y - 1, width: barW, height: 8, color: LIGHT })
      page.drawRectangle({ x: barX, y: y - 1, width: barW * (v / 10), height: 8, color: scoreColor(v) })
      page.drawText(`${v}/10`, { x: barX + barW + 8, y, size: 9, font: bold, color: DARK })
      y -= 18
    }
  }

  // ── Gaps ──────────────────────────────────────────────────────
  const gaps = lead.gaps ?? []
  if (gaps.length > 0) {
    sectionTitle('Top Growth Gaps')
    for (const g of gaps) {
      newPageIfNeeded(40)
      const c = g.severity === 'critical' ? RED : g.severity === 'major' ? AMBER : GRAY
      page.drawRectangle({ x: MARGIN, y: y - 2, width: 4, height: 12, color: c })
      page.drawText(`${g.severity.toUpperCase()} · ${g.revenue_impact}`, { x: MARGIN + 12, y, size: 9, font: bold, color: c })
      y -= 14
      drawParagraph(g.gap, font, 10, DARK, 4)
      y -= 6
    }
  }

  // ── Opportunities ─────────────────────────────────────────────
  const opps = lead.opportunities ?? []
  if (opps.length > 0) {
    sectionTitle('Quick Win Opportunities')
    for (const o of opps) {
      newPageIfNeeded(34)
      page.drawRectangle({ x: MARGIN, y: y - 2, width: 4, height: 12, color: BLUE })
      page.drawText(`${o.impact.toUpperCase()} IMPACT`, { x: MARGIN + 12, y, size: 9, font: bold, color: BLUE })
      y -= 14
      drawParagraph(o.opportunity, font, 10, DARK, 4)
      y -= 6
    }
  }

  // ── Footer / CTA ──────────────────────────────────────────────
  newPageIfNeeded(60)
  y -= 10
  page.drawRectangle({ x: MARGIN, y: y - 40, width: PAGE_W - MARGIN * 2, height: 50, color: DARK })
  page.drawText('Ready to fix these gaps?', { x: MARGIN + 16, y: y - 12, size: 12, font: bold, color: rgb(1, 1, 1) })
  page.drawText('Book your free 30-minute strategy call — link in your WhatsApp message.',
    { x: MARGIN + 16, y: y - 28, size: 9, font, color: rgb(0.7, 0.78, 0.88) })

  return doc.save()
}

/**
 * Generates the PDF and uploads it to the public `reports` bucket.
 * Returns the public URL.
 */
export async function generateAndUploadAuditPdf(lead: Lead): Promise<string | null> {
  try {
    const bytes = await generateAuditPdf(lead)
    const supabase = createServiceClient()
    const path = `audit-${lead.id}.pdf`

    const { error } = await supabase.storage
      .from('reports')
      .upload(path, bytes, { contentType: 'application/pdf', upsert: true })

    if (error) {
      console.error('[PDF] Upload failed:', error.message)
      return null
    }

    const { data } = supabase.storage.from('reports').getPublicUrl(path)
    return data.publicUrl
  } catch (err) {
    console.error('[PDF] Generation failed:', err)
    return null
  }
}

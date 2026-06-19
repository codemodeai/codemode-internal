import Anthropic from '@anthropic-ai/sdk'
import type { Lead, GrowthScorecard, AuditGap, AuditOpportunity, TalkingPoint } from '@/types/database'
import type { ScrapeResult } from './scraper'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface AuditAnalysis {
  summary: string
  instagram_score: number | null
  facebook_score: number | null
  website_score: number | null
  growth_scorecard: GrowthScorecard
  gaps: AuditGap[]
  opportunities: AuditOpportunity[]
  call_talking_points: TalkingPoint[]
}

function buildPrompt(lead: Lead, scrape: ScrapeResult): string {
  const sections: string[] = []

  sections.push(`# Business Context
Name: ${lead.name}
Business: ${lead.business_name ?? 'Not provided'}
Type: ${lead.business_type ?? 'Not provided'}
Team Size: ${lead.team_size ?? 'Not provided'}
Revenue Range: ${lead.revenue_range ?? 'Not provided'}
Current Tools: ${lead.current_tools ?? 'None mentioned'}
Main Bottleneck (self-reported): ${lead.bottleneck_text ?? 'Not provided'}`)

  if (scrape.instagram) {
    const ig = scrape.instagram
    sections.push(`# Instagram Profile (@${ig.username})
Full Name: ${ig.fullName ?? 'N/A'}
Bio: ${ig.biography ?? 'No bio'}
Followers: ${ig.followersCount?.toLocaleString() ?? 'Unknown'}
Following: ${ig.followsCount?.toLocaleString() ?? 'Unknown'}
Posts: ${ig.postsCount ?? 'Unknown'}
Verified: ${ig.isVerified}
Business Account: ${ig.isBusinessAccount}
Category: ${ig.businessCategoryName ?? 'N/A'}
Link in Bio: ${ig.externalUrl ?? 'None'}
Recent Posts (${ig.recentPosts.length}):
${ig.recentPosts.map(p => `  - [${p.type ?? 'post'}] Likes: ${p.likesCount ?? '?'} | Comments: ${p.commentsCount ?? '?'} | Caption: ${(p.caption ?? '').slice(0, 100)}`).join('\n')}`)
  } else if (lead.instagram_url) {
    sections.push(`# Instagram\nURL provided: ${lead.instagram_url}\nScraping failed — analyse based on URL only.`)
  }

  if (scrape.facebook) {
    const fb = scrape.facebook
    sections.push(`# Facebook Page
Name: ${fb.name ?? 'N/A'}
Likes: ${fb.likesCount?.toLocaleString() ?? 'Unknown'}
Followers: ${fb.followersCount?.toLocaleString() ?? 'Unknown'}
Category: ${fb.category ?? 'N/A'}
About: ${fb.about ?? 'None'}
Website: ${fb.website ?? 'None'}
Phone: ${fb.phone ?? 'None'}
Email: ${fb.email ?? 'None'}
Rating: ${fb.rating ?? 'N/A'} (${fb.reviewsCount ?? 0} reviews)
Response Time: ${fb.responseTime ?? 'Unknown'}
CTA Button: ${fb.callToAction ?? 'None'}`)
  } else if (lead.facebook_url) {
    sections.push(`# Facebook\nURL provided: ${lead.facebook_url}\nScraping failed — analyse based on URL only.`)
  }

  if (scrape.website) {
    const w = scrape.website
    sections.push(`# Website (${w.url})
Title: ${w.title ?? 'None'}
Meta Description: ${w.description ?? 'None'}
Main Headline (H1): ${w.h1 ?? 'None'}
Subheadings: ${w.h2s.join(' | ') || 'None'}
CTA Buttons/Links: ${w.ctaTexts.join(' | ') || 'None'}
Has Lead Form: ${w.hasLeadForm}
Has WhatsApp Link: ${w.hasWhatsApp}
Has Phone Link: ${w.hasPhone}
Body Text Sample: ${w.bodyText.slice(0, 1000)}`)
  } else if (lead.website_url) {
    sections.push(`# Website\nURL provided: ${lead.website_url}\nScraping failed — analyse based on URL only.`)
  }

  return sections.join('\n\n')
}

const SYSTEM_PROMPT = `You are an expert digital growth auditor for Indian small businesses. You analyse Instagram profiles, Facebook pages, and websites to identify specific growth gaps and opportunities.

Score each platform out of 10. Be honest and specific — avoid generic advice. Tie everything back to the business's revenue context.

Scoring criteria:
- Instagram (10pts): Bio clarity + CTA (2), Content consistency + quality (2), Engagement rate (2), Lead capture mechanism (2), Social proof (2)
- Facebook (10pts): Page completeness (2), CTA button type (2), Reviews + ratings (2), Response time badge (2), Recent posting activity (2)
- Website (10pts): Headline clarity + value prop (2), Above-fold CTA (2), Social proof/testimonials (2), Lead capture form (2), Trust signals (2)

Growth Scorecard dimensions (1-10 each):
- lead_capture: How effectively their online presence captures leads
- followup_speed: Evidence of fast follow-up mechanisms (WhatsApp, booking tools)
- content_consistency: Regular, quality content posting
- sales_process: Clear path from awareness to sale
- automation_maturity: Use of booking, CRM, chatbot, or automation tools

Only score platforms that were provided. Use null for missing platforms.

Return ONLY valid JSON matching this exact schema:
{
  "summary": "2-3 sentence overall summary specific to this business",
  "instagram_score": number | null,
  "facebook_score": number | null,
  "website_score": number | null,
  "growth_scorecard": {
    "lead_capture": number,
    "followup_speed": number,
    "content_consistency": number,
    "sales_process": number,
    "automation_maturity": number
  },
  "gaps": [
    { "gap": "specific named gap", "severity": "critical|major|minor", "revenue_impact": "₹X–Y/month estimate" }
  ],
  "opportunities": [
    { "opportunity": "specific actionable opportunity", "impact": "high|medium|low" }
  ],
  "call_talking_points": [
    { "point": "specific talking point for the sales call" }
  ]
}

gaps: top 3 most impactful gaps, specific to their actual pages.
opportunities: top 3 quick wins they can act on.
call_talking_points: 3 sharp points to use when calling this lead.`

export async function analyzeWithClaude(lead: Lead, scrape: ScrapeResult): Promise<AuditAnalysis> {
  const userContent = buildPrompt(lead, scrape)

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude did not return valid JSON')

  const parsed = JSON.parse(jsonMatch[0]) as AuditAnalysis
  return parsed
}

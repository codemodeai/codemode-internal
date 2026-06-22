import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

// Pass the key explicitly with a BOM strip — the SDK's default env read would
// otherwise inherit a PowerShell-piped BOM and throw a ByteString header error.
const client = new Anthropic({ apiKey: (process.env.ANTHROPIC_API_KEY ?? '').replace(/^﻿/, '').trim() })

const PLAN_RATIOS = {
  launch:    { gao_funnel: 30, valuable: 30, case_study: 10, update: 20, social_proof: 5, industry: 5 },
  authority: { gao_funnel: 15, valuable: 40, case_study: 20, update: 10, social_proof: 10, industry: 5 },
  results:   { gao_funnel: 20, valuable: 20, case_study: 35, update: 10, social_proof: 10, industry: 5 },
  custom:    { gao_funnel: 20, valuable: 30, case_study: 15, update: 15, social_proof: 10, industry: 10 },
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { month, plan_type = 'authority', theme, target_posts = 20 } = await req.json()
  const ratios = PLAN_RATIOS[plan_type as keyof typeof PLAN_RATIOS] ?? PLAN_RATIOS.authority

  const prompt = `You are a content strategist for Code Mode, an AI growth systems agency.
Create a ${target_posts}-post content plan for ${month}.
Theme: ${theme ?? 'Growth automation for coaches and service providers'}
Plan type: ${plan_type}

Pillar distribution:
- GAO Funnel (lead gen): ${ratios.gao_funnel}%
- Valuable/Educational: ${ratios.valuable}%
- Case Studies: ${ratios.case_study}%
- Updates/Builds: ${ratios.update}%
- Social Proof: ${ratios.social_proof}%
- Industry/Trends: ${ratios.industry}%

Return ONLY valid JSON array of ${target_posts} content items:
[
  {
    "title": "Post title",
    "pillar": "gao_funnel|valuable|case_study|update|social_proof|industry",
    "platform": "instagram|linkedin|youtube|all",
    "format": "reel|carousel|post|short|article",
    "hook": "Opening hook",
    "scheduled_week": 1
  }
]`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const items = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    // Create content_plan record
    const { data: plan } = await supabase.from('content_plans').insert({
      month,
      theme: theme ?? null,
      plan_type,
      target_posts,
      ...Object.fromEntries(Object.entries(ratios).map(([k, v]) => [`${k}_pct`, v])),
    }).select().single()

    // Insert content items
    if (plan && items.length > 0) {
      await supabase.from('content_items').insert(
        items.map((item: Record<string, unknown>) => ({
          plan_id: plan.id,
          title: item.title,
          pillar: item.pillar,
          platform: item.platform,
          format: item.format ?? null,
          hook: item.hook ?? null,
          status: 'idea',
          views: 0, likes: 0, comments: 0, saves: 0, dm_triggers: 0,
        }))
      )
    }

    return NextResponse.json({ ok: true, plan_id: plan?.id, items_created: items.length, items })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }
}

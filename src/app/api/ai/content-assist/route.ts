import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { PILLAR_LABELS } from '@/lib/constants'
import type { ContentPillar } from '@/types/database'

// Pass the key explicitly with a BOM strip — the SDK's default env read would
// otherwise inherit a PowerShell-piped BOM and throw a ByteString header error.
const client = new Anthropic({ apiKey: (process.env.ANTHROPIC_API_KEY ?? '').replace(/^﻿/, '').trim() })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, pillar, platform, format } = await req.json()
  if (!title || !pillar || !platform) return NextResponse.json({ error: 'title, pillar, platform required' }, { status: 400 })

  const pillarLabel = PILLAR_LABELS[pillar as ContentPillar] ?? pillar

  const prompt = `You are a content strategist for Code Mode, an AI-powered growth systems agency.
Generate a content piece for the following:

Title: ${title}
Pillar: ${pillarLabel}
Platform: ${platform}
Format: ${format ?? 'post'}

Return ONLY valid JSON with this structure:
{
  "hook": "The opening line that stops the scroll (1-2 sentences)",
  "script": "Full content script or caption (3-5 paragraphs for long-form, 2-3 for short-form)",
  "cta": "Call-to-action text",
  "hashtags": "5-8 relevant hashtags as a single string"
}

Tone: Direct, authoritative, practical. Written from the perspective of a business owner helping other business owners automate growth.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }
}

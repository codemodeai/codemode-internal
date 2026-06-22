import Anthropic from '@anthropic-ai/sdk'
import type { ChatTurn } from './agent'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()
const anthropic = new Anthropic({ apiKey: clean(process.env.ANTHROPIC_API_KEY) })
const MODEL = 'claude-haiku-4-5-20251001'

export type DealSignal = 'accepted' | 'negotiating' | 'interested' | 'declined' | 'neutral'

/**
 * After we've quoted a price, read the lead's recent replies and classify where
 * the deal stands. Drives the Hot/Warm/Cold deal temperature.
 */
export async function classifyDealSignal(quotedPrice: string | null, history: ChatTurn[]): Promise<DealSignal> {
  const convo = history.map(h => `${h.role === 'user' ? 'Lead' : 'Us'}: ${h.content}`).join('\n')

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8,
    system: `We quoted this lead a price${quotedPrice ? ` of ${quotedPrice}` : ''} for our growth system. Read the conversation and classify the LEAD's CURRENT stance toward buying, as exactly ONE of these words:
accepted = they agreed / want to proceed / will pay / asked for the agreement or next steps
negotiating = they want a lower price / a discount / payment terms
interested = positive but no commitment yet / still considering
declined = they said no / it's too expensive and they're walking away / not interested
neutral = none of the above / off-topic / just a question
Reply with ONLY the single word, nothing else.`,
    messages: [{ role: 'user', content: convo || 'Lead: (no message)' }],
  })

  const word = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .toLowerCase()
    .trim()

  const valid: DealSignal[] = ['accepted', 'negotiating', 'interested', 'declined', 'neutral']
  return valid.find(v => word.includes(v)) ?? 'neutral'
}

/** Maps a deal signal to the temperature it should move the lead to (null = no change). */
export function temperatureForSignal(signal: DealSignal): 'hot' | 'warm' | 'cold' | null {
  switch (signal) {
    case 'accepted': return 'hot'
    case 'negotiating':
    case 'interested': return 'warm'
    case 'declined': return 'cold'
    default: return null
  }
}

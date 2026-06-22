'use client'

import { useState, useTransition } from 'react'
import { saveAiInstructions } from '@/lib/actions/leads'
import type { Lead } from '@/types/database'

export default function AiInstructions({ lead }: { lead: Lead }) {
  const [isPending, startTransition] = useTransition()
  const [instructions, setInstructions] = useState(lead.ai_instructions ?? '')
  const [quotedPrice, setQuotedPrice] = useState(lead.quoted_price ?? '')
  const [msg, setMsg] = useState('')

  function save() {
    startTransition(async () => {
      try {
        await saveAiInstructions(lead.id, instructions, quotedPrice)
        setMsg('Saved — the WhatsApp AI will follow these.')
        setTimeout(() => setMsg(''), 2500)
      } catch (e) {
        setMsg((e as Error).message)
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border-l-4 border-cm-blue space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-cm-blue uppercase tracking-wide">AI Instructions for this lead</h3>
        <p className="text-xs text-cm-subtle mt-1">
          After your call, tell the WhatsApp AI how to handle this specific person. These notes override the AI&apos;s
          general behaviour and guide all future follow-ups for this lead only.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-cm-muted font-medium">Price you quoted them (optional)</label>
        <input
          type="text"
          value={quotedPrice}
          onChange={e => setQuotedPrice(e.target.value)}
          placeholder="e.g. ₹45,000 or 40–50k"
          className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue"
        />
        <p className="text-[11px] text-cm-subtle">If set, the AI may reference this exact price (it won&apos;t invent one otherwise).</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-cm-muted font-medium">Instructions / context</label>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          rows={5}
          placeholder={'e.g. Wants only a website for now, budget-conscious. Interested in automation later. I quoted ₹45k. Follow up in 3 days, keep it warm, plant the automation seed but don\'t push.'}
          className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={isPending}
          className="bg-cm-blue hover:bg-cm-blue-dim disabled:opacity-40 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
        >
          {isPending ? 'Saving…' : 'Save AI Instructions'}
        </button>
        {msg && <span className="text-sm text-cm-blue font-medium">{msg}</span>}
      </div>
    </div>
  )
}

'use client'

import { useTransition } from 'react'
import { toggleAi } from '@/lib/actions/inbox'
import { Bot } from 'lucide-react'

export default function AiToggle({ conversationId, enabled }: { conversationId: string; enabled: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(async () => { await toggleAi(conversationId, !enabled) })}
      disabled={isPending}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
        enabled ? 'bg-cm-blue text-white' : 'bg-cm-bg text-cm-muted border border-cm-border'
      }`}
      title={enabled ? 'AI is auto-replying. Click to take over manually.' : 'AI is off. Click to let AI auto-reply.'}
    >
      <Bot size={14} />
      {enabled ? 'AI Auto-Reply ON' : 'AI Auto-Reply OFF'}
    </button>
  )
}

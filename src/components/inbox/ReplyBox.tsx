'use client'

import { useState, useTransition } from 'react'
import { sendOperatorReply } from '@/lib/actions/inbox'
import { Send } from 'lucide-react'

export default function ReplyBox({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()

  function send() {
    const value = text.trim()
    if (!value) return
    setText('')
    startTransition(async () => {
      await sendOperatorReply(conversationId, value)
    })
  }

  return (
    <div className="flex items-end gap-2 border-t border-cm-border bg-white p-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
        rows={1}
        placeholder="Type a reply…  (Enter to send, Shift+Enter for new line)"
        className="flex-1 resize-none bg-cm-bg border border-cm-border rounded-xl px-4 py-2.5 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue max-h-32"
      />
      <button
        onClick={send}
        disabled={isPending || !text.trim()}
        className="flex-shrink-0 w-10 h-10 rounded-xl bg-cm-blue hover:bg-cm-blue-dim disabled:opacity-40 text-white flex items-center justify-center transition-colors"
      >
        <Send size={16} />
      </button>
    </div>
  )
}

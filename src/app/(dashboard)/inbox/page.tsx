import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { markConversationRead } from '@/lib/actions/inbox'
import ReplyBox from '@/components/inbox/ReplyBox'
import AiToggle from '@/components/inbox/AiToggle'
import { MessageCircle, User } from 'lucide-react'

type SearchParams = Promise<{ c?: string }>

interface ConvRow {
  id: string
  lead_id: string | null
  phone: string
  contact_name: string | null
  ai_enabled: boolean
  unread_count: number
  last_message_at: string | null
}

interface MsgRow {
  id: string
  direction: 'inbound' | 'outbound'
  sender: 'lead' | 'ai' | 'operator'
  body: string | null
  created_at: string
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default async function InboxPage({ searchParams }: { searchParams: SearchParams }) {
  const { c } = await searchParams
  const supabase = await createClient()

  const { data: convData } = await supabase
    .from('wa_conversations')
    .select('id, lead_id, phone, contact_name, ai_enabled, unread_count, last_message_at')
    .order('last_message_at', { ascending: false })
    .limit(100)

  const conversations = (convData ?? []) as ConvRow[]
  const selectedId = c ?? conversations[0]?.id ?? null
  const selected = conversations.find(x => x.id === selectedId) ?? null

  let messages: MsgRow[] = []
  if (selected) {
    const { data: msgData } = await supabase
      .from('wa_messages')
      .select('id, direction, sender, body, created_at')
      .eq('conversation_id', selected.id)
      .order('created_at', { ascending: true })
      .limit(200)
    messages = (msgData ?? []) as MsgRow[]
    if (selected.unread_count > 0) await markConversationRead(selected.id)
  }

  return (
    <div className="h-[calc(100vh-7.5rem)] flex bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Conversation list */}
      <div className="w-80 flex-shrink-0 border-r border-cm-border flex flex-col">
        <div className="px-4 py-3.5 border-b border-cm-border">
          <h2 className="text-sm font-semibold text-cm-text flex items-center gap-2">
            <MessageCircle size={16} className="text-cm-blue" /> WhatsApp Inbox
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-cm-subtle text-sm">
              No conversations yet. They appear here when a lead messages your WhatsApp.
            </div>
          ) : (
            conversations.map(conv => (
              <Link
                key={conv.id}
                href={`/inbox?c=${conv.id}`}
                className={`block px-4 py-3 border-b border-gray-50 transition-colors ${
                  conv.id === selectedId ? 'bg-cm-blue-light' : 'hover:bg-cm-bg'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-cm-text truncate">
                    {conv.contact_name ?? `+${conv.phone}`}
                  </span>
                  <span className="text-xs text-cm-subtle flex-shrink-0">{timeAgo(conv.last_message_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-cm-muted truncate">+{conv.phone}</span>
                  {conv.unread_count > 0 && (
                    <span className="flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-cm-subtle text-sm">
            Select a conversation
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-cm-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cm-bg flex items-center justify-center">
                  <User size={16} className="text-cm-muted" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cm-text">{selected.contact_name ?? `+${selected.phone}`}</p>
                  <p className="text-xs text-cm-subtle">+{selected.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selected.lead_id && (
                  <Link href={`/leads/${selected.lead_id}`} className="text-xs text-cm-blue hover:underline">
                    View lead →
                  </Link>
                )}
                <AiToggle conversationId={selected.id} enabled={selected.ai_enabled} />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-cm-bg">
              {messages.map(m => {
                const mine = m.direction === 'outbound'
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        mine
                          ? m.sender === 'ai'
                            ? 'bg-cm-blue/90 text-white rounded-br-sm'
                            : 'bg-cm-blue text-white rounded-br-sm'
                          : 'bg-white text-cm-text rounded-bl-sm shadow-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-cm-subtle'}`}>
                        {m.sender === 'ai' ? '🤖 AI · ' : m.sender === 'operator' ? 'You · ' : ''}
                        {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
              {messages.length === 0 && (
                <div className="text-center text-cm-subtle text-sm py-8">No messages yet</div>
              )}
            </div>

            <ReplyBox conversationId={selected.id} />
          </>
        )}
      </div>
    </div>
  )
}

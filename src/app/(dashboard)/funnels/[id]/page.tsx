import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Funnel, FunnelEvent } from '@/types/database'
import {
  CopyWebhookUrl,
  ToggleActive,
  RegenerateKey,
  DeleteFunnel,
  FieldMappingEditor,
} from '@/components/funnels/FunnelActions'
import { Webhook, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ tab?: string }>

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const EVENT_STATUS_STYLE = {
  processed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100', label: 'Processed' },
  error:     { icon: XCircle,      color: 'text-red-500',     bg: 'bg-red-100',     label: 'Error'     },
  ignored:   { icon: AlertCircle,  color: 'text-gray-400',    bg: 'bg-gray-100',    label: 'Ignored'   },
}

export default async function FunnelDetailPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params
  const { tab = 'overview' } = await searchParams
  const supabase = await createClient()

  const { data: funnelData } = await supabase.from('funnels').select('*').eq('id', id).single()
  if (!funnelData) notFound()
  const funnel = funnelData as unknown as Funnel

  const webhookUrl = `${APP_URL}/api/hooks/${funnel.id}?key=${funnel.webhook_key}`

  const events = tab === 'events'
    ? ((await supabase.from('funnel_events').select('*').eq('funnel_id', id).order('received_at', { ascending: false }).limit(100)).data as unknown as FunnelEvent[])
    : null

  const { count: totalEvents } = await supabase
    .from('funnel_events').select('*', { count: 'exact', head: true }).eq('funnel_id', id)
  const { count: processedEvents } = await supabase
    .from('funnel_events').select('*', { count: 'exact', head: true }).eq('funnel_id', id).eq('status', 'processed')
  const { count: errorEvents } = await supabase
    .from('funnel_events').select('*', { count: 'exact', head: true }).eq('funnel_id', id).eq('status', 'error')

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb + Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/funnels" className="text-cm-subtle hover:text-cm-muted text-sm transition-colors">Funnels</Link>
            <span className="text-cm-border">/</span>
            <span className="text-cm-muted text-sm">{funnel.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-cm-text">{funnel.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${funnel.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {funnel.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {funnel.description && <p className="text-cm-muted text-sm mt-0.5">{funnel.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <ToggleActive funnel={funnel} />
        </div>
      </div>

      {/* Webhook URL card */}
      <div className="bg-cm-dark rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Webhook size={16} className="text-cm-blue-dim" />
          <p className="text-white text-sm font-semibold">Webhook URL</p>
        </div>
        <div className="flex items-center gap-3">
          <code className="flex-1 text-xs text-cm-steel bg-white/8 rounded-xl px-3 py-2.5 font-mono break-all">
            {webhookUrl}
          </code>
          <CopyWebhookUrl webhookUrl={webhookUrl} />
        </div>
        <p className="text-cm-steel text-xs mt-3">
          Send a <span className="font-mono text-cm-blue-dim">POST</span> request with a JSON body to this URL. The key in the query param authenticates the request.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Events', value: totalEvents ?? 0, color: 'text-cm-text' },
          { label: 'Leads Created', value: processedEvents ?? 0, color: 'text-emerald-600' },
          { label: 'Errors', value: errorEvents ?? 0, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-cm-subtle mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-cm-border">
        {[{ key: 'overview', label: 'Field Mapping' }, { key: 'events', label: 'Event Log' }, { key: 'danger', label: 'Settings' }].map(t => (
          <Link key={t.key} href={`/funnels/${id}?tab=${t.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-cm-blue text-cm-blue' : 'border-transparent text-cm-muted hover:text-cm-text'}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-xs font-semibold text-cm-subtle uppercase tracking-wide mb-4">Custom Field Mappings</h3>
          <FieldMappingEditor funnel={funnel} />
        </div>
      )}

      {tab === 'events' && (
        <div className="space-y-2">
          {(events ?? []).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-cm-subtle text-sm">No events received yet. Send a test POST to your webhook URL to see events here.</p>
            </div>
          ) : (events ?? []).map(event => {
            const style = EVENT_STATUS_STYLE[event.status]
            const StatusIcon = style.icon
            return (
              <div key={event.id} className="bg-white rounded-xl shadow-sm px-4 py-3">
                <div className="flex items-start gap-3">
                  <StatusIcon size={16} className={`${style.color} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.color}`}>{style.label}</span>
                      <span className="text-xs text-cm-subtle">{new Date(event.received_at).toLocaleString('en-IN')}</span>
                      {event.lead_id && (
                        <Link href={`/leads/${event.lead_id}`} className="text-xs text-cm-blue hover:underline">View Lead →</Link>
                      )}
                    </div>
                    {event.error_message && (
                      <p className="text-xs text-red-500 mb-1">{event.error_message}</p>
                    )}
                    {event.payload && (
                      <details className="group">
                        <summary className="text-xs text-cm-subtle cursor-pointer hover:text-cm-muted select-none">Show payload</summary>
                        <pre className="mt-2 text-xs text-cm-text bg-cm-bg rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'danger' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-semibold text-cm-subtle uppercase tracking-wide mb-1">Funnel Info</h3>
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <span className="text-xs text-cm-muted">Source Tag</span>
                <span className="text-xs font-mono text-cm-text">{funnel.source}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <span className="text-xs text-cm-muted">Created</span>
                <span className="text-xs text-cm-text">{new Date(funnel.created_at).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-cm-muted">Funnel ID</span>
                <span className="text-xs font-mono text-cm-subtle">{funnel.id}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">Danger Zone</h3>
            <div className="flex flex-wrap gap-3">
              <RegenerateKey funnelId={funnel.id} />
              <DeleteFunnel funnelId={funnel.id} />
            </div>
            <p className="text-xs text-cm-subtle mt-3">Regenerating the key will break existing integrations. Deleting removes all event history.</p>
          </div>
        </div>
      )}
    </div>
  )
}

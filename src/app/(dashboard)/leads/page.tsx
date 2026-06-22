import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '@/lib/constants'
import type { LeadStatus, LeadSource } from '@/types/database'

const SOURCE_LABELS: Record<LeadSource, string> = {
  gao_form: 'GAO Form',
  flox_instagram: 'Instagram',
  website: 'Website',
  direct: 'Direct',
}

const SEGMENT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  potential: { bg: 'bg-green-50', text: 'text-green-700', label: 'Potential' },
  nurture: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Nurture' },
  not_fit: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Not fit' },
}

const QUAL_STYLE: Record<string, { text: string; label: string }> = {
  pending: { text: 'text-cm-subtle', label: 'Pending' },
  engaged: { text: 'text-blue-600', label: 'Engaged' },
  no_response: { text: 'text-gray-400', label: 'No response' },
  booked: { text: 'text-green-600', label: 'Booked' },
  disqualified: { text: 'text-red-500', label: 'Disqualified' },
}

type SearchParams = Promise<{ status?: string; source?: string; q?: string; archived?: string }>

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('leads')
    .select('id, name, email, business_name, status, source, created_at, call_booked, qualified, instagram_score, facebook_score, website_score, overall_score, segment, qualification_state, deal_temperature, last_activity_at')
    .order('created_at', { ascending: false })

  const showArchived = sp.archived === '1'
  query = query.eq('archived', showArchived)

  if (sp.status) query = query.eq('status', sp.status as LeadStatus)
  if (sp.source) query = query.eq('source', sp.source as LeadSource)
  if (sp.q) query = query.ilike('name', `%${sp.q}%`)

  const { data: leads } = await query.limit(100)

  const statuses: LeadStatus[] = [
    'new', 'auditing', 'audit_ready', 'qualified', 'nurture',
    'not_fit', 'call_scheduled', 'call_done', 'blueprint_sent', 'closed_won', 'closed_lost',
  ]

  function buildUrl(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { status: sp.status, source: sp.source, q: sp.q, archived: sp.archived, ...updates }
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    const s = params.toString()
    return `/leads${s ? `?${s}` : ''}`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-cm-text">Leads</h1>
          <p className="text-sm text-cm-muted mt-0.5">{leads?.length ?? 0} results</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <form method="get" action="/leads" className="relative">
          <input
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="Search by name…"
            className="bg-white border border-cm-border rounded-xl px-3 py-2 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue w-56 shadow-sm"
          />
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          {sp.source && <input type="hidden" name="source" value={sp.source} />}
        </form>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href={buildUrl({ status: undefined })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!sp.status ? 'bg-cm-blue text-white' : 'bg-white text-cm-muted hover:text-cm-text shadow-sm border border-cm-border'}`}
          >
            All
          </Link>
          {statuses.map(s => {
            const c = LEAD_STATUS_COLORS[s]
            const active = sp.status === s
            return (
              <Link
                key={s}
                href={buildUrl({ status: active ? undefined : s })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active ? `${c.bg} ${c.text}` : 'bg-white text-cm-muted hover:text-cm-text shadow-sm border border-cm-border'
                }`}
              >
                {LEAD_STATUS_LABELS[s]}
              </Link>
            )
          })}
        </div>

        <Link
          href={buildUrl({ archived: showArchived ? undefined : '1' })}
          className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border shadow-sm ${
            showArchived ? 'bg-cm-text text-white border-cm-text' : 'bg-white text-cm-muted hover:text-cm-text border-cm-border'
          }`}
        >
          {showArchived ? 'Hide Archived' : 'Show Archived'}
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cm-border bg-cm-bg">
              <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Business</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Segment</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Source</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Scores</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(leads ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-cm-subtle">No leads found</td>
              </tr>
            ) : (
              (leads ?? []).map(lead => {
                const sc = LEAD_STATUS_COLORS[lead.status as LeadStatus]
                return (
                  <tr key={lead.id} className="hover:bg-cm-bg transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/leads/${lead.id}`} className="text-cm-text hover:text-cm-blue font-semibold transition-colors">
                        {lead.name}
                      </Link>
                      {lead.email && <p className="text-xs text-cm-subtle mt-0.5">{lead.email}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-cm-text">{lead.business_name ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                        {LEAD_STATUS_LABELS[lead.status as LeadStatus]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {lead.segment ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium w-fit ${SEGMENT_STYLE[lead.segment].bg} ${SEGMENT_STYLE[lead.segment].text}`}>
                            {SEGMENT_STYLE[lead.segment].label}
                            {lead.overall_score !== null && <span className="opacity-70">{lead.overall_score}</span>}
                          </span>
                          {lead.qualification_state && lead.qualification_state !== 'pending' && (
                            <span className={`text-[11px] font-medium ${QUAL_STYLE[lead.qualification_state]?.text ?? 'text-cm-subtle'}`}>
                              {QUAL_STYLE[lead.qualification_state]?.label ?? lead.qualification_state}
                            </span>
                          )}
                          {lead.deal_temperature && (
                            <span className="text-[11px] font-medium">
                              {lead.deal_temperature === 'hot' ? '🔥 Hot' : lead.deal_temperature === 'warm' ? '🌤️ Warm' : '❄️ Cold'}
                            </span>
                          )}
                        </div>
                      ) : <span className="text-cm-subtle">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-cm-muted">{SOURCE_LABELS[lead.source as LeadSource] ?? lead.source}</td>
                    <td className="px-5 py-3.5">
                      {(lead.instagram_score !== null || lead.facebook_score !== null || lead.website_score !== null) ? (
                        <div className="flex items-center gap-1.5 text-xs text-cm-muted">
                          {lead.instagram_score !== null && <span className="bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded font-medium">IG {lead.instagram_score}</span>}
                          {lead.facebook_score !== null && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">FB {lead.facebook_score}</span>}
                          {lead.website_score !== null && <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">WEB {lead.website_score}</span>}
                        </div>
                      ) : <span className="text-cm-subtle">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-cm-subtle text-xs">
                      {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

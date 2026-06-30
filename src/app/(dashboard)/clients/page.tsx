import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { ClientStatus } from '@/types/database'

const STATUS_COLORS: Record<ClientStatus, { bg: string; text: string }> = {
  quote_sent:        { bg: 'bg-blue-100',    text: 'text-blue-700' },
  agreement_signed:  { bg: 'bg-purple-100',  text: 'text-purple-700' },
  in_progress:       { bg: 'bg-amber-100',   text: 'text-amber-700' },
  review:            { bg: 'bg-cyan-100',    text: 'text-cyan-700' },
  corrections:       { bg: 'bg-orange-100',  text: 'text-orange-700' },
  delivered:         { bg: 'bg-green-100',   text: 'text-green-700' },
  retained:          { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  closed:            { bg: 'bg-slate-100',   text: 'text-slate-500' },
}

const STATUS_LABELS: Record<ClientStatus, string> = {
  quote_sent: 'Quote Sent', agreement_signed: 'Signed', in_progress: 'In Progress',
  review: 'Review', corrections: 'Corrections', delivered: 'Delivered', retained: 'Retained', closed: 'Closed',
}

type SearchParams = Promise<{ status?: string; q?: string }>

export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('clients')
    .select('id, name, email, business_name, status, converted_at, archived')
    .eq('archived', false)
    .order('converted_at', { ascending: false })

  if (sp.status) query = query.eq('status', sp.status as ClientStatus)
  if (sp.q) query = query.ilike('name', `%${sp.q}%`)

  const { data: clients } = await query.limit(100)

  const statuses = Object.keys(STATUS_LABELS) as ClientStatus[]

  function buildUrl(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { status: sp.status, q: sp.q, ...updates }
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    const s = params.toString()
    return `/clients${s ? `?${s}` : ''}`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-cm-text">Clients</h1>
          <p className="text-sm text-cm-muted mt-0.5">{clients?.length ?? 0} results</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <form method="get" action="/clients">
          <input
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="Search by name…"
            className="bg-white border border-cm-border rounded-xl px-3 py-2 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue w-56 shadow-sm"
          />
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
        </form>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href="/clients"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!sp.status ? 'bg-cm-blue text-white' : 'bg-white text-cm-muted hover:text-cm-text shadow-sm border border-cm-border'}`}
          >
            All
          </Link>
          {statuses.map(s => {
            const c = STATUS_COLORS[s]
            const active = sp.status === s
            return (
              <Link
                key={s}
                href={buildUrl({ status: active ? undefined : s })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? `${c.bg} ${c.text}` : 'bg-white text-cm-muted hover:text-cm-text shadow-sm border border-cm-border'}`}
              >
                {STATUS_LABELS[s]}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-cm-border bg-cm-bg">
              <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Client</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Business</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Converted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(clients ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-cm-subtle">No clients yet</td>
              </tr>
            ) : (
              (clients ?? []).map(c => {
                const sc = STATUS_COLORS[c.status as ClientStatus]
                return (
                  <tr key={c.id} className="hover:bg-cm-bg transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/clients/${c.id}`} className="text-cm-text hover:text-cm-blue font-semibold transition-colors">
                        {c.name}
                      </Link>
                      {c.email && <p className="text-xs text-cm-subtle mt-0.5">{c.email}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-cm-text">{c.business_name ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                        {STATUS_LABELS[c.status as ClientStatus]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-cm-subtle text-xs">
                      {new Date(c.converted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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

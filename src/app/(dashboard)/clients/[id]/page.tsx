import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Client, Project, ScopeItem, Payment, Correction, Extra, ProjectError, ActivityLog, ClientStatus, PaymentStatus } from '@/types/database'
import ClientWorkActions from '@/components/clients/ClientWorkActions'

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ tab?: string; sub?: string }>

const STATUS_LABELS: Record<ClientStatus, string> = {
  quote_sent: 'Quote Sent', agreement_signed: 'Signed', in_progress: 'In Progress',
  review: 'Review', corrections: 'Corrections', delivered: 'Delivered', retained: 'Retained', closed: 'Closed',
}
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
const TABS = [
  { key: 'overview',  label: 'Overview' },
  { key: 'quote',     label: 'Quote & Agreement' },
  { key: 'scope',     label: 'Scope' },
  { key: 'work',      label: 'Work Log' },
  { key: 'payments',  label: 'Payments' },
  { key: 'history',   label: 'History' },
]
const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  paid:    { bg: 'bg-green-100',  text: 'text-green-700' },
  overdue: { bg: 'bg-red-100',    text: 'text-red-600' },
}

export default async function ClientDetailPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params
  const { tab = 'overview', sub = 'corrections' } = await searchParams
  const supabase = await createClient()

  const [{ data: clientData }, { data: projectData }, { data: activityData }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('projects').select('*').eq('client_id', id).order('created_at').limit(1).maybeSingle(),
    supabase.from('activity_log').select('*').eq('entity_id', id).eq('entity_type', 'client').order('created_at', { ascending: false }).limit(50),
  ])
  const client = clientData as unknown as Client | null
  const project = projectData as unknown as Project | null
  const activityLogs = activityData as unknown as ActivityLog[] | null
  if (!client) notFound()

  const sc = STATUS_COLORS[client.status as ClientStatus]
  const pid = project?.id ?? ''

  const scopeItems = tab === 'scope' && pid
    ? ((await supabase.from('scope_items').select('*').eq('project_id', pid).order('created_at')).data as unknown as ScopeItem[])
    : null
  const payments = tab === 'payments' && pid
    ? ((await supabase.from('payments').select('*').eq('project_id', pid).order('due_date')).data as unknown as Payment[])
    : null
  const corrections = (tab === 'work' && sub === 'corrections' && pid)
    ? ((await supabase.from('corrections').select('*').eq('project_id', pid).order('round_number', { ascending: false })).data as unknown as Correction[])
    : null
  const extras = (tab === 'work' && sub === 'extras' && pid)
    ? ((await supabase.from('extras').select('*').eq('project_id', pid).order('created_at', { ascending: false })).data as unknown as Extra[])
    : null
  const errors = (tab === 'work' && sub === 'errors' && pid)
    ? ((await supabase.from('errors').select('*').eq('project_id', pid).order('reported_at', { ascending: false })).data as unknown as ProjectError[])
    : null

  const scopeDone = scopeItems?.filter(s => s.status === 'done').length ?? 0
  const scopeTotal = scopeItems?.length ?? 0
  const totalPaid = payments?.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0) ?? 0
  const totalPending = payments?.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0) ?? 0

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/clients" className="text-cm-subtle hover:text-cm-muted text-sm transition-colors">Clients</Link>
            <span className="text-cm-border">/</span>
            <span className="text-cm-muted text-sm">{client.name}</span>
          </div>
          <h1 className="text-xl font-bold text-cm-text">{client.name}</h1>
          {client.business_name && <p className="text-cm-muted text-sm mt-0.5">{client.business_name}</p>}
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
          {STATUS_LABELS[client.status as ClientStatus]}
        </span>
      </div>

      <div className="flex items-center gap-0 border-b border-cm-border overflow-x-auto">
        {TABS.map(t => (
          <Link key={t.key} href={`/clients/${id}?tab=${t.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              tab === t.key ? 'border-cm-blue text-cm-blue' : 'border-transparent text-cm-muted hover:text-cm-text'
            }`}
          >{t.label}</Link>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <InfoCard title="Contact">
              <Field label="Email" value={client.email} />
              <Field label="Phone" value={client.phone} />
            </InfoCard>
            <InfoCard title="Project">
              {project ? (
                <>
                  <Field label="Type" value={project.project_type.replace(/_/g, ' ')} />
                  <Field label="Status" value={project.status.replace(/_/g, ' ')} />
                  <Field label="Start Date" value={project.start_date ?? undefined} />
                  <Field label="Delivery Date" value={project.delivery_date ?? undefined} />
                  {project.is_retainer && <Field label="Retainer" value={`₹${Number(project.retainer_amount ?? 0).toLocaleString('en-IN')}/mo`} />}
                </>
              ) : <p className="text-cm-subtle text-sm">No project found</p>}
            </InfoCard>
          </div>
          <div className="space-y-4">
            <InfoCard title="Timeline">
              <Field label="Converted" value={new Date(client.converted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
              <Field label="Last Updated" value={new Date(client.updated_at).toLocaleDateString('en-IN')} />
            </InfoCard>
            {project?.notes && (
              <InfoCard title="Notes">
                <p className="text-sm text-cm-text leading-relaxed whitespace-pre-wrap">{project.notes}</p>
              </InfoCard>
            )}
          </div>
        </div>
      )}

      {tab === 'quote' && project && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Contract Value', value: project.contract_value ? `₹${Number(project.contract_value).toLocaleString('en-IN')}` : '—', color: 'text-cm-text' },
              { label: 'Collected', value: `₹${totalPaid.toLocaleString('en-IN')}`, color: 'text-emerald-600' },
              { label: 'Outstanding', value: `₹${totalPending.toLocaleString('en-IN')}`, color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
                <p className="text-xs text-cm-subtle uppercase tracking-wide mb-2">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <InfoCard title="Project Details">
            <Field label="Title" value={project.title} />
            <Field label="Type" value={project.project_type.replace(/_/g, ' ')} />
            <Field label="Status" value={project.status.replace(/_/g, ' ')} />
            <Field label="Start Date" value={project.start_date ?? undefined} />
            <Field label="Delivery Date" value={project.delivery_date ?? undefined} />
            <Field label="Retainer" value={project.is_retainer ? `Yes — ₹${Number(project.retainer_amount ?? 0).toLocaleString('en-IN')}/mo` : 'No'} />
          </InfoCard>
          <ClientWorkActions clientId={id} projectId={project.id} tab="quote" />
        </div>
      )}

      {tab === 'scope' && project && (
        <div className="space-y-4">
          {scopeTotal > 0 && (
            <div className="flex items-center gap-4 bg-white rounded-xl shadow-sm px-4 py-3">
              <div className="flex-1 h-2 bg-cm-bg rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${scopeTotal > 0 ? Math.round((scopeDone / scopeTotal) * 100) : 0}%` }} />
              </div>
              <span className="text-sm text-cm-muted flex-shrink-0 font-medium">{scopeDone}/{scopeTotal} done</span>
            </div>
          )}
          <ClientWorkActions clientId={id} projectId={project.id} tab="scope" />
          <div className="space-y-2">
            {(scopeItems ?? []).length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <p className="text-cm-subtle">No scope items yet</p>
              </div>
            ) : (
              (scopeItems ?? []).map(item => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${item.status === 'done' ? 'line-through text-cm-subtle' : 'text-cm-text'}`}>{item.title}</p>
                    {item.description && <p className="text-xs text-cm-subtle mt-0.5">{item.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      item.status === 'done' ? 'bg-green-100 text-green-700' :
                      item.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{item.status.replace(/_/g, ' ')}</span>
                    <ClientWorkActions clientId={id} projectId={project.id} tab="scope-item" itemId={item.id} currentStatus={item.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'work' && project && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {(['corrections', 'extras', 'errors'] as const).map(s => (
              <Link key={s} href={`/clients/${id}?tab=work&sub=${s}`}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${sub === s ? 'bg-cm-blue text-white' : 'bg-white text-cm-muted hover:text-cm-text shadow-sm border border-cm-border'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Link>
            ))}
          </div>
          <ClientWorkActions clientId={id} projectId={project.id} tab={`work-${sub}`} />

          {sub === 'corrections' && (
            <div className="space-y-2">
              {(corrections ?? []).length === 0 ? (
                <p className="text-cm-subtle text-sm py-4">No corrections logged</p>
              ) : (corrections ?? []).map(c => (
                <div key={c.id} className="bg-white rounded-xl shadow-sm px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-cm-muted">Round #{c.round_number}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.status === 'done' ? 'bg-green-100 text-green-700' : c.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                  </div>
                  <p className="text-sm text-cm-text">{c.description}</p>
                  {!c.in_scope && <span className="text-xs text-orange-500 mt-1 block font-medium">Out of scope</span>}
                </div>
              ))}
            </div>
          )}

          {sub === 'extras' && (
            <div className="space-y-2">
              {(extras ?? []).length === 0 ? (
                <p className="text-cm-subtle text-sm py-4">No extra work logged</p>
              ) : (extras ?? []).map(e => (
                <div key={e.id} className="bg-white rounded-xl shadow-sm px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${e.status === 'done' ? 'bg-green-100 text-green-700' : e.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{e.status}</span>
                    {e.agreed_price !== null && <span className="text-sm font-bold text-cm-text">₹{Number(e.agreed_price).toLocaleString('en-IN')}</span>}
                  </div>
                  <p className="text-sm text-cm-text">{e.description}</p>
                  {e.effort_estimate && <p className="text-xs text-cm-muted mt-0.5">Effort: {e.effort_estimate}</p>}
                </div>
              ))}
            </div>
          )}

          {sub === 'errors' && (
            <div className="space-y-2">
              {(errors ?? []).length === 0 ? (
                <p className="text-cm-subtle text-sm py-4">No errors logged</p>
              ) : (errors ?? []).map(e => (
                <div key={e.id} className="bg-white rounded-xl shadow-sm px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${e.severity === 'critical' ? 'bg-red-100 text-red-600' : e.severity === 'major' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}>{e.severity}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${e.status === 'fixed' ? 'bg-green-100 text-green-700' : e.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{e.status}</span>
                  </div>
                  <p className="text-sm font-medium text-cm-text">{e.title}</p>
                  {e.description && <p className="text-xs text-cm-muted mt-0.5">{e.description}</p>}
                  {e.is_recurring && <span className="text-xs text-red-500 mt-1 block font-medium">Recurring issue</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'payments' && project && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
              <p className="text-xs text-cm-subtle uppercase tracking-wide mb-2">Collected</p>
              <p className="text-2xl font-bold text-emerald-600">₹{totalPaid.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
              <p className="text-xs text-cm-subtle uppercase tracking-wide mb-2">Outstanding</p>
              <p className="text-2xl font-bold text-amber-600">₹{totalPending.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <ClientWorkActions clientId={id} projectId={project.id} tab="payments" />
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-cm-border bg-cm-bg">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Milestone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Due</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(payments ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-cm-subtle">No payment milestones yet</td></tr>
                ) : (payments ?? []).map(p => {
                  const isOverdue = p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date()
                  const effectiveStatus = isOverdue ? 'overdue' : (p.status as PaymentStatus)
                  const pc = PAYMENT_STATUS_COLORS[effectiveStatus]
                  return (
                    <tr key={p.id} className="hover:bg-cm-bg">
                      <td className="px-5 py-3.5 text-cm-text font-medium">{p.milestone_name}</td>
                      <td className="px-5 py-3.5 text-cm-text font-bold">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3.5 text-cm-muted text-xs">
                        {p.due_date ? new Date(p.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${pc.bg} ${pc.text}`}>
                          {isOverdue ? 'Overdue' : p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.status === 'pending' && <ClientWorkActions clientId={id} projectId={project.id} tab="mark-paid" paymentId={p.id} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {(activityLogs ?? []).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-cm-subtle">No activity yet</p>
            </div>
          ) : (activityLogs ?? []).map(log => (
            <div key={log.id} className="flex items-start gap-4 bg-white rounded-xl shadow-sm px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-cm-blue flex-shrink-0 mt-1.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-cm-text">{log.description}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-cm-subtle">{new Date(log.created_at).toLocaleString('en-IN')}</span>
                  <span className="text-xs text-cm-subtle bg-cm-bg px-1.5 py-0.5 rounded">{log.event_type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="text-xs font-semibold text-cm-subtle uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-cm-muted">{label}</span>
      <span className="text-xs text-cm-text font-medium">{value ?? '—'}</span>
    </div>
  )
}

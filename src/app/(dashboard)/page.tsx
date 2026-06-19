import { createClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, addDays, formatISO } from 'date-fns'
import { Users, Briefcase, Phone, FileCheck, ArrowRight, AlertCircle, CalendarDays, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { LEAD_STATUS_LABELS } from '@/lib/constants'
import type { LeadStatus } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = formatISO(startOfMonth(now))
  const monthEnd = formatISO(endOfMonth(now))

  const [
    { count: leadsThisMonth },
    { count: auditsThisMonth },
    { count: activeClients },
    { count: callsThisMonth },
    { count: blueprintsPending },
    { count: contentNext7 },
    { data: overduePayments },
    { data: pipelineLeadsKanban },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart).lte('created_at', monthEnd),
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart).lte('created_at', monthEnd)
      .in('status', ['audit_ready', 'qualified', 'call_scheduled', 'call_done', 'blueprint_sent', 'closed_won', 'closed_lost']),
    supabase.from('clients').select('*', { count: 'exact', head: true })
      .in('status', ['in_progress', 'retained']),
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart).lte('created_at', monthEnd).eq('call_booked', true),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'blueprint_sent'),
    supabase.from('content_items').select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .gte('scheduled_date', formatISO(now, { representation: 'date' }))
      .lte('scheduled_date', formatISO(addDays(now, 7), { representation: 'date' })),
    supabase.from('payments').select('id, milestone_name, amount, due_date, project_id')
      .eq('status', 'pending').lt('due_date', formatISO(now, { representation: 'date' })).limit(4),
    supabase.from('leads').select('id, name, business_name, status')
      .in('status', ['new', 'audit_ready', 'qualified', 'call_scheduled', 'blueprint_sent'])
      .eq('archived', false).order('created_at', { ascending: false }).limit(20),
  ])

  const metrics = [
    { label: 'Leads This Month', value: leadsThisMonth ?? 0, icon: Users, iconBg: 'bg-cm-blue-light', iconColor: 'text-cm-blue' },
    { label: 'Active Clients', value: activeClients ?? 0, icon: Briefcase, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500' },
    { label: 'Calls Booked', value: callsThisMonth ?? 0, icon: Phone, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Blueprints Pending', value: blueprintsPending ?? 0, icon: FileCheck, iconBg: 'bg-orange-50', iconColor: 'text-orange-500' },
  ]

  const stageLabels: Record<string, string> = {
    new: 'New', audit_ready: 'Audit Ready', qualified: 'Qualified',
    call_scheduled: 'Call Scheduled', blueprint_sent: 'Blueprint Sent',
  }
  const stageDots: Record<string, string> = {
    new: 'bg-blue-400', audit_ready: 'bg-orange-400', qualified: 'bg-emerald-400',
    call_scheduled: 'bg-purple-400', blueprint_sent: 'bg-cyan-400',
  }

  const stages = ['new', 'audit_ready', 'qualified', 'call_scheduled', 'blueprint_sent']
  const byStage = stages.reduce<Record<string, typeof pipelineLeadsKanban>>((acc, s) => {
    acc[s] = (pipelineLeadsKanban ?? []).filter(l => l.status === s)
    return acc
  }, {})

  const greetingHour = now.getHours()
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">

      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cm-text">{greeting} 👋</h1>
          <p className="text-cm-muted text-sm mt-0.5">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          href="/leads"
          className="flex items-center gap-2 bg-cm-blue hover:bg-cm-blue-dim text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          + New Lead
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${m.iconBg} flex items-center justify-center`}>
                <m.icon size={18} className={m.iconColor} />
              </div>
              <TrendingUp size={14} className="text-cm-subtle" />
            </div>
            <p className="text-3xl font-bold text-cm-text">{m.value}</p>
            <p className="text-xs text-cm-muted mt-1 leading-snug">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-4">

        {/* Pipeline kanban — 2 cols */}
        <div className="col-span-2 bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-cm-text">Active Pipeline</h2>
            <Link href="/leads" className="text-xs text-cm-blue flex items-center gap-1 hover:underline font-medium">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {stages.map(stage => {
              const leads = byStage[stage] ?? []
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stageDots[stage]}`} />
                    <span className="text-xs font-medium text-cm-muted truncate">{stageLabels[stage]}</span>
                    <span className="ml-auto text-xs bg-cm-bg text-cm-subtle rounded-full px-1.5 min-w-[20px] text-center flex-shrink-0">{leads.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {leads.slice(0, 4).map(lead => (
                      <Link
                        key={lead.id}
                        href={`/leads/${lead.id}`}
                        className="block bg-cm-bg hover:bg-cm-blue-light rounded-lg px-2.5 py-2 transition-colors group"
                      >
                        <p className="text-xs font-medium text-cm-text group-hover:text-cm-blue truncate leading-tight">{lead.name}</p>
                        {lead.business_name && (
                          <p className="text-xs text-cm-subtle truncate mt-0.5 leading-tight">{lead.business_name}</p>
                        )}
                      </Link>
                    ))}
                    {leads.length > 4 && (
                      <p className="text-xs text-cm-subtle text-center py-1">+{leads.length - 4} more</p>
                    )}
                    {leads.length === 0 && (
                      <div className="bg-cm-bg rounded-lg py-4 text-center">
                        <p className="text-xs text-cm-subtle">—</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">

          {/* Dark stats card */}
          <div className="bg-cm-dark rounded-2xl p-5">
            <p className="text-xs text-cm-steel uppercase tracking-wider mb-4 font-medium">This Month</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/8">
                <span className="text-cm-steel text-sm">Audits Run</span>
                <span className="text-white font-bold text-lg">{auditsThisMonth ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/8">
                <span className="text-cm-steel text-sm">Content (7 days)</span>
                <span className="text-white font-bold text-lg">{contentNext7 ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-cm-steel text-sm">Active Pipeline</span>
                <span className="text-cm-blue font-bold text-lg">{(pipelineLeadsKanban ?? []).length}</span>
              </div>
            </div>
            <Link
              href="/leads"
              className="mt-4 flex items-center gap-2 text-cm-blue-dim text-xs font-medium hover:text-white transition-colors"
            >
              Open pipeline <ArrowRight size={12} />
            </Link>
          </div>

          {/* Overdue alerts */}
          {(overduePayments ?? []).length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-cm-text">Overdue Payments</h3>
              </div>
              <div className="space-y-2">
                {overduePayments!.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <p className="text-xs text-cm-text truncate max-w-[130px]">{p.milestone_name}</p>
                    <span className="text-xs font-semibold text-red-500 flex-shrink-0 ml-2">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-cm-blue-light rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={15} className="text-cm-blue" />
                <h3 className="text-sm font-semibold text-cm-blue">Content Coming Up</h3>
              </div>
              <p className="text-3xl font-bold text-cm-text mt-1">{contentNext7 ?? 0}</p>
              <p className="text-xs text-cm-muted mt-0.5">items next 7 days</p>
              <Link href="/content" className="mt-3 flex items-center gap-1 text-xs text-cm-blue font-medium hover:underline">
                View calendar <ArrowRight size={10} />
              </Link>
            </div>
          )}

        </div>
      </div>

    </div>
  )
}

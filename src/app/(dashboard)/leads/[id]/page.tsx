import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '@/lib/constants'
import type { Lead, LeadStatus } from '@/types/database'
import LeadActions from '@/components/leads/LeadActions'
import AiInstructions from '@/components/leads/AiInstructions'

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ tab?: string }>

const TABS = [
  { key: 'overview',  label: 'Overview' },
  { key: 'audit',     label: 'Audit Report' },
  { key: 'qualify',   label: 'Qualification' },
  { key: 'call',      label: 'Call & Blueprint' },
  { key: 'activity',  label: 'Activity Log' },
]

export default async function LeadDetailPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params
  const { tab = 'overview' } = await searchParams
  const supabase = await createClient()

  const { data: leadData } = await supabase.from('leads').select('*').eq('id', id).single()
  if (!leadData) notFound()
  const lead = leadData as unknown as Lead

  const { data: activityLogs } = await supabase.from('activity_log').select('*')
    .eq('entity_id', id).eq('entity_type', 'lead').order('created_at', { ascending: false }).limit(50)

  const sc = LEAD_STATUS_COLORS[lead.status as LeadStatus]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/leads" className="text-cm-subtle hover:text-cm-muted text-sm transition-colors">Leads</Link>
            <span className="text-cm-border">/</span>
            <span className="text-cm-muted text-sm">{lead.name}</span>
          </div>
          <h1 className="text-xl font-bold text-cm-text">{lead.name}</h1>
          {lead.business_name && <p className="text-cm-muted text-sm mt-0.5">{lead.business_name}</p>}
        </div>
        <div className="flex items-center gap-3">
          {lead.deal_temperature && <DealTempBadge temp={lead.deal_temperature} />}
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
            {LEAD_STATUS_LABELS[lead.status as LeadStatus]}
          </span>
          {lead.archived && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-500">Archived</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0 border-b border-cm-border">
        {TABS.map(t => (
          <Link
            key={t.key}
            href={`/leads/${id}?tab=${t.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-cm-blue text-cm-blue' : 'border-transparent text-cm-muted hover:text-cm-text'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-4">
            <InfoCard title="Contact">
              <Field label="Email" value={lead.email} />
              <Field label="Phone" value={lead.phone} />
              <Field label="Instagram" value={lead.instagram_handle} />
            </InfoCard>
            <InfoCard title="Business">
              <Field label="Business Name" value={lead.business_name} />
              <Field label="Type" value={lead.business_type} />
              <Field label="Team Size" value={lead.team_size} />
              <Field label="Revenue" value={lead.revenue_range} />
            </InfoCard>
            <InfoCard title="Links">
              <Field label="Website" value={lead.website_url} link />
              <Field label="Instagram" value={lead.instagram_url} link />
              <Field label="Facebook" value={lead.facebook_url} link />
            </InfoCard>
          </div>
          <div className="space-y-4">
            <InfoCard title="Lead Details">
              <Field label="Source" value={lead.source} />
              <Field label="UTM Campaign" value={lead.utm_campaign} />
              <Field label="UTM Source" value={lead.utm_source} />
              <Field label="Created" value={new Date(lead.created_at).toLocaleString('en-IN')} />
              <Field label="Last Activity" value={new Date(lead.last_activity_at).toLocaleString('en-IN')} />
            </InfoCard>
            {lead.bottleneck_text && (
              <InfoCard title="Bottleneck">
                <p className="text-cm-text text-sm leading-relaxed">{lead.bottleneck_text}</p>
              </InfoCard>
            )}
            {lead.current_tools && (
              <InfoCard title="Current Tools">
                <p className="text-cm-text text-sm">{lead.current_tools}</p>
              </InfoCard>
            )}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-5">
          {!lead.audit_report && !lead.instagram_score && (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-cm-subtle">No audit data yet. The AI pipeline will populate this once the audit completes.</p>
            </div>
          )}

          {/* Summary */}
          {lead.audit_report && (lead.audit_report as { summary?: string }).summary && (
            <InfoCard title="AI Summary">
              <p className="text-sm text-cm-text leading-relaxed">
                {(lead.audit_report as { summary?: string }).summary}
              </p>
            </InfoCard>
          )}

          {/* Platform Scores */}
          {(lead.instagram_score !== null || lead.facebook_score !== null || lead.website_score !== null) && (
            <InfoCard title="Platform Scores">
              <div className="grid grid-cols-3 gap-6 py-2">
                {[
                  { label: 'Instagram', score: lead.instagram_score, emoji: '📸' },
                  { label: 'Facebook', score: lead.facebook_score, emoji: '📘' },
                  { label: 'Website', score: lead.website_score, emoji: '🌐' },
                ].filter(s => s.score !== null).map(s => {
                  const score = s.score as number
                  const color = score >= 7 ? 'text-emerald-600' : score >= 5 ? 'text-amber-500' : 'text-red-500'
                  return (
                    <div key={s.label} className="text-center">
                      <p className="text-2xl mb-1">{s.emoji}</p>
                      <p className={`text-4xl font-bold ${color}`}>{score}<span className="text-cm-subtle text-xl">/10</span></p>
                      <p className="text-xs text-cm-muted mt-1">{s.label}</p>
                    </div>
                  )
                })}
              </div>
            </InfoCard>
          )}

          {/* Growth Scorecard */}
          {lead.growth_scorecard && (
            <InfoCard title="5-Dimension Growth Scorecard">
              <div className="space-y-3">
                {[
                  { key: 'lead_capture', label: 'Lead Capture' },
                  { key: 'followup_speed', label: 'Follow-up Speed' },
                  { key: 'content_consistency', label: 'Content Consistency' },
                  { key: 'sales_process', label: 'Sales Process' },
                  { key: 'automation_maturity', label: 'Automation Maturity' },
                ].map(({ key, label }) => {
                  const v = (lead.growth_scorecard as unknown as Record<string, number>)[key] ?? 0
                  const color = v >= 7 ? 'bg-emerald-500' : v >= 5 ? 'bg-amber-400' : 'bg-red-400'
                  return (
                    <div key={key} className="flex items-center gap-4">
                      <span className="text-sm text-cm-muted w-44 flex-shrink-0">{label}</span>
                      <div className="flex-1 h-2 bg-cm-bg rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${v * 10}%` }} />
                      </div>
                      <span className="text-sm text-cm-text font-semibold w-10 text-right">{v}/10</span>
                    </div>
                  )
                })}
              </div>
            </InfoCard>
          )}

          {/* Growth Gaps */}
          {(lead.gaps ?? []).length > 0 && (
            <InfoCard title="Top Growth Gaps">
              <div className="space-y-4">
                {(lead.gaps as Array<{ gap: string; severity: string; revenue_impact: string }>).map((g, i) => (
                  <div key={i} className={`border-l-4 pl-4 py-1 rounded-r-lg ${
                    g.severity === 'critical' ? 'border-red-500 bg-red-50' :
                    g.severity === 'major' ? 'border-amber-500 bg-amber-50' :
                    'border-yellow-400 bg-yellow-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        g.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        g.severity === 'major' ? 'bg-amber-100 text-amber-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{g.severity}</span>
                      <span className="text-xs text-cm-muted">{g.revenue_impact}</span>
                    </div>
                    <p className="text-sm text-cm-text leading-relaxed">{g.gap}</p>
                  </div>
                ))}
              </div>
            </InfoCard>
          )}

          {/* Opportunities */}
          {(lead.opportunities ?? []).length > 0 && (
            <InfoCard title="Quick Win Opportunities">
              <div className="space-y-4">
                {(lead.opportunities as Array<{ opportunity: string; impact: string }>).map((o, i) => (
                  <div key={i} className="border-l-4 border-cm-blue pl-4 py-1 rounded-r-lg bg-blue-50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        o.impact === 'high' ? 'bg-emerald-100 text-emerald-700' :
                        o.impact === 'medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{o.impact} impact</span>
                    </div>
                    <p className="text-sm text-cm-text leading-relaxed">{o.opportunity}</p>
                  </div>
                ))}
              </div>
            </InfoCard>
          )}

          {/* Call Talking Points */}
          {(lead.call_talking_points ?? []).length > 0 && (
            <InfoCard title="AI Sales Talking Points">
              <div className="space-y-3">
                {(lead.call_talking_points as Array<{ point: string }>).map((tp, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-cm-bg rounded-xl">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cm-blue text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <p className="text-sm text-cm-text leading-relaxed">{tp.point}</p>
                  </div>
                ))}
              </div>
            </InfoCard>
          )}
        </div>
      )}

      {tab === 'qualify' && (
        <div className="space-y-5">
          <LeadActions lead={lead} />
          <AiInstructions lead={lead} />
          {lead.qualification_notes && (
            <InfoCard title="Qualification Notes">
              <p className="text-sm text-cm-text leading-relaxed">{lead.qualification_notes}</p>
            </InfoCard>
          )}
        </div>
      )}

      {tab === 'call' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <InfoCard title="Call Details">
              <Field label="Call Booked" value={lead.call_booked ? 'Yes' : 'No'} />
              <Field label="Date & Time" value={lead.call_datetime ? new Date(lead.call_datetime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : undefined} />
              <Field label="Meet Link" value={lead.call_meet_link} link />
            </InfoCard>
            <InfoCard title="Blueprint">
              <Field label="Sent" value={lead.blueprint_sent ? 'Yes' : 'No'} />
              <Field label="Sent At" value={lead.blueprint_sent_at ? new Date(lead.blueprint_sent_at).toLocaleString('en-IN') : undefined} />
              <Field label="Blueprint URL" value={lead.blueprint_url} link />
            </InfoCard>
          </div>
          {(lead.call_talking_points ?? []).length > 0 && (
            <InfoCard title="Talking Points">
              <ul className="space-y-2">
                {(lead.call_talking_points as Array<{ point: string }>).map((tp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-cm-text">
                    <span className="text-cm-subtle flex-shrink-0 mt-0.5">•</span>{tp.point}
                  </li>
                ))}
              </ul>
            </InfoCard>
          )}
          {lead.call_notes && (
            <InfoCard title="Call Notes">
              <p className="text-sm text-cm-text leading-relaxed whitespace-pre-wrap">{lead.call_notes}</p>
            </InfoCard>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className="space-y-2">
          {(activityLogs ?? []).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-cm-subtle">No activity yet</p>
            </div>
          ) : (
            (activityLogs ?? []).map(log => (
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
            ))
          )}
        </div>
      )}
    </div>
  )
}

function DealTempBadge({ temp }: { temp: 'hot' | 'warm' | 'cold' }) {
  const map = {
    hot:  { cls: 'bg-red-100 text-red-700',     label: '🔥 Hot' },
    warm: { cls: 'bg-amber-100 text-amber-700', label: '🌤️ Warm' },
    cold: { cls: 'bg-sky-100 text-sky-700',     label: '❄️ Cold' },
  }[temp]
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${map.cls}`}>
      {map.label}
    </span>
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

function Field({ label, value, link }: { label: string; value?: string | null; link?: boolean }) {
  if (!value) return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-cm-muted">{label}</span>
      <span className="text-xs text-cm-subtle">—</span>
    </div>
  )
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-cm-muted">{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-cm-blue hover:underline truncate max-w-[200px]">{value}</a>
      ) : (
        <span className="text-xs text-cm-text font-medium truncate max-w-[200px]">{value}</span>
      )}
    </div>
  )
}

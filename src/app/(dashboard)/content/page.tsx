import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, getDay, addMonths, subMonths } from 'date-fns'
import { PILLAR_COLORS, PILLAR_LABELS } from '@/lib/constants'
import type { ContentPillar, ContentStatus } from '@/types/database'
import NewContentForm from '@/components/content/NewContentForm'

type SearchParams = Promise<{ month?: string; pillar?: string; status?: string; view?: string }>

const STATUS_COLORS: Record<ContentStatus, { bg: string; text: string }> = {
  idea:       { bg: 'bg-gray-100',         text: 'text-gray-500' },
  scripting:  { bg: 'bg-cm-blue-light',    text: 'text-cm-blue' },
  recording:  { bg: 'bg-purple-100',       text: 'text-purple-600' },
  editing:    { bg: 'bg-amber-100',        text: 'text-amber-700' },
  scheduled:  { bg: 'bg-cyan-100',         text: 'text-cyan-700' },
  published:  { bg: 'bg-emerald-100',      text: 'text-emerald-700' },
  archived:   { bg: 'bg-gray-50',          text: 'text-gray-400' },
}

export default async function ContentPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const supabase = await createClient()
  const view = sp.view ?? 'calendar'

  const today = new Date()
  const monthParam = sp.month
  const currentMonth = monthParam ? new Date(monthParam + '-01') : new Date(today.getFullYear(), today.getMonth(), 1)
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const prevMonth = format(subMonths(currentMonth, 1), 'yyyy-MM')
  const nextMonth = format(addMonths(currentMonth, 1), 'yyyy-MM')

  let scheduledQuery = supabase.from('content_items').select('*').neq('status', 'archived')
    .gte('scheduled_date', format(monthStart, 'yyyy-MM-dd'))
    .lte('scheduled_date', format(monthEnd, 'yyyy-MM-dd'))

  let unscheduledQuery = supabase.from('content_items').select('*').neq('status', 'archived').is('scheduled_date', null)

  if (sp.pillar) { scheduledQuery = scheduledQuery.eq('pillar', sp.pillar as ContentPillar); unscheduledQuery = unscheduledQuery.eq('pillar', sp.pillar as ContentPillar) }
  if (sp.status) { scheduledQuery = scheduledQuery.eq('status', sp.status as ContentStatus); unscheduledQuery = unscheduledQuery.eq('status', sp.status as ContentStatus) }

  const [{ data: scheduledItems }, { data: unscheduledItems }] = await Promise.all([
    scheduledQuery.order('scheduled_date').order('created_at').limit(200),
    unscheduledQuery.order('created_at', { ascending: false }).limit(50),
  ])

  const items = view === 'list' ? [...(scheduledItems ?? []), ...(unscheduledItems ?? [])] : (scheduledItems ?? [])
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const unscheduled = unscheduledItems ?? []

  const itemsByDate = (items ?? []).reduce<Record<string, typeof items>>((acc, item) => {
    if (item.scheduled_date) {
      const k = item.scheduled_date.split('T')[0]
      if (!acc[k]) acc[k] = []
      acc[k]!.push(item)
    }
    return acc
  }, {})

  const pillars = Object.keys(PILLAR_LABELS) as ContentPillar[]

  function buildUrl(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { month: sp.month, pillar: sp.pillar, status: sp.status, view: sp.view, ...updates }
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    return `/content?${params.toString()}`
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-cm-text">Content</h1>
          <p className="text-sm text-cm-muted mt-0.5">{format(currentMonth, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={buildUrl({ view: 'calendar' })} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'calendar' ? 'bg-cm-blue text-white' : 'bg-white text-cm-muted hover:text-cm-text shadow-sm border border-cm-border'}`}>Calendar</Link>
          <Link href={buildUrl({ view: 'list' })} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'list' ? 'bg-cm-blue text-white' : 'bg-white text-cm-muted hover:text-cm-text shadow-sm border border-cm-border'}`}>List</Link>
          <NewContentForm />
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-4">
        <Link href={buildUrl({ month: prevMonth })} className="text-cm-muted hover:text-cm-text text-sm font-medium">← Prev</Link>
        <span className="text-cm-text font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
        <Link href={buildUrl({ month: nextMonth })} className="text-cm-muted hover:text-cm-text text-sm font-medium">Next →</Link>
      </div>

      {/* Pillar filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link href={buildUrl({ pillar: undefined })} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!sp.pillar ? 'bg-cm-blue text-white' : 'bg-white text-cm-muted hover:text-cm-text shadow-sm border border-cm-border'}`}>All Pillars</Link>
        {pillars.map(p => {
          const c = PILLAR_COLORS[p]
          const active = sp.pillar === p
          return (
            <Link key={p} href={buildUrl({ pillar: active ? undefined : p })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${active ? `${c.bg} ${c.text} ${c.border}` : 'bg-white border-cm-border text-cm-muted hover:text-cm-text shadow-sm'}`}>
              {PILLAR_LABELS[p]}
            </Link>
          )
        })}
      </div>

      {/* Calendar view */}
      {view === 'calendar' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[700px] border-b border-cm-border bg-cm-bg">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-3 text-center text-xs font-semibold text-cm-muted uppercase tracking-wide">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-w-[700px]">
            {Array.from({ length: getDay(monthStart) }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-gray-50 bg-cm-bg/40" />
            ))}
            {days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayItems = itemsByDate[dateKey] ?? []
              const isToday = isSameDay(day, today)
              return (
                <div key={dateKey} className={`min-h-[100px] border-b border-r border-gray-50 p-2 ${isToday ? 'bg-cm-blue-light' : ''}`}>
                  <p className={`text-xs font-semibold mb-1.5 ${isToday ? 'text-cm-blue' : 'text-cm-subtle'}`}>
                    {format(day, 'd')}
                  </p>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map(item => {
                      const pc = PILLAR_COLORS[item.pillar as ContentPillar]
                      return (
                        <Link key={item.id} href={`/content/${item.id}`}
                          className={`block rounded px-1.5 py-1 text-xs truncate border ${pc.bg} ${pc.text} ${pc.border} hover:opacity-80 transition-opacity`}>
                          {item.title}
                        </Link>
                      )
                    })}
                    {dayItems.length > 3 && <p className="text-xs text-cm-subtle">+{dayItems.length - 3}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-cm-border bg-cm-bg">
                <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Title</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Pillar</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Platform</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-cm-muted uppercase tracking-wide">Scheduled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(items ?? []).length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-cm-subtle">No content this month</td></tr>
              ) : (
                (items ?? []).map(item => {
                  const pc = PILLAR_COLORS[item.pillar as ContentPillar]
                  const sc = STATUS_COLORS[item.status as ContentStatus]
                  return (
                    <tr key={item.id} className="hover:bg-cm-bg">
                      <td className="px-5 py-3.5">
                        <Link href={`/content/${item.id}`} className="text-cm-text hover:text-cm-blue font-semibold transition-colors">{item.title}</Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${pc.bg} ${pc.text} ${pc.border}`}>
                          {PILLAR_LABELS[item.pillar as ContentPillar]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-cm-muted capitalize">{item.platform}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-cm-subtle text-xs">
                        {item.scheduled_date ? format(new Date(item.scheduled_date), 'd MMM') : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Unscheduled ideas */}
      {unscheduled.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-cm-muted mb-3">Unscheduled Ideas</h2>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map(item => {
              const pc = PILLAR_COLORS[item.pillar as ContentPillar]
              return (
                <Link key={item.id} href={`/content/${item.id}`}
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border ${pc.bg} ${pc.text} ${pc.border} hover:opacity-80 transition-opacity`}>
                  {item.title}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

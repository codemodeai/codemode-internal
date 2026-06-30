import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PILLAR_COLORS, PILLAR_LABELS } from '@/lib/constants'
import type { ContentItem, ContentPillar, ContentStatus } from '@/types/database'
import ContentEditor from '@/components/content/ContentEditor'

type Params = Promise<{ id: string }>

const STATUS_ORDER: ContentStatus[] = ['idea', 'scripting', 'recording', 'editing', 'scheduled', 'published']

export default async function ContentItemPage({ params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: itemData } = await supabase.from('content_items').select('*').eq('id', id).single()
  if (!itemData) notFound()
  const item = itemData as unknown as ContentItem

  const pc = PILLAR_COLORS[item.pillar as ContentPillar]
  const currentStatusIndex = STATUS_ORDER.indexOf(item.status as ContentStatus)

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link href="/content" className="text-cm-subtle hover:text-cm-muted text-sm transition-colors">Content</Link>
        <span className="text-cm-border">/</span>
        <span className="text-cm-muted text-sm truncate">{item.title}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-cm-text">{item.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${pc.bg} ${pc.text} ${pc.border}`}>
              {PILLAR_LABELS[item.pillar as ContentPillar]}
            </span>
            <span className="text-xs text-cm-subtle capitalize">{item.platform}</span>
            {item.format && <span className="text-xs text-cm-subtle capitalize">{item.format}</span>}
            {item.scheduled_date && (
              <span className="text-xs text-cm-subtle">
                {new Date(item.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status pipeline */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STATUS_ORDER.map((s, i) => {
          const isPast = i < currentStatusIndex
          const isCurrent = i === currentStatusIndex
          return (
            <div key={s} className="flex items-center gap-2 flex-shrink-0">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                isCurrent ? 'bg-cm-blue text-white shadow-sm' :
                isPast ? 'bg-emerald-50 text-emerald-600 line-through' :
                'bg-white border border-cm-border text-cm-subtle shadow-sm'
              }`}>{s}</div>
              {i < STATUS_ORDER.length - 1 && <span className="text-cm-border">→</span>}
            </div>
          )
        })}
      </div>

      <ContentEditor item={item} />

      {item.status === 'published' && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-xs font-semibold text-cm-subtle uppercase tracking-wide mb-4">Performance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Views', value: item.views },
              { label: 'Likes', value: item.likes },
              { label: 'Comments', value: item.comments },
              { label: 'Saves', value: item.saves },
              { label: 'DM Triggers', value: item.dm_triggers },
            ].map(stat => (
              <div key={stat.label} className="text-center bg-cm-bg rounded-xl p-3">
                <p className="text-2xl font-bold text-cm-text">{stat.value.toLocaleString()}</p>
                <p className="text-xs text-cm-muted mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

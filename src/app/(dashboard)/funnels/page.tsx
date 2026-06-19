import { createClient } from '@/lib/supabase/server'
import type { Funnel } from '@/types/database'
import Link from 'next/link'
import NewFunnelForm from '@/components/funnels/NewFunnelForm'
import { Webhook, ChevronRight } from 'lucide-react'

export default async function FunnelsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('funnels').select('*').order('created_at', { ascending: false })
  const funnels = (data ?? []) as unknown as Funnel[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-cm-text">Funnels</h1>
          <p className="text-cm-muted text-sm mt-0.5">Create funnels and get unique webhook URLs to integrate with your systems</p>
        </div>
        <NewFunnelForm />
      </div>

      {funnels.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-cm-blue/10 flex items-center justify-center mx-auto mb-4">
            <Webhook size={22} className="text-cm-blue" />
          </div>
          <h3 className="text-cm-text font-semibold mb-1">No funnels yet</h3>
          <p className="text-cm-muted text-sm mb-4">Create your first funnel to get a webhook URL for lead capture</p>
          <NewFunnelForm />
        </div>
      ) : (
        <div className="space-y-3">
          {funnels.map(funnel => (
            <Link key={funnel.id} href={`/funnels/${funnel.id}`}
              className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${funnel.active ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  <Webhook size={16} className={funnel.active ? 'text-emerald-600' : 'text-gray-400'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-cm-text">{funnel.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${funnel.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {funnel.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {funnel.description && <p className="text-xs text-cm-muted mt-0.5">{funnel.description}</p>}
                  <p className="text-xs text-cm-subtle mt-0.5">Source: <span className="font-mono">{funnel.source}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xs text-cm-subtle">
                  {new Date(funnel.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <ChevronRight size={16} className="text-cm-border group-hover:text-cm-muted transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

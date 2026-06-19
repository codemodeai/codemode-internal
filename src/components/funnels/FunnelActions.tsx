'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateFunnel, deleteFunnel, regenerateWebhookKey } from '@/lib/actions/funnels'
import type { Funnel } from '@/types/database'
import { Copy, Check, RefreshCw, Trash2, Save } from 'lucide-react'

export function CopyWebhookUrl({ webhookUrl }: { webhookUrl: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={handleCopy}
      className="flex items-center gap-2 px-3 py-2 bg-cm-blue hover:bg-cm-blue-dim text-white text-xs font-medium rounded-xl transition-colors flex-shrink-0">
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied!' : 'Copy URL'}
    </button>
  )
}

export function ToggleActive({ funnel }: { funnel: Funnel }) {
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(() => updateFunnel(funnel.id, { active: !funnel.active }))
  }

  return (
    <button onClick={toggle} disabled={isPending}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
        funnel.active
          ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
      }`}>
      {funnel.active ? 'Deactivate' : 'Activate'}
    </button>
  )
}

export function RegenerateKey({ funnelId }: { funnelId: string }) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)

  function handleClick() {
    if (!confirm) { setConfirm(true); return }
    startTransition(async () => {
      await regenerateWebhookKey(funnelId)
      setConfirm(false)
    })
  }

  return (
    <button onClick={handleClick} disabled={isPending}
      className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium rounded-xl border border-amber-200 transition-colors">
      <RefreshCw size={13} className={isPending ? 'animate-spin' : ''} />
      {confirm ? 'Confirm regenerate?' : 'Regenerate Key'}
    </button>
  )
}

export function DeleteFunnel({ funnelId }: { funnelId: string }) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)
  const router = useRouter()

  function handleClick() {
    if (!confirm) { setConfirm(true); return }
    startTransition(async () => {
      await deleteFunnel(funnelId)
      router.push('/funnels')
    })
  }

  return (
    <button onClick={handleClick} disabled={isPending}
      className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-xl border border-red-200 transition-colors">
      <Trash2 size={13} />
      {confirm ? 'Are you sure?' : 'Delete Funnel'}
    </button>
  )
}

export function FieldMappingEditor({ funnel }: { funnel: Funnel }) {
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(JSON.stringify(funnel.field_mappings ?? {}, null, 2))
  const [msg, setMsg] = useState('')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    try {
      const parsed = JSON.parse(value)
      startTransition(async () => {
        await updateFunnel(funnel.id, { field_mappings: parsed })
        setSaved(true)
        setMsg('')
        setTimeout(() => setSaved(false), 2000)
      })
    } catch {
      setMsg('Invalid JSON')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-cm-muted leading-relaxed">
        Map incoming webhook field names to lead fields. Format: <span className="font-mono bg-cm-bg px-1 rounded">{'{"their_field": "lead_field"}'}</span>
        <br />Valid lead fields: name, email, phone, instagram_handle, business_name, business_type, team_size, revenue_range, instagram_url, facebook_url, website_url, current_tools, bottleneck_text, utm_campaign, utm_source
      </p>
      {msg && <p className="text-xs text-red-500">{msg}</p>}
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        rows={8}
        spellCheck={false}
        className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2.5 text-sm font-mono text-cm-text focus:outline-none focus:ring-2 focus:ring-cm-blue resize-none"
      />
      <button onClick={handleSave} disabled={isPending}
        className="flex items-center gap-2 bg-cm-blue hover:bg-cm-blue-dim disabled:opacity-40 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors">
        {saved ? <Check size={14} /> : <Save size={14} />}
        {saved ? 'Saved!' : 'Save Mappings'}
      </button>
    </div>
  )
}

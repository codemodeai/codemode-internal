'use client'

import { useState, useTransition } from 'react'
import {
  qualifyLead, disqualifyLead, sendAuditEmail,
  requestMoreInfo, convertToClient, archiveLead,
  markBlueprintSent, markCallBooked,
} from '@/lib/actions/leads'
import type { Lead, ProjectType } from '@/types/database'

const PROJECT_TYPES: ProjectType[] = [
  'website', 'crm_automation', 'ai_workflow', 'full_growth_stack', 'retainer', 'erp',
]

export default function LeadActions({ lead }: { lead: Lead }) {
  const [isPending, startTransition] = useTransition()
  const [qualifyNotes, setQualifyNotes] = useState(lead.qualification_notes ?? '')
  const [blueprintUrl, setBlueprintUrl] = useState(lead.blueprint_url ?? '')
  const [projectType, setProjectType] = useState<ProjectType>('website')
  const [contractValue, setContractValue] = useState('')
  const [callDatetime, setCallDatetime] = useState(lead.call_datetime ? new Date(lead.call_datetime).toISOString().slice(0, 16) : '')
  const [callMeetLink, setCallMeetLink] = useState(lead.call_meet_link ?? '')
  const [msg, setMsg] = useState('')

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      try {
        await fn()
        setMsg('Done')
        setTimeout(() => setMsg(''), 2000)
      } catch (e) {
        setMsg((e as Error).message)
      }
    })
  }

  const isAuditReady = lead.status === 'audit_ready'
  const isQualified = lead.status === 'qualified' || lead.qualified
  const canLogCall = !['new', 'auditing', 'closed_won', 'closed_lost'].includes(lead.status)

  return (
    <div className="space-y-4">
      {msg && (
        <div className="px-4 py-2.5 rounded-xl bg-cm-blue-light border border-cm-border text-sm text-cm-blue font-medium">
          {msg}
        </div>
      )}

      {isAuditReady && (
        <div className="bg-white rounded-2xl shadow-sm p-5 border-l-4 border-amber-400 space-y-4">
          <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Audit Ready Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => run(() => sendAuditEmail(lead.id))}
              disabled={isPending || !lead.email}
              className="bg-cm-blue hover:bg-cm-blue-dim disabled:opacity-40 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
            >
              Send Audit Email
            </button>
            <button
              onClick={() => run(() => requestMoreInfo(lead.id))}
              disabled={isPending || !lead.email}
              className="bg-cm-bg hover:bg-cm-border disabled:opacity-40 text-cm-text text-sm font-medium rounded-xl px-4 py-2.5 transition-colors border border-cm-border"
            >
              Need More Info
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-cm-muted font-medium">Qualification notes</label>
            <textarea
              value={qualifyNotes}
              onChange={e => setQualifyNotes(e.target.value)}
              rows={3}
              className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue resize-none"
              placeholder="Why is this lead a good fit?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => run(() => qualifyLead(lead.id, qualifyNotes))}
              disabled={isPending}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
            >
              Mark Qualified
            </button>
            <button
              onClick={() => run(() => disqualifyLead(lead.id, qualifyNotes))}
              disabled={isPending}
              className="bg-red-50 hover:bg-red-100 disabled:opacity-40 text-red-600 text-sm font-medium rounded-xl px-4 py-2.5 transition-colors border border-red-200"
            >
              Not a Fit
            </button>
          </div>
        </div>
      )}

      {canLogCall && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h3 className="text-xs font-semibold text-cm-muted uppercase tracking-wide">
            {lead.call_booked ? 'Call Booking' : 'Log Call Booking'}
          </h3>
          {lead.call_booked && (
            <p className="text-xs text-emerald-600 font-medium">✓ Call is marked as booked</p>
          )}
          <div className="space-y-2">
            <label className="text-xs text-cm-muted font-medium">Date & Time (IST)</label>
            <input
              type="datetime-local"
              value={callDatetime}
              onChange={e => setCallDatetime(e.target.value)}
              className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2 text-sm text-cm-text focus:outline-none focus:ring-2 focus:ring-cm-blue"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-cm-muted font-medium">Meet / Zoom Link</label>
            <input
              type="url"
              value={callMeetLink}
              onChange={e => setCallMeetLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue"
            />
          </div>
          <button
            onClick={() => run(() => markCallBooked(lead.id, callDatetime, callMeetLink))}
            disabled={isPending}
            className="w-full bg-cm-blue hover:bg-cm-blue-dim disabled:opacity-40 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
          >
            {lead.call_booked ? 'Update Call Details' : 'Mark Call Booked'}
          </button>
        </div>
      )}

      {(isQualified || lead.status === 'call_done') && !lead.blueprint_sent && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h3 className="text-xs font-semibold text-cm-muted uppercase tracking-wide">Blueprint</h3>
          <input
            type="url"
            value={blueprintUrl}
            onChange={e => setBlueprintUrl(e.target.value)}
            placeholder="Blueprint URL (optional)"
            className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue"
          />
          <button
            onClick={() => run(() => markBlueprintSent(lead.id, blueprintUrl))}
            disabled={isPending}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
          >
            Mark Blueprint Sent
          </button>
        </div>
      )}

      {lead.status === 'blueprint_sent' && !lead.converted_to_client && (
        <div className="bg-white rounded-2xl shadow-sm p-5 border-l-4 border-emerald-400 space-y-3">
          <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Convert to Client</h3>
          <select
            value={projectType}
            onChange={e => setProjectType(e.target.value as ProjectType)}
            className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2 text-sm text-cm-text focus:outline-none focus:ring-2 focus:ring-cm-blue"
          >
            {PROJECT_TYPES.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input
            type="number"
            value={contractValue}
            onChange={e => setContractValue(e.target.value)}
            placeholder="Contract value (₹)"
            className="w-full bg-cm-bg border border-cm-border rounded-xl px-3 py-2 text-sm text-cm-text placeholder-cm-subtle focus:outline-none focus:ring-2 focus:ring-cm-blue"
          />
          <button
            onClick={() => run(() => convertToClient(lead.id, projectType, contractValue ? Number(contractValue) : null))}
            disabled={isPending}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
          >
            Convert to Client
          </button>
        </div>
      )}

      {!lead.archived && (
        <div className="pt-1">
          <button
            onClick={() => run(() => archiveLead(lead.id))}
            disabled={isPending}
            className="text-sm text-cm-subtle hover:text-cm-muted disabled:opacity-40 transition-colors"
          >
            Archive lead
          </button>
        </div>
      )}
    </div>
  )
}

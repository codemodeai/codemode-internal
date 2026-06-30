'use client'

import { useState, useTransition } from 'react'
import { updateContentItem, updateContentStatus, updateContentPerformance } from '@/lib/actions/content'
import type { ContentItem, ContentStatus } from '@/types/database'

const NEXT_STATUS: Record<ContentStatus, ContentStatus | null> = {
  idea: 'scripting', scripting: 'recording', recording: 'editing',
  editing: 'scheduled', scheduled: 'published', published: null, archived: null,
}
const STATUS_BTN_LABELS: Partial<Record<ContentStatus, string>> = {
  idea: 'Start scripting', scripting: 'Move to recording', recording: 'Move to editing',
  editing: 'Mark scheduled', scheduled: 'Mark published',
}

export default function ContentEditor({ item }: { item: ContentItem }) {
  const [isPending, startTransition] = useTransition()
  const [hook, setHook] = useState(item.hook ?? '')
  const [script, setScript] = useState(item.script ?? '')
  const [cta, setCta] = useState(item.cta ?? '')
  const [hashtags, setHashtags] = useState(item.hashtags ?? '')
  const [scheduledDate, setScheduledDate] = useState(item.scheduled_date ?? '')
  const [saved, setSaved] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  // Performance
  const [views, setViews] = useState(String(item.views))
  const [likes, setLikes] = useState(String(item.likes))
  const [comments, setComments] = useState(String(item.comments))
  const [saves, setSaves] = useState(String(item.saves))
  const [dmTriggers, setDmTriggers] = useState(String(item.dm_triggers))

  function save() {
    startTransition(async () => {
      await updateContentItem(item.id, {
        hook: hook || undefined,
        script: script || undefined,
        cta: cta || undefined,
        hashtags: hashtags || undefined,
        scheduled_date: scheduledDate || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  function advanceStatus() {
    const next = NEXT_STATUS[item.status as ContentStatus]
    if (!next) return
    startTransition(() => updateContentStatus(item.id, next))
  }

  function savePerformance() {
    startTransition(() => updateContentPerformance(item.id, {
      views: Number(views) || 0,
      likes: Number(likes) || 0,
      comments: Number(comments) || 0,
      saves: Number(saves) || 0,
      dm_triggers: Number(dmTriggers) || 0,
    }))
  }

  async function runAiAssist() {
    setAiLoading(true)
    setAiError('')
    try {
      const res = await fetch('/api/ai/content-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title, pillar: item.pillar, platform: item.platform, format: item.format }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      if (data.hook) setHook(data.hook)
      if (data.script) setScript(data.script)
      if (data.cta) setCta(data.cta)
      if (data.hashtags) setHashtags(data.hashtags)
    } catch (e) {
      setAiError((e as Error).message)
    } finally {
      setAiLoading(false)
    }
  }

  const nextStatus = NEXT_STATUS[item.status as ContentStatus]

  return (
    <div className="space-y-5">
      {/* Actions row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {nextStatus && (
            <button
              onClick={advanceStatus}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {STATUS_BTN_LABELS[item.status as ContentStatus] ?? `→ ${nextStatus}`}
            </button>
          )}
          <button
            onClick={runAiAssist}
            disabled={aiLoading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {aiLoading ? 'Generating…' : '✨ AI Assist'}
          </button>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-emerald-400">Saved</span>}
          <button
            onClick={save}
            disabled={isPending}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {aiError && <p className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-lg px-3 py-2">{aiError}</p>}

      {/* Scheduled date */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Scheduled Date</label>
        <input
          type="date"
          value={scheduledDate}
          onChange={e => setScheduledDate(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Hook */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Hook</label>
        <textarea
          value={hook}
          onChange={e => setHook(e.target.value)}
          rows={2}
          placeholder="The opening hook — what stops the scroll?"
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Script */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Script / Body</label>
        <textarea
          value={script}
          onChange={e => setScript(e.target.value)}
          rows={8}
          placeholder="Full script or talking points…"
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono leading-relaxed"
        />
      </div>

      {/* CTA */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">CTA</label>
        <input
          value={cta}
          onChange={e => setCta(e.target.value)}
          placeholder="Call to action…"
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Hashtags */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Hashtags</label>
        <input
          value={hashtags}
          onChange={e => setHashtags(e.target.value)}
          placeholder="#growthhacking #automation …"
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Performance section — only for published */}
      {item.status === 'published' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Update Performance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Views', state: views, set: setViews },
              { label: 'Likes', state: likes, set: setLikes },
              { label: 'Comments', state: comments, set: setComments },
              { label: 'Saves', state: saves, set: setSaves },
              { label: 'DM Triggers', state: dmTriggers, set: setDmTriggers },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                <input
                  type="number"
                  value={f.state}
                  onChange={e => f.set(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          <button
            onClick={savePerformance}
            disabled={isPending}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            Save Performance
          </button>
        </div>
      )}
    </div>
  )
}

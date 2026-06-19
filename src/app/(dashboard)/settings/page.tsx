import { createClient } from '@/lib/supabase/server'
import MonthlyPlanGenerator from '@/components/content/MonthlyPlanGenerator'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-cm-text">Settings</h1>
        <p className="text-sm text-cm-muted mt-0.5">System configuration and utilities</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-cm-text mb-4">Account</h2>
        <div className="space-y-1 divide-y divide-gray-50">
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-cm-muted">Email</span>
            <span className="text-sm text-cm-text font-medium">{user?.email ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-cm-muted">User ID</span>
            <span className="text-xs text-cm-subtle font-mono">{user?.id ?? '—'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-cm-text mb-1">Webhook Endpoints</h2>
        <p className="text-xs text-cm-muted mb-4">All require <code className="bg-cm-bg px-1.5 py-0.5 rounded text-cm-blue font-mono">X-Hook-Secret</code> header.</p>
        <div className="space-y-0 divide-y divide-gray-50">
          {[
            { id: 'H1', name: 'GAO Audit Form (Tally)', path: '/api/hooks/audit-form' },
            { id: 'H2', name: 'Audit Complete (n8n)', path: '/api/hooks/audit-complete' },
            { id: 'H3', name: 'Call Booked (Calendly)', path: '/api/hooks/call-booked' },
            { id: 'H4', name: 'Website Booking', path: '/api/hooks/website-booking' },
            { id: 'H5', name: 'FLOX Instagram Lead', path: '/api/hooks/flox-lead' },
            { id: 'H6', name: 'Client Signed', path: '/api/hooks/client-signed' },
          ].map(w => (
            <div key={w.id} className="flex items-center justify-between py-3">
              <div>
                <span className="text-xs font-mono text-cm-blue font-semibold mr-2">{w.id}</span>
                <span className="text-sm text-cm-text">{w.name}</span>
              </div>
              <code className="text-xs text-cm-muted font-mono bg-cm-bg px-2 py-0.5 rounded">{w.path}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-cm-text mb-1">AI Monthly Plan Generator</h2>
        <p className="text-xs text-cm-muted mb-4">Generate a full month of content ideas using Claude Haiku.</p>
        <MonthlyPlanGenerator />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-cm-text mb-4">Environment</h2>
        <div className="space-y-0 divide-y divide-gray-50">
          {[
            { label: 'Supabase URL', key: 'NEXT_PUBLIC_SUPABASE_URL' },
            { label: 'Resend API Key', key: 'RESEND_API_KEY' },
            { label: 'Slack Webhook', key: 'SLACK_WEBHOOK_URL' },
            { label: 'Anthropic Key', key: 'ANTHROPIC_API_KEY' },
            { label: 'Hook Secret', key: 'HOOK_SECRET' },
          ].map(env => {
            const set = !!(process.env[env.key])
            return (
              <div key={env.key} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-cm-muted">{env.label}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${set ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {set ? '✓ Set' : '✗ Missing'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

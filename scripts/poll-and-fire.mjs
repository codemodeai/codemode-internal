// One-off helper: poll until cm_gao_meeting_reminder is APPROVED, then reset the
// test lead's call to ~25 min out and trigger the meeting-reminders cron so the
// reminder actually delivers. Exits when fired (or after the max duration).
//
// Run:  WHATSAPP_ACCESS_TOKEN="EAAB..." node scripts/poll-and-fire.mjs
import fs from 'node:fs'

const clean = (s) => (s ?? '').replace(/^﻿/, '').trim()
const TOKEN = clean(process.env.WHATSAPP_ACCESS_TOKEN)
const WABA = clean(process.env.WABA_ID) || '1767668984219452'
const TEMPLATE = 'cm_gao_meeting_reminder'
const LEAD_ID = 'a26187bb-171b-4e9d-b843-f977eeb28b89'
const CRON_URL = 'https://codemode-internal-taupe.vercel.app/api/cron/meeting-reminders'
const INTERVAL_MS = 180_000
const MAX_MS = 2 * 60 * 60_000

// Read Supabase creds from .env.local
const envTxt = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const pick = (k) => clean((envTxt.split(/\r?\n/).find((l) => l.startsWith(k + '=')) ?? '').slice(k.length + 1).replace(/^"|"$/g, ''))
const SUPA_URL = pick('NEXT_PUBLIC_SUPABASE_URL') || 'https://wqvbyspcoepeffibvktp.supabase.co'
const SERVICE_KEY = pick('SUPABASE_SERVICE_ROLE_KEY')

if (!TOKEN) { console.error('Missing WHATSAPP_ACCESS_TOKEN'); process.exit(1) }
if (!SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1) }

const log = (...a) => console.log(new Date().toISOString(), ...a)

async function status() {
  const r = await fetch(`https://graph.facebook.com/v21.0/${WABA}/message_templates?fields=name,status&limit=100`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  const d = await r.json()
  if (d.error) throw new Error(JSON.stringify(d.error))
  return (d.data ?? []).find((t) => t.name === TEMPLATE)?.status ?? 'NOT_FOUND'
}

async function resetLead() {
  const callIso = new Date(Date.now() + 25 * 60_000).toISOString()
  const r = await fetch(`${SUPA_URL}/rest/v1/leads?id=eq.${LEAD_ID}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ call_datetime: callIso, reminder_30_sent_at: null, reminder_start_sent_at: null }),
  })
  if (!r.ok) throw new Error(`lead reset failed: ${r.status} ${await r.text()}`)
  return callIso
}

const start = Date.now()
log(`Polling ${TEMPLATE} approval every ${INTERVAL_MS / 1000}s (max ${MAX_MS / 60000}m)...`)
while (Date.now() - start < MAX_MS) {
  let st
  try { st = await status() } catch (e) { log('status check error:', e.message); st = 'ERR' }
  log(`status = ${st}`)
  if (st === 'APPROVED') {
    const callIso = await resetLead()
    log(`Lead call reset to ${callIso}; triggering cron...`)
    const r = await fetch(CRON_URL)
    log('cron response:', await r.text())
    log('DONE — check WhatsApp on the test number. Verify delivery via whatsapp_messages.status.')
    process.exit(0)
  }
  if (st === 'REJECTED') { log('Template REJECTED — stopping.'); process.exit(1) }
  await new Promise((res) => setTimeout(res, INTERVAL_MS))
}
log('Max duration reached without approval — stopping. Re-run when ready.')

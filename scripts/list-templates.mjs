// Lists all WhatsApp message templates and their approval status.
//
// Run from the codemode-internal dir with the System User token:
//   PowerShell:  $env:WHATSAPP_ACCESS_TOKEN="EAAB..."; node scripts/list-templates.mjs
//   Git Bash:    WHATSAPP_ACCESS_TOKEN="EAAB..." node scripts/list-templates.mjs

const clean = (s) => (s ?? '').replace(/^﻿/, '').trim()
const TOKEN = clean(process.env.WHATSAPP_ACCESS_TOKEN)
const WABA = clean(process.env.WABA_ID) || '1767668984219452'

if (!TOKEN) {
  console.error('Missing WHATSAPP_ACCESS_TOKEN env var.')
  process.exit(1)
}

const res = await fetch(
  `https://graph.facebook.com/v21.0/${WABA}/message_templates?fields=name,status,category,language&limit=100`,
  { headers: { Authorization: `Bearer ${TOKEN}` } },
)
const data = await res.json()
if (!res.ok || data.error) {
  console.error('FAILED:', JSON.stringify(data.error ?? data, null, 2))
  process.exit(1)
}

const rows = (data.data ?? []).sort((a, b) => a.name.localeCompare(b.name))
console.log(`\n${rows.length} templates on WABA ${WABA}:\n`)
for (const t of rows) {
  console.log(`  ${t.status.padEnd(10)} ${t.name}  (${t.category}, ${t.language})`)
}

// Creates the Phase 3 `cm_gao_meeting_reminder` WhatsApp template in Meta.
//
// Run from the codemode-internal dir, supplying the never-expiring System User token:
//   PowerShell:  $env:WHATSAPP_ACCESS_TOKEN="EAAB..."; node scripts/create-reminder-template.mjs
//   Git Bash:    WHATSAPP_ACCESS_TOKEN="EAAB..." node scripts/create-reminder-template.mjs
//
// Optional env: WABA_ID (defaults to the known Code Mode WABA), WHATSAPP_TEMPLATE_LANG (default "en").

const clean = (s) => (s ?? '').replace(/^﻿/, '').trim()

const TOKEN = clean(process.env.WHATSAPP_ACCESS_TOKEN)
const WABA = clean(process.env.WABA_ID) || '1767668984219452'
const LANG = clean(process.env.WHATSAPP_TEMPLATE_LANG) || 'en'

if (!TOKEN) {
  console.error('Missing WHATSAPP_ACCESS_TOKEN env var. See header of this file.')
  process.exit(1)
}

// Body must NOT end on a variable (Meta rule). {{2}} carries the timing phrase
// ("starting in 30 minutes" | "starting now") so one template serves both sends.
const payload = {
  name: 'cm_gao_meeting_reminder',
  category: 'UTILITY',
  language: LANG,
  components: [
    {
      type: 'BODY',
      text:
        'Hi {{1}}, your Code Mode strategy call is {{2}}! 📅\n' +
        '*When:* {{3}} (IST)\n' +
        '*Join link:* {{4}}\n' +
        'See you there!',
      example: {
        body_text: [['Priya', 'starting in 30 minutes', '24 Jun 2026, 4:30 pm', 'https://meet.google.com/abc-defg-hij']],
      },
    },
  ],
}

const res = await fetch(`https://graph.facebook.com/v21.0/${WABA}/message_templates`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
const data = await res.json()

if (!res.ok || data.error) {
  console.error('FAILED:', JSON.stringify(data.error ?? data, null, 2))
  process.exit(1)
}
console.log('CREATED:', JSON.stringify(data, null, 2))
console.log(`\nCheck status later: GET /${WABA}/message_templates?fields=name,status (or WhatsApp Manager).`)

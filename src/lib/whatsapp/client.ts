const BASE_URL = process.env.WATI_API_URL ?? ''
const TOKEN = process.env.WATI_API_TOKEN ?? ''

export interface WatiTemplateReceiver {
  whatsappNumber: string
  customParams: { name: string; value: string }[]
}

export interface WatiSendResult {
  ok: boolean
  messageId: string | null
  error: string | null
}

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  return null
}

export async function sendTemplate(
  templateName: string,
  receiver: WatiTemplateReceiver,
): Promise<WatiSendResult> {
  if (!BASE_URL || !TOKEN) {
    console.log(`[WATI] Not configured — would send template "${templateName}" to ${receiver.whatsappNumber}`)
    return { ok: true, messageId: 'dev-mode', error: null }
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v1/sendTemplateMessages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_name: templateName,
        broadcast_name: `seq_${templateName}_${Date.now()}`,
        receivers: [receiver],
      }),
      signal: AbortSignal.timeout(15_000),
    })

    const data = await res.json() as Record<string, unknown>

    if (!res.ok) {
      return { ok: false, messageId: null, error: JSON.stringify(data) }
    }

    const msgId = (data.messageId ?? data.id ?? null) as string | null
    return { ok: true, messageId: msgId, error: null }
  } catch (err) {
    return { ok: false, messageId: null, error: err instanceof Error ? err.message : String(err) }
  }
}

// Meta WhatsApp Cloud API client
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
//
// Required env vars (set in Vercel once Meta setup is done):
//   WHATSAPP_PHONE_NUMBER_ID   — from Meta WhatsApp > API Setup
//   WHATSAPP_ACCESS_TOKEN      — permanent System User token
//   WHATSAPP_API_VERSION       — optional, defaults to v21.0

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

const PHONE_NUMBER_ID = clean(process.env.WHATSAPP_PHONE_NUMBER_ID)
const ACCESS_TOKEN = clean(process.env.WHATSAPP_ACCESS_TOKEN)
const API_VERSION = clean(process.env.WHATSAPP_API_VERSION) || 'v21.0'
const LANG = clean(process.env.WHATSAPP_TEMPLATE_LANG) || 'en'

export interface SendResult {
  ok: boolean
  messageId: string | null
  error: string | null
}

export function isConfigured(): boolean {
  return Boolean(PHONE_NUMBER_ID && ACCESS_TOKEN)
}

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  if (digits.length >= 11 && digits.length <= 15) return digits // already has country code
  return null
}

async function post(body: Record<string, unknown>): Promise<SendResult> {
  if (!isConfigured()) {
    console.log('[WhatsApp] Not configured — would send:', JSON.stringify(body))
    return { ok: true, messageId: 'dev-mode', error: null }
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
      signal: AbortSignal.timeout(15_000),
    })

    const data = (await res.json()) as {
      messages?: { id: string }[]
      error?: { message?: string }
    }

    if (!res.ok) {
      return { ok: false, messageId: null, error: data.error?.message ?? JSON.stringify(data) }
    }

    return { ok: true, messageId: data.messages?.[0]?.id ?? null, error: null }
  } catch (err) {
    return { ok: false, messageId: null, error: err instanceof Error ? err.message : String(err) }
  }
}

export interface TemplateComponentsOptions {
  /** PDF/document link for a document-type header */
  headerDocument?: { link: string; filename: string }
  /** Image link for an image-type header */
  headerImage?: { link: string }
  /** Ordered body variable values, fill {{1}}, {{2}}, ... */
  bodyParams?: string[]
  /** URL buttons whose URL contains a {{1}} dynamic suffix — index-ordered */
  urlButtonParams?: { index: number; value: string }[]
}

/**
 * Sends an approved WhatsApp template message.
 * Templates (incl. document headers + URL buttons) must be approved in Meta first.
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  opts: TemplateComponentsOptions = {},
): Promise<SendResult> {
  const components: Record<string, unknown>[] = []

  if (opts.headerDocument) {
    components.push({
      type: 'header',
      parameters: [{ type: 'document', document: opts.headerDocument }],
    })
  } else if (opts.headerImage) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: opts.headerImage }],
    })
  }

  if (opts.bodyParams && opts.bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: opts.bodyParams.map(text => ({ type: 'text', text })),
    })
  }

  if (opts.urlButtonParams) {
    for (const btn of opts.urlButtonParams) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: String(btn.index),
        parameters: [{ type: 'text', text: btn.value }],
      })
    }
  }

  return post({
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: LANG },
      ...(components.length > 0 ? { components } : {}),
    },
  })
}

/**
 * Sends a free-form text message.
 * Only delivers inside the 24-hour customer service window
 * (i.e. after the lead has messaged you). Use templates otherwise.
 */
export async function sendTextMessage(to: string, text: string): Promise<SendResult> {
  return post({
    to,
    type: 'text',
    text: { preview_url: true, body: text },
  })
}

/**
 * Sends a document (PDF) as a standalone message.
 * Only inside the 24-hour window — for proactive sends use a template with a document header.
 */
export async function sendDocumentMessage(
  to: string,
  link: string,
  filename: string,
  caption?: string,
): Promise<SendResult> {
  return post({
    to,
    type: 'document',
    document: { link, filename, ...(caption ? { caption } : {}) },
  })
}

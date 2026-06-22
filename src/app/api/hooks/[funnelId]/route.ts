import { NextResponse, after } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import { runAuditPipeline } from '@/lib/audit/pipeline'
import { sendWhatsAppStep } from '@/lib/whatsapp/sender'
import type { Funnel, Lead } from '@/types/database'

type Params = Promise<{ funnelId: string }>

// Maps well-known incoming field names to lead columns.
// Custom field_mappings from the funnel record override these defaults.
const DEFAULT_MAP: Record<string, string> = {
  name: 'name', full_name: 'name', 'Full Name': 'name',
  email: 'email', email_address: 'email',
  phone: 'phone', phone_number: 'phone', mobile: 'phone',
  instagram_handle: 'instagram_handle', instagram: 'instagram_handle', ig_handle: 'instagram_handle',
  business_name: 'business_name', company: 'business_name', 'Company Name': 'business_name',
  business_type: 'business_type',
  team_size: 'team_size',
  revenue_range: 'revenue_range',
  instagram_url: 'instagram_url',
  facebook_url: 'facebook_url',
  website_url: 'website_url', website: 'website_url',
  current_tools: 'current_tools',
  bottleneck_text: 'bottleneck_text', bottleneck: 'bottleneck_text',
  utm_campaign: 'utm_campaign',
  utm_source: 'utm_source',
}

const VALID_LEAD_FIELDS = new Set([
  'name', 'email', 'phone', 'instagram_handle', 'business_name', 'business_type',
  'team_size', 'revenue_range', 'instagram_url', 'facebook_url', 'website_url',
  'current_tools', 'bottleneck_text', 'utm_campaign', 'utm_source',
])

export async function POST(req: Request, { params }: { params: Params }) {
  const { funnelId } = await params
  const key = new URL(req.url).searchParams.get('key')

  const supabase = createServiceClient()

  // Load funnel
  const { data: funnelData, error: funnelErr } = await supabase
    .from('funnels')
    .select('*')
    .eq('id', funnelId)
    .single()

  if (funnelErr || !funnelData) {
    return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })
  }

  const funnel = funnelData as unknown as Funnel

  if (!funnel.active) {
    return NextResponse.json({ error: 'Funnel is inactive' }, { status: 403 })
  }

  if (funnel.webhook_key !== key) {
    await supabase.from('funnel_events').insert({
      funnel_id: funnelId,
      payload: null,
      status: 'error',
      error_message: 'Invalid webhook key',
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Build merged mapping: defaults + funnel custom overrides
  const mapping = { ...DEFAULT_MAP, ...(funnel.field_mappings ?? {}) }

  // Map incoming fields → lead fields
  const leadData: Record<string, unknown> = {
    status: 'new',
    source: funnel.source,
    funnel_id: funnelId,
  }

  for (const [incomingKey, value] of Object.entries(body)) {
    const leadField = mapping[incomingKey]
    if (leadField && VALID_LEAD_FIELDS.has(leadField) && value !== undefined && value !== null && value !== '') {
      leadData[leadField] = String(value)
    }
  }

  // name is required
  if (!leadData.name) {
    leadData.name = 'Unknown'
  }

  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .insert(leadData)
    .select('id')
    .single()

  if (leadErr || !lead) {
    await supabase.from('funnel_events').insert({
      funnel_id: funnelId,
      payload: body,
      status: 'error',
      error_message: leadErr?.message ?? 'Failed to create lead',
    })
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  // Log the funnel event
  await supabase.from('funnel_events').insert({
    funnel_id: funnelId,
    payload: body,
    status: 'processed',
    lead_id: (lead as { id: string }).id,
  })

  await logActivity({
    entity_type: 'lead',
    entity_id: (lead as { id: string }).id,
    event_type: 'hook_received',
    description: `Lead created via funnel: ${funnel.name}`,
    metadata: { funnel_id: funnelId, funnel_name: funnel.name },
  })

  // Fire audit pipeline + WhatsApp Step 1 after the response is sent.
  // `after()` keeps the serverless function alive so this background work
  // actually completes (a bare `void`/fire-and-forget gets killed on Vercel
  // once the response returns, leaving the lead stuck at status 'new').
  const leadId = (lead as { id: string }).id
  after(async () => {
    try {
      await runAuditPipeline(leadId)
    } catch (err) {
      console.error('[Hook] Audit pipeline failed:', err)
    }
  })
  after(async () => {
    try {
      await sendWhatsAppStep({ ...leadData, id: leadId } as unknown as Lead, 1)
    } catch (err) {
      console.error('[Hook] WhatsApp step 1 failed:', err)
    }
  })

  return NextResponse.json({ ok: true, lead_id: (lead as { id: string }).id })
}

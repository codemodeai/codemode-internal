export type LeadStatus =
  | 'new' | 'auditing' | 'audit_ready' | 'qualified' | 'nurture'
  | 'not_fit' | 'call_scheduled' | 'call_done' | 'blueprint_sent'
  | 'closed_won' | 'closed_lost'

export type LeadSource = string

export type ClientStatus =
  | 'quote_sent' | 'agreement_signed' | 'in_progress' | 'review'
  | 'corrections' | 'delivered' | 'retained' | 'closed'

export type ProjectType =
  | 'website' | 'crm_automation' | 'ai_workflow' | 'full_growth_stack' | 'retainer' | 'erp'

export type ProjectStatus =
  | 'quote_sent' | 'signed' | 'in_progress' | 'review'
  | 'corrections' | 'delivered' | 'retained' | 'closed'

export type ScopeItemStatus = 'not_started' | 'in_progress' | 'done'

export type PaymentStatus = 'pending' | 'paid' | 'overdue'

export type PaymentMethod = 'upi' | 'bank_transfer' | 'cash' | 'other'

export type CorrectionStatus = 'pending' | 'in_progress' | 'done'

export type ExtraStatus = 'requested' | 'approved' | 'in_progress' | 'done' | 'invoiced'

export type ErrorSeverity = 'critical' | 'major' | 'minor'

export type ErrorReportedBy = 'client' | 'operator' | 'tester'

export type ErrorStatus = 'open' | 'in_progress' | 'fixed'

export type ContentPillar =
  | 'valuable' | 'case_study' | 'update' | 'social_proof' | 'industry'

export type ContentPlatform = 'instagram' | 'linkedin' | 'youtube' | 'all'

export type ContentFormat = 'reel' | 'carousel' | 'post' | 'short' | 'article'

export type ContentStatus =
  | 'idea' | 'scripting' | 'recording' | 'editing' | 'scheduled' | 'published' | 'archived'

export type ContentPlanType = 'launch' | 'authority' | 'results' | 'custom'

export type ActivityEntityType = 'lead' | 'client' | 'project' | 'content_item'

export type ActivityEventType =
  | 'hook_received' | 'status_change' | 'email_sent' | 'note_added'
  | 'operator_action' | 'conversion' | 'system'

// ── Score / report sub-types ──────────────────────────────────────────────────

export interface GrowthScorecard {
  lead_capture: number
  followup_speed: number
  content_consistency: number
  sales_process: number
  automation_maturity: number
}

// Score-based classification (set automatically at the end of the audit).
// potential = overall >= 7, nurture = 4..6.99, not_fit = < 4.
export type LeadSegment = 'potential' | 'nurture' | 'not_fit'

// Engagement/response-based qualification (evolves as the lead interacts).
export type QualificationState =
  | 'pending'      // audited, no reply yet
  | 'engaged'      // replied / interacting with us
  | 'no_response'  // 2 days silent after report
  | 'booked'       // booked a call
  | 'disqualified' // not a fit / opted out

// Post-meeting deal temperature (set once we've quoted a price / had the call).
// Turns hot on price acceptance; cools as the lead stays silent.
export type DealTemperature = 'hot' | 'warm' | 'cold'

export interface AuditGap {
  gap: string
  severity: 'critical' | 'major' | 'minor'
  revenue_impact: string
}

export interface AuditOpportunity {
  opportunity: string
  impact: 'high' | 'medium' | 'low'
}

export interface TalkingPoint {
  point: string
}

export interface AuditReport {
  summary: string
  generated_at: string
  [key: string]: unknown
}

// ── Table types ───────────────────────────────────────────────────────────────

export interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  instagram_handle: string | null
  business_name: string | null
  business_type: string | null
  team_size: string | null
  revenue_range: string | null
  instagram_url: string | null
  facebook_url: string | null
  website_url: string | null
  current_tools: string | null
  bottleneck_text: string | null
  status: LeadStatus
  source: LeadSource
  utm_campaign: string | null
  utm_source: string | null
  qualified: boolean
  qualification_notes: string | null
  audit_report: AuditReport | null
  instagram_score: number | null
  facebook_score: number | null
  website_score: number | null
  overall_score: number | null
  segment: LeadSegment | null
  qualification_state: QualificationState
  qualified_at: string | null
  whatsapp_last_read_at: string | null
  growth_scorecard: GrowthScorecard | null
  gaps: AuditGap[] | null
  opportunities: AuditOpportunity[] | null
  call_talking_points: TalkingPoint[] | null
  call_booked: boolean
  call_datetime: string | null
  call_meet_link: string | null
  call_notes: string | null
  reminder_30_sent_at: string | null
  reminder_start_sent_at: string | null
  seen_nudge_sent_at: string | null
  ai_instructions: string | null
  quoted_price: string | null
  deal_temperature: DealTemperature | null
  deal_temp_updated_at: string | null
  last_inbound_at: string | null
  blueprint_sent: boolean
  blueprint_sent_at: string | null
  blueprint_url: string | null
  whatsapp_opted_in: boolean
  whatsapp_sequence_step: number
  whatsapp_last_sent_at: string | null
  follow_up_count: number
  last_activity_at: string
  archived: boolean
  converted_to_client: boolean
  client_id: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  lead_id: string
  name: string
  email: string | null
  phone: string | null
  business_name: string | null
  status: ClientStatus
  converted_at: string
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  client_id: string
  project_type: ProjectType
  title: string
  contract_value: number | null
  status: ProjectStatus
  start_date: string | null
  delivery_date: string | null
  is_retainer: boolean
  retainer_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ScopeItem {
  id: string
  project_id: string
  title: string
  description: string | null
  in_scope: boolean
  status: ScopeItemStatus
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  project_id: string
  milestone_name: string
  amount: number
  due_date: string | null
  status: PaymentStatus
  paid_at: string | null
  invoice_number: string | null
  payment_method: PaymentMethod | null
  receipt_url: string | null
  created_at: string
  updated_at: string
}

export interface Correction {
  id: string
  project_id: string
  round_number: number
  description: string
  status: CorrectionStatus
  in_scope: boolean
  requested_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Extra {
  id: string
  project_id: string
  description: string
  effort_estimate: string | null
  agreed_price: number | null
  status: ExtraStatus
  client_approved: boolean
  invoiced: boolean
  requested_at: string
  created_at: string
  updated_at: string
}

export interface ProjectError {
  id: string
  project_id: string
  title: string
  description: string | null
  severity: ErrorSeverity
  reported_by: ErrorReportedBy
  status: ErrorStatus
  root_cause: string | null
  is_recurring: boolean
  reported_at: string
  fixed_at: string | null
  created_at: string
  updated_at: string
}

export interface ContentPlan {
  id: string
  month: string
  theme: string | null
  plan_type: ContentPlanType
  target_posts: number
  gao_funnel_pct: number
  valuable_pct: number
  case_study_pct: number
  update_pct: number
  social_proof_pct: number
  industry_pct: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ContentItem {
  id: string
  plan_id: string | null
  title: string
  pillar: ContentPillar
  platform: ContentPlatform
  format: ContentFormat | null
  hook: string | null
  script: string | null
  cta: string | null
  hashtags: string | null
  status: ContentStatus
  scheduled_date: string | null
  published_at: string | null
  views: number
  likes: number
  comments: number
  saves: number
  dm_triggers: number
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  entity_type: ActivityEntityType
  entity_id: string
  event_type: ActivityEventType
  description: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Funnel {
  id: string
  name: string
  description: string | null
  webhook_key: string
  source: string
  field_mappings: Record<string, string>
  active: boolean
  created_at: string
  updated_at: string
}

export interface WhatsAppMessage {
  id: string
  lead_id: string
  sequence_step: number
  template_name: string
  phone: string
  params: { name: string; value: string }[]
  status: 'pending' | 'sent' | 'failed'
  wati_message_id: string | null
  error_message: string | null
  sent_at: string
  created_at: string
}

export interface FunnelEvent {
  id: string
  funnel_id: string
  received_at: string
  payload: Record<string, unknown> | null
  status: 'processed' | 'error' | 'ignored'
  lead_id: string | null
  error_message: string | null
}

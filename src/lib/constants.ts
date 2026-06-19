import type { ContentPillar, LeadStatus } from '@/types/database'

export const PILLAR_COLORS: Record<ContentPillar, { bg: string; text: string; border: string }> = {
  valuable:     { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200' },
  case_study:   { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200' },
  update:       { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200' },
  social_proof: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  industry:     { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-200' },
}

export const PILLAR_LABELS: Record<ContentPillar, string> = {
  valuable:     'Valuable',
  case_study:   'Case Study',
  update:       'Update',
  social_proof: 'Social Proof',
  industry:     'Industry',
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, { bg: string; text: string }> = {
  new:             { bg: 'bg-blue-100',    text: 'text-blue-700' },
  auditing:        { bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  audit_ready:     { bg: 'bg-orange-100',  text: 'text-orange-700' },
  qualified:       { bg: 'bg-green-100',   text: 'text-green-700' },
  nurture:         { bg: 'bg-indigo-100',  text: 'text-indigo-700' },
  not_fit:         { bg: 'bg-slate-100',   text: 'text-slate-500' },
  call_scheduled:  { bg: 'bg-purple-100',  text: 'text-purple-700' },
  call_done:       { bg: 'bg-teal-100',    text: 'text-teal-700' },
  blueprint_sent:  { bg: 'bg-cyan-100',    text: 'text-cyan-700' },
  closed_won:      { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  closed_lost:     { bg: 'bg-red-100',     text: 'text-red-600' },
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new:            'New',
  auditing:       'Auditing',
  audit_ready:    'Audit Ready',
  qualified:      'Qualified',
  nurture:        'Nurture',
  not_fit:        'Not a Fit',
  call_scheduled: 'Call Scheduled',
  call_done:      'Call Done',
  blueprint_sent: 'Blueprint Sent',
  closed_won:     'Closed Won',
  closed_lost:    'Closed Lost',
}

export const PIPELINE_STAGES: LeadStatus[] = [
  'new', 'audit_ready', 'qualified', 'call_scheduled', 'blueprint_sent',
]

export const CALENDLY_LINK = process.env.NEXT_PUBLIC_CALENDLY_LINK ?? 'https://calendly.com/codemodeai'

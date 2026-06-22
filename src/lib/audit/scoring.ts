import type { GrowthScorecard, LeadSegment } from '@/types/database'

export interface ScorableAnalysis {
  instagram_score: number | null
  facebook_score: number | null
  website_score: number | null
  growth_scorecard: GrowthScorecard | null
}

const round1 = (n: number) => Math.round(n * 10) / 10
const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length

/**
 * Overall 0–10 score: average of the 5 growth-scorecard dimensions
 * (the holistic business-growth picture), falling back to the average of
 * whatever platform scores exist if the scorecard is missing.
 */
export function computeOverallScore(a: ScorableAnalysis): number | null {
  const sc = a.growth_scorecard
  if (sc) {
    const dims = [
      sc.lead_capture,
      sc.followup_speed,
      sc.content_consistency,
      sc.sales_process,
      sc.automation_maturity,
    ].filter((n): n is number => typeof n === 'number')
    if (dims.length) return round1(avg(dims))
  }
  const platform = [a.instagram_score, a.facebook_score, a.website_score]
    .filter((n): n is number => typeof n === 'number')
  if (platform.length) return round1(avg(platform))
  return null
}

/**
 * Score-based segment. Thresholds (chosen 2026-06-20):
 *   potential >= 7   ·   nurture 4–6.99   ·   not_fit < 4
 * A null score (no data at all) is treated as nurture — safe middle ground.
 */
export function segmentFor(overall: number | null): LeadSegment {
  if (overall === null) return 'nurture'
  if (overall >= 7) return 'potential'
  if (overall >= 4) return 'nurture'
  return 'not_fit'
}

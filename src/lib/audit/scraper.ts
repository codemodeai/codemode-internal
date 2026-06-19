const APIFY_BASE = 'https://api.apify.com/v2'

function actorPath(envVar: string, fallback: string): string {
  return (process.env[envVar] ?? fallback).replace('/', '~')
}

export interface InstagramProfile {
  username: string
  fullName: string | null
  biography: string | null
  followersCount: number | null
  followsCount: number | null
  postsCount: number | null
  externalUrl: string | null
  isVerified: boolean
  isBusinessAccount: boolean
  businessCategoryName: string | null
  recentPosts: Array<{
    type: string | null
    caption: string | null
    likesCount: number | null
    commentsCount: number | null
  }>
}

export interface FacebookPage {
  name: string | null
  likesCount: number | null
  followersCount: number | null
  category: string | null
  about: string | null
  website: string | null
  phone: string | null
  email: string | null
  rating: number | null
  reviewsCount: number | null
  responseTime: string | null
  callToAction: string | null
}

export interface WebsiteData {
  url: string
  title: string | null
  description: string | null
  h1: string | null
  h2s: string[]
  ctaTexts: string[]
  hasLeadForm: boolean
  hasWhatsApp: boolean
  hasPhone: boolean
  bodyText: string
  error: string | null
}

export interface ScrapeResult {
  instagram: InstagramProfile | null
  facebook: FacebookPage | null
  website: WebsiteData | null
  errors: { platform: string; error: string }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractInstagramUsername(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    return parts[0] ?? null
  } catch {
    return null
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

async function apifyRun<T>(actor: string, input: Record<string, unknown>): Promise<T[] | null> {
  const key = process.env.APIFY_API_KEY
  if (!key) return null

  const id = actorPath(actor === 'instagram' ? 'APIFY_INSTAGRAM_ACTOR' : 'APIFY_FACEBOOK_ACTOR',
    actor === 'instagram' ? 'apify/instagram-profile-scraper' : 'apify/facebook-pages-scraper')

  const url = `${APIFY_BASE}/acts/${id}/run-sync-get-dataset-items?token=${key}&timeout=90&memory=256`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(100_000),
    })
    if (!res.ok) {
      console.error(`[Apify:${actor}] HTTP ${res.status}`)
      return null
    }
    return res.json() as Promise<T[]>
  } catch (err) {
    console.error(`[Apify:${actor}] error:`, err)
    return null
  }
}

// ── Platform scrapers ─────────────────────────────────────────────────────────

async function scrapeInstagram(url: string): Promise<{ data: InstagramProfile | null; error: string | null }> {
  const username = extractInstagramUsername(url)
  if (!username) return { data: null, error: 'Could not extract username from URL' }

  const raw = await apifyRun<Record<string, unknown>>('instagram', {
    usernames: [username],
    resultsType: 'details',
    resultsLimit: 1,
  })

  if (!raw || raw.length === 0) return { data: null, error: 'No data returned from Instagram scraper' }

  const r = raw[0]
  return {
    data: {
      username: String(r.username ?? username),
      fullName: (r.fullName as string) ?? null,
      biography: (r.biography as string) ?? (r.bio as string) ?? null,
      followersCount: (r.followersCount as number) ?? (r.followers as number) ?? null,
      followsCount: (r.followsCount as number) ?? (r.following as number) ?? null,
      postsCount: (r.postsCount as number) ?? (r.posts as number) ?? null,
      externalUrl: (r.externalUrl as string) ?? (r.url as string) ?? null,
      isVerified: Boolean(r.isVerified ?? r.verified ?? false),
      isBusinessAccount: Boolean(r.isBusinessAccount ?? r.businessAccount ?? false),
      businessCategoryName: (r.businessCategoryName as string) ?? (r.category as string) ?? null,
      recentPosts: ((r.latestPosts ?? r.posts ?? []) as Record<string, unknown>[]).slice(0, 6).map(p => ({
        type: (p.type as string) ?? null,
        caption: (p.caption as string) ?? null,
        likesCount: (p.likesCount as number) ?? null,
        commentsCount: (p.commentsCount as number) ?? null,
      })),
    },
    error: null,
  }
}

async function scrapeFacebook(url: string): Promise<{ data: FacebookPage | null; error: string | null }> {
  const raw = await apifyRun<Record<string, unknown>>('facebook', {
    startUrls: [{ url }],
    maxPagesPerQuery: 1,
  })

  if (!raw || raw.length === 0) return { data: null, error: 'No data returned from Facebook scraper' }

  const r = raw[0]
  return {
    data: {
      name: (r.title as string) ?? (r.name as string) ?? null,
      likesCount: (r.likes as number) ?? (r.likesCount as number) ?? null,
      followersCount: (r.followers as number) ?? (r.followersCount as number) ?? null,
      category: ((r.categories as string[]) ?? []).join(', ') || (r.category as string) || null,
      about: (r.about as string) ?? null,
      website: (r.website as string) ?? null,
      phone: (r.phone as string) ?? null,
      email: (r.email as string) ?? null,
      rating: (r.rating as number) ?? null,
      reviewsCount: (r.reviewsCount as number) ?? (r.reviews as number) ?? null,
      responseTime: (r.responseTimes as string) ?? (r.responseTime as string) ?? null,
      callToAction: (r.callToAction as string) ?? (r.cta as string) ?? null,
    },
    error: null,
  }
}

async function scrapeWebsite(url: string): Promise<{ data: WebsiteData | null; error: string | null }> {
  let html: string
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CodeModeAuditBot/1.0)' },
      signal: AbortSignal.timeout(15_000),
    })
    html = await res.text()
  } catch (err) {
    return { data: null, error: `Fetch failed: ${err instanceof Error ? err.message : String(err)}` }
  }

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const desc = (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
  )?.[1]

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].slice(0, 5)

  const ctaKeywords = /book|schedule|call|contact|get start|free|demo|consult|whatsapp|enqui|apply|start now/i
  const anchorAndButton = [...html.matchAll(/<(?:button|a)[^>]*>([\s\S]*?)<\/(?:button|a)>/gi)]
  const ctaTexts = anchorAndButton
    .map(m => stripHtml(m[1]))
    .filter(t => t.length > 1 && t.length < 60 && ctaKeywords.test(t))
    .slice(0, 5)

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyText = stripHtml(bodyMatch?.[1] ?? html).slice(0, 4000)

  return {
    data: {
      url,
      title: title ? stripHtml(title) : null,
      description: desc?.trim() ?? null,
      h1: h1 ? stripHtml(h1) : null,
      h2s: h2Matches.map(m => stripHtml(m[1])).filter(Boolean),
      ctaTexts,
      hasLeadForm: /<form/i.test(html) && /<input[^>]+(?:email|name|phone)/i.test(html),
      hasWhatsApp: /wa\.me|whatsapp\.com\/send/i.test(html),
      hasPhone: /tel:/i.test(html),
      bodyText,
      error: null,
    },
    error: null,
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function scrapeAll(
  instagramUrl: string | null,
  facebookUrl: string | null,
  websiteUrl: string | null,
): Promise<ScrapeResult> {
  const errors: { platform: string; error: string }[] = []

  const [igResult, fbResult, webResult] = await Promise.all([
    instagramUrl ? scrapeInstagram(instagramUrl) : Promise.resolve({ data: null, error: null }),
    facebookUrl ? scrapeFacebook(facebookUrl) : Promise.resolve({ data: null, error: null }),
    websiteUrl ? scrapeWebsite(websiteUrl) : Promise.resolve({ data: null, error: null }),
  ])

  if (igResult.error) errors.push({ platform: 'instagram', error: igResult.error })
  if (fbResult.error) errors.push({ platform: 'facebook', error: fbResult.error })
  if (webResult.error) errors.push({ platform: 'website', error: webResult.error })

  return {
    instagram: igResult.data,
    facebook: fbResult.data,
    website: webResult.data,
    errors,
  }
}

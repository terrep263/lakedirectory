/**
 * MODULE 9: Public Business Directory
 * AI-assisted ranking for directory results.
 *
 * AI may:
 * - Rank results by predicted relevance
 * - Recommend businesses or deals to users
 * - Personalize ordering (if user context exists)
 *
 * AI may NOT:
 * - Hide valid ACTIVE businesses or deals
 * - Promote INACTIVE or EXPIRED entities
 * - Override admin-featured selections
 *
 * Thresholds:
 * - Low confidence → default to deterministic sort
 * - Conflicting signals → no ranking changes
 */

import type {
  PublicBusinessSummary,
  PublicDealSummary,
  AIRankingContext,
  AIRankingResult,
} from './types'

/**
 * Confidence threshold below which we fall back to deterministic sorting.
 */
const MIN_CONFIDENCE_THRESHOLD = 0.6

/**
 * AI ranking configuration.
 */
interface AIRankingConfig {
  // Weight for featured content (always boost)
  featuredWeight: number
  // Weight for founder businesses
  founderWeight: number
  // Weight for deal count
  dealCountWeight: number
  // Weight for proximity (if location provided)
  proximityWeight: number
  // Weight for savings percentage
  savingsWeight: number
  // Weight for expiring soon (urgency)
  urgencyWeight: number
}

const DEFAULT_CONFIG: AIRankingConfig = {
  featuredWeight: 100,
  founderWeight: 20,
  dealCountWeight: 5,
  proximityWeight: 30,
  savingsWeight: 10,
  urgencyWeight: 15,
}

/**
 * Calculate relevance score for a business.
 * Higher score = more relevant.
 *
 * CRITICAL: This NEVER filters out valid results.
 * It only affects ordering.
 */
function calculateBusinessScore(
  business: PublicBusinessSummary,
  context: AIRankingContext,
  config: AIRankingConfig = DEFAULT_CONFIG
): number {
  let score = 0

  // NOTE: Featured status only exists on BusinessPage table
  // Directory queries do not include featured status
  // Featured businesses are promoted via homepage API (GET /api/home/featured)

  // Founder businesses get a boost
  if (business.isFounder) {
    score += config.founderWeight
  }

  // More deals = higher visibility
  score += Math.min(business.dealCount * config.dealCountWeight, 50)

  // Verified businesses get a small boost
  if (business.isVerified) {
    score += 10
  }

  // Location-based scoring would go here if we had coordinates
  // This is a simplified version

  return score
}

/**
 * Calculate relevance score for a deal.
 * Higher score = more relevant.
 *
 * CRITICAL: This NEVER filters out valid results.
 * It only affects ordering.
 */
function calculateDealScore(
  deal: PublicDealSummary,
  context: AIRankingContext,
  config: AIRankingConfig = DEFAULT_CONFIG
): number {
  let score = 0

  // Featured deals always get boosted (admin decision respected)
  if (deal.isFeatured) {
    score += config.featuredWeight
  }

  // Higher savings percentage = more attractive
  if (deal.savingsPercent !== null) {
    score += Math.min(deal.savingsPercent * config.savingsWeight / 10, 50)
  }

  // Expiring soon = urgency boost (but not if already expired - impossible in this module)
  if (deal.redemptionWindowEnd) {
    const daysUntilExpiry = Math.ceil(
      (deal.redemptionWindowEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
      score += config.urgencyWeight * (8 - daysUntilExpiry)
    }
  }

  // Available vouchers = still purchasable
  if (deal.vouchersAvailable > 0) {
    score += 20
  }

  return score
}

/**
 * Rank businesses by AI-calculated relevance.
 * Falls back to deterministic sorting on low confidence.
 *
 * CRITICAL: All input businesses are returned. No filtering.
 */
export function rankBusinesses(
  businesses: PublicBusinessSummary[],
  context: AIRankingContext = {}
): AIRankingResult<PublicBusinessSummary> {
  // If no businesses, return empty result
  if (businesses.length === 0) {
    return {
      items: [],
      confidence: 1.0,
      fallbackUsed: false,
      rankingMethod: 'deterministic',
    }
  }

  // Calculate scores for all businesses
  const scored = businesses.map((business) => ({
    business,
    score: calculateBusinessScore(business, context),
  }))

  // Calculate confidence based on score distribution
  const scores = scored.map((s) => s.score)
  const maxScore = Math.max(...scores)
  const minScore = Math.min(...scores)
  const scoreRange = maxScore - minScore

  // Low variance = low confidence in ranking value
  const confidence = scoreRange > 50 ? 0.9 : scoreRange > 20 ? 0.7 : 0.4

  // If confidence is too low, use deterministic fallback
  if (confidence < MIN_CONFIDENCE_THRESHOLD) {
    // Fallback: featured first, then founders, then alphabetical
    const fallbackSorted = [...businesses].sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1
      if (a.isFounder !== b.isFounder) return a.isFounder ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return {
      items: fallbackSorted,
      confidence,
      fallbackUsed: true,
      rankingMethod: 'deterministic',
    }
  }

  // Sort by score (descending)
  scored.sort((a, b) => b.score - a.score)

  return {
    items: scored.map((s) => s.business),
    confidence,
    fallbackUsed: false,
    rankingMethod: 'ai',
  }
}

/**
 * Rank deals by AI-calculated relevance.
 * Falls back to deterministic sorting on low confidence.
 *
 * CRITICAL: All input deals are returned. No filtering.
 */
export function rankDeals(
  deals: PublicDealSummary[],
  context: AIRankingContext = {}
): AIRankingResult<PublicDealSummary> {
  // If no deals, return empty result
  if (deals.length === 0) {
    return {
      items: [],
      confidence: 1.0,
      fallbackUsed: false,
      rankingMethod: 'deterministic',
    }
  }

  // Calculate scores for all deals
  const scored = deals.map((deal) => ({
    deal,
    score: calculateDealScore(deal, context),
  }))

  // Calculate confidence based on score distribution
  const scores = scored.map((s) => s.score)
  const maxScore = Math.max(...scores)
  const minScore = Math.min(...scores)
  const scoreRange = maxScore - minScore

  // Low variance = low confidence in ranking value
  const confidence = scoreRange > 50 ? 0.9 : scoreRange > 20 ? 0.7 : 0.4

  // If confidence is too low, use deterministic fallback
  if (confidence < MIN_CONFIDENCE_THRESHOLD) {
    // Fallback: featured first, then by savings, then by expiry
    const fallbackSorted = [...deals].sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1
      const savingsA = a.savingsPercent ?? 0
      const savingsB = b.savingsPercent ?? 0
      if (savingsA !== savingsB) return savingsB - savingsA
      // Earlier expiry = higher urgency
      if (a.redemptionWindowEnd && b.redemptionWindowEnd) {
        return a.redemptionWindowEnd.getTime() - b.redemptionWindowEnd.getTime()
      }
      return 0
    })

    return {
      items: fallbackSorted,
      confidence,
      fallbackUsed: true,
      rankingMethod: 'deterministic',
    }
  }

  // Sort by score (descending)
  scored.sort((a, b) => b.score - a.score)

  return {
    items: scored.map((s) => s.deal),
    confidence,
    fallbackUsed: false,
    rankingMethod: 'ai',
  }
}

/**
 * Get personalized recommendations based on user history.
 * Returns a subset of items most likely to be relevant.
 *
 * CRITICAL: This is for "recommended for you" sections only.
 * The main listing must always show all valid results.
 */
export function getRecommendations<T extends PublicBusinessSummary | PublicDealSummary>(
  items: T[],
  context: AIRankingContext,
  maxResults: number = 5
): T[] {
  // If no context, just return top items
  if (!context.viewHistory?.length && !context.purchaseHistory?.length) {
    return items.slice(0, maxResults)
  }

  // Simple recommendation: boost items from categories user has engaged with
  // This is a placeholder for more sophisticated recommendation logic
  const viewedIds = new Set(context.viewHistory || [])
  const purchasedIds = new Set(context.purchaseHistory || [])

  // Score items based on whether user has engaged with similar items
  const scored = items.map((item) => {
    let score = 0

    // Items the user has already viewed/purchased are less interesting
    if ('businessId' in item) {
      // It's a deal
      if (purchasedIds.has(item.id)) score -= 50
      if (viewedIds.has(item.id)) score -= 10
    } else {
      // It's a business
      if (viewedIds.has(item.id)) score -= 10
    }

    // Featured items are always good recommendations
    if (item.isFeatured) score += 30

    return { item, score }
  })

  // Sort by score and return top results
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, maxResults).map((s) => s.item)
}

/**
 * Validate that AI ranking did not filter out any results.
 * This is a safety check to ensure AI compliance.
 */
export function validateRankingIntegrity<T>(
  original: T[],
  ranked: AIRankingResult<T>
): boolean {
  // All original items must be present in ranked result
  if (original.length !== ranked.items.length) {
    console.error(
      `[AI Ranking] INTEGRITY VIOLATION: Original count ${original.length} !== Ranked count ${ranked.items.length}`
    )
    return false
  }

  return true
}

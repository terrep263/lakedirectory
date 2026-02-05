/**
 * GEOGRAPHIC CONTEXT & DISCOVERY BOUNDARY MODULE
 * Type definitions for geography-scoped operations.
 *
 * ONE SENTENCE SYSTEM LAW:
 * County is the invisible parent of city and intent; nothing exists without it.
 *
 * CORE PRINCIPLES:
 * - County is an invisible, mandatory pre-context
 * - County is resolved from domain ONLY (never from user input)
 * - Cities are human reference anchors, not legal precision
 * - Each county has ~15 curated major municipalities
 * - Intent interpretation is illegal without resolved county context
 */

/**
 * County context resolved from request domain.
 * This is the invisible pre-context for all operations.
 */
export interface CountyGeoContext {
  id: string
  name: string
  state: string
  slug: string
  isActive: boolean
}

/**
 * City context - a human-anchored municipality within a county.
 * Cities are the only valid geographic units users can select.
 */
export interface CityContext {
  id: string
  countyId: string
  name: string
  slug: string
  isActive: boolean
  displayOrder: number
}

/**
 * Domain-to-county mapping for resolution.
 */
export interface CountyDomainMapping {
  id: string
  domain: string
  countyId: string
  isPrimary: boolean
  isActive: boolean
}

/**
 * Full geographic context for a request.
 * County is always present; city is optional (depends on user selection).
 */
export interface GeographicContext {
  county: CountyGeoContext
  city?: CityContext
}

/**
 * Discovery input from user.
 * User only sees city selector + intent input.
 */
export interface DiscoveryInput {
  cityId?: string      // Optional city filter
  citySlug?: string    // Alternative: city by slug
  intent?: string      // Natural language search query
}

/**
 * Interpreted intent within county boundaries.
 */
export interface InterpretedIntent {
  originalQuery: string
  categories: string[]      // Platform categories matched
  hasDealIntent: boolean    // User looking for deals/discounts
  confidence: 'high' | 'medium' | 'low'
  fillerWordsRemoved: string[]  // "near me", "best", etc.
}

/**
 * Discovery context - full context for a discovery query.
 */
export interface DiscoveryContext {
  county: CountyGeoContext
  city?: CityContext
  intent?: InterpretedIntent
}

/**
 * Result type for geography operations.
 */
export type GeoResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number }

/**
 * Input for creating a city (ADMIN only).
 */
export interface CreateCityInput {
  countyId: string
  name: string
  slug: string
  displayOrder?: number
}

/**
 * Input for updating a city (ADMIN only).
 */
export interface UpdateCityInput {
  name?: string
  isActive?: boolean
  displayOrder?: number
}

/**
 * Input for creating a domain mapping (SUPER_ADMIN only).
 */
export interface CreateDomainMappingInput {
  domain: string
  countyId: string
  isPrimary?: boolean
}

/**
 * Google Places ingestion context.
 * All ingestion is city-scoped within a county.
 */
export interface PlacesIngestionContext {
  county: CountyGeoContext
  city: CityContext
  googlePlacesConfig?: Record<string, unknown>
}

/**
 * Google Places ingestion result for a single place.
 */
export interface PlaceIngestionResult {
  placeId: string
  name: string
  address: string
  cityId: string
  countyId: string
  status: 'accepted' | 'rejected' | 'flagged'
  rejectReason?: string
}

/**
 * Validates a city slug format.
 * Must be lowercase, alphanumeric with hyphens only.
 */
export function isValidCitySlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
}

/**
 * Normalizes a domain for lookup.
 * Removes www prefix, converts to lowercase.
 */
export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '').trim()
}

/**
 * Extracts domain from a full URL or hostname.
 */
export function extractDomain(urlOrHost: string): string {
  try {
    // If it's a full URL, parse it
    if (urlOrHost.includes('://')) {
      const url = new URL(urlOrHost)
      return normalizeDomain(url.hostname)
    }
    // Otherwise treat as hostname
    return normalizeDomain(urlOrHost)
  } catch {
    return normalizeDomain(urlOrHost)
  }
}

/**
 * Filler words to strip from intent queries.
 * These don't affect search meaning.
 */
export const INTENT_FILLER_WORDS = [
  'near me',
  'nearby',
  'close to me',
  'around here',
  'in my area',
  'best',
  'top',
  'good',
  'great',
  'find',
  'looking for',
  'need',
  'want',
  'where can i',
  'where to',
  'local',
] as const

/**
 * Deal intent keywords.
 * Presence indicates user is looking for deals/discounts.
 */
export const DEAL_INTENT_KEYWORDS = [
  'deal',
  'deals',
  'discount',
  'discounts',
  'coupon',
  'coupons',
  'special',
  'specials',
  'offer',
  'offers',
  'sale',
  'sales',
  'promo',
  'promotion',
  'promotions',
  'savings',
  'cheap',
  'affordable',
  'budget',
] as const

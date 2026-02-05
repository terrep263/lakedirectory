/**
 * GEOGRAPHIC CONTEXT & DISCOVERY BOUNDARY MODULE
 * Intent Interpretation Service (County-Locked)
 *
 * INTENT INTERPRETATION RULES:
 * AI intent classification is county-locked and city-aware.
 *
 * AI MAY:
 * - Map intent phrases to platform categories
 * - Detect deal intent ("deal", "discount", "special")
 * - Ignore filler phrases ("near me", "best")
 *
 * AI MAY NOT:
 * - Search globally
 * - Rank across counties
 * - Override city or county boundaries
 * - Interpret intent without county context
 *
 * If AI confidence is low:
 * → present category clarification within the same city
 * → NEVER expand geography
 */

import type {
  CountyGeoContext,
  CityContext,
  InterpretedIntent,
  GeoResult,
} from './types'
import { INTENT_FILLER_WORDS, DEAL_INTENT_KEYWORDS } from './types'

/**
 * ERROR RESPONSES
 */
export const IntentErrors = {
  COUNTY_CONTEXT_REQUIRED: {
    error: 'Intent interpretation requires county context',
    status: 400,
  },
  EMPTY_INTENT: { error: 'Search query is empty', status: 400 },
} as const

/**
 * Platform categories for business classification.
 * These are the valid categories that intent can map to.
 */
export const PLATFORM_CATEGORIES = [
  'restaurant',
  'food',
  'cafe',
  'coffee',
  'bar',
  'nightlife',
  'retail',
  'shopping',
  'clothing',
  'beauty',
  'salon',
  'spa',
  'fitness',
  'gym',
  'health',
  'medical',
  'dental',
  'automotive',
  'repair',
  'home-services',
  'plumber',
  'electrician',
  'landscaping',
  'cleaning',
  'pet',
  'veterinary',
  'entertainment',
  'recreation',
  'hotel',
  'lodging',
  'real-estate',
  'financial',
  'legal',
  'professional-services',
  'education',
  'childcare',
  'photography',
  'events',
  'grocery',
  'convenience',
] as const

export type PlatformCategory = (typeof PLATFORM_CATEGORIES)[number]

/**
 * Category keyword mappings.
 * Maps common search terms to platform categories.
 */
const CATEGORY_KEYWORDS: Record<string, PlatformCategory[]> = {
  // Food & Dining
  'restaurant': ['restaurant', 'food'],
  'restaurants': ['restaurant', 'food'],
  'food': ['restaurant', 'food'],
  'eat': ['restaurant', 'food'],
  'eating': ['restaurant', 'food'],
  'dinner': ['restaurant', 'food'],
  'lunch': ['restaurant', 'food'],
  'breakfast': ['restaurant', 'food'],
  'brunch': ['restaurant', 'food', 'cafe'],
  'pizza': ['restaurant', 'food'],
  'sushi': ['restaurant', 'food'],
  'mexican': ['restaurant', 'food'],
  'chinese': ['restaurant', 'food'],
  'italian': ['restaurant', 'food'],
  'thai': ['restaurant', 'food'],
  'indian': ['restaurant', 'food'],
  'burger': ['restaurant', 'food'],
  'steak': ['restaurant', 'food'],
  'seafood': ['restaurant', 'food'],

  // Coffee & Cafe
  'coffee': ['coffee', 'cafe'],
  'cafe': ['cafe', 'coffee'],
  'bakery': ['cafe', 'food'],
  'tea': ['cafe', 'coffee'],

  // Bars & Nightlife
  'bar': ['bar', 'nightlife'],
  'bars': ['bar', 'nightlife'],
  'pub': ['bar', 'nightlife'],
  'brewery': ['bar', 'nightlife'],
  'cocktail': ['bar', 'nightlife'],
  'nightclub': ['nightlife', 'bar'],
  'club': ['nightlife', 'bar'],

  // Retail & Shopping
  'shop': ['retail', 'shopping'],
  'shopping': ['shopping', 'retail'],
  'store': ['retail', 'shopping'],
  'clothing': ['clothing', 'retail'],
  'clothes': ['clothing', 'retail'],
  'shoes': ['clothing', 'retail'],
  'jewelry': ['retail', 'shopping'],
  'electronics': ['retail', 'shopping'],
  'furniture': ['retail', 'home-services'],

  // Beauty & Personal Care
  'salon': ['salon', 'beauty'],
  'hair': ['salon', 'beauty'],
  'haircut': ['salon', 'beauty'],
  'beauty': ['beauty', 'salon'],
  'spa': ['spa', 'beauty'],
  'massage': ['spa', 'beauty'],
  'nails': ['salon', 'beauty'],
  'barber': ['salon', 'beauty'],

  // Fitness & Health
  'gym': ['gym', 'fitness'],
  'fitness': ['fitness', 'gym'],
  'yoga': ['fitness', 'gym'],
  'workout': ['fitness', 'gym'],
  'health': ['health', 'medical'],
  'doctor': ['medical', 'health'],
  'clinic': ['medical', 'health'],
  'dentist': ['dental', 'health'],
  'dental': ['dental', 'health'],
  'pharmacy': ['health', 'medical'],

  // Automotive
  'car': ['automotive', 'repair'],
  'auto': ['automotive', 'repair'],
  'mechanic': ['automotive', 'repair'],
  'oil change': ['automotive', 'repair'],
  'tires': ['automotive', 'repair'],
  'car wash': ['automotive'],

  // Home Services
  'plumber': ['plumber', 'home-services'],
  'plumbing': ['plumber', 'home-services'],
  'electrician': ['electrician', 'home-services'],
  'electrical': ['electrician', 'home-services'],
  'hvac': ['home-services', 'repair'],
  'ac': ['home-services', 'repair'],
  'landscaping': ['landscaping', 'home-services'],
  'lawn': ['landscaping', 'home-services'],
  'cleaning': ['cleaning', 'home-services'],
  'maid': ['cleaning', 'home-services'],
  'house cleaning': ['cleaning', 'home-services'],
  'roofing': ['home-services', 'repair'],
  'painting': ['home-services'],

  // Pets
  'pet': ['pet', 'veterinary'],
  'pets': ['pet', 'veterinary'],
  'vet': ['veterinary', 'pet'],
  'veterinarian': ['veterinary', 'pet'],
  'grooming': ['pet'],
  'dog': ['pet'],
  'cat': ['pet'],

  // Entertainment
  'entertainment': ['entertainment', 'recreation'],
  'movies': ['entertainment'],
  'theater': ['entertainment'],
  'bowling': ['entertainment', 'recreation'],
  'arcade': ['entertainment', 'recreation'],

  // Lodging
  'hotel': ['hotel', 'lodging'],
  'motel': ['hotel', 'lodging'],
  'lodging': ['lodging', 'hotel'],
  'vacation rental': ['lodging', 'hotel'],

  // Professional Services
  'lawyer': ['legal', 'professional-services'],
  'attorney': ['legal', 'professional-services'],
  'accountant': ['financial', 'professional-services'],
  'bank': ['financial'],
  'insurance': ['financial', 'professional-services'],
  'real estate': ['real-estate', 'professional-services'],
  'realtor': ['real-estate', 'professional-services'],

  // Education & Childcare
  'school': ['education'],
  'tutor': ['education'],
  'daycare': ['childcare', 'education'],
  'childcare': ['childcare'],

  // Other
  'photographer': ['photography', 'events'],
  'photography': ['photography', 'events'],
  'wedding': ['events', 'photography'],
  'catering': ['events', 'food'],
  'grocery': ['grocery', 'food'],
  'supermarket': ['grocery', 'food'],
}

/**
 * Interpret user search intent within county boundaries.
 *
 * HARD RULE: County context is REQUIRED.
 * Intent interpretation is ILLEGAL without resolved county context.
 *
 * @param query - The user's natural language search query
 * @param county - The resolved county context (REQUIRED)
 * @param city - Optional city context for additional scoping
 */
export function interpretIntent(
  query: string,
  county: CountyGeoContext,
  city?: CityContext
): GeoResult<InterpretedIntent> {
  // HARD CHECK: County context is mandatory
  if (!county?.id) {
    return { success: false, ...IntentErrors.COUNTY_CONTEXT_REQUIRED }
  }

  // Normalize and clean the query
  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) {
    return { success: false, ...IntentErrors.EMPTY_INTENT }
  }

  // Track removed filler words
  const fillerWordsRemoved: string[] = []
  let cleanedQuery = normalizedQuery

  // Remove filler words
  for (const filler of INTENT_FILLER_WORDS) {
    if (cleanedQuery.includes(filler)) {
      fillerWordsRemoved.push(filler)
      cleanedQuery = cleanedQuery.replace(new RegExp(filler, 'gi'), ' ').trim()
    }
  }

  // Clean up extra spaces
  cleanedQuery = cleanedQuery.replace(/\s+/g, ' ').trim()

  // Detect deal intent
  const hasDealIntent = DEAL_INTENT_KEYWORDS.some(keyword =>
    normalizedQuery.includes(keyword)
  )

  // Map to categories
  const matchedCategories = new Set<PlatformCategory>()

  // Check each word and phrase against category keywords
  const words = cleanedQuery.split(' ')

  for (const word of words) {
    const categories = CATEGORY_KEYWORDS[word]
    if (categories) {
      categories.forEach(c => matchedCategories.add(c))
    }
  }

  // Check multi-word phrases
  for (const [phrase, categories] of Object.entries(CATEGORY_KEYWORDS)) {
    if (phrase.includes(' ') && cleanedQuery.includes(phrase)) {
      categories.forEach(c => matchedCategories.add(c))
    }
  }

  // Calculate confidence
  let confidence: 'high' | 'medium' | 'low'

  if (matchedCategories.size > 0) {
    confidence = matchedCategories.size <= 2 ? 'high' : 'medium'
  } else if (hasDealIntent) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return {
    success: true,
    data: {
      originalQuery: query,
      categories: Array.from(matchedCategories),
      hasDealIntent,
      confidence,
      fillerWordsRemoved,
    },
  }
}

/**
 * Get category suggestions when confidence is low.
 * Returns common categories for clarification UI.
 *
 * RULE: Suggestions are always within the same county/city context.
 */
export function getCategorySuggestions(
  county: CountyGeoContext,
  city?: CityContext
): string[] {
  // Return top-level categories for clarification
  return [
    'Restaurants & Food',
    'Shopping & Retail',
    'Health & Beauty',
    'Home Services',
    'Automotive',
    'Professional Services',
    'Entertainment',
  ]
}

/**
 * Check if intent interpretation can proceed.
 * Returns false if county context is missing.
 */
export function canInterpretIntent(
  county?: CountyGeoContext | null
): boolean {
  return !!county?.id
}

/**
 * MODULE 9: Public Business Directory
 * Type definitions for public directory views.
 *
 * This module is Layer 3: Visibility.
 * It consumes enforced data from prior modules and exposes read-only public views.
 *
 * HARD RULES:
 * - Only ACTIVE businesses are visible
 * - Only ACTIVE deals are visible
 * - Read-only, no mutations
 */

import { BusinessStatus, DealStatus, FeaturedType } from '@prisma/client'

export { BusinessStatus, DealStatus, FeaturedType }

/**
 * Public business listing for directory views.
 * Only ACTIVE businesses should populate this type.
 */
export interface PublicBusiness {
  id: string
  name: string
  slug: string | null
  description: string | null
  category: string | null
  // Location
  city: string | null
  state: string | null
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  // Media
  logoUrl: string | null
  coverUrl: string | null
  photos: string[]
  // Contact
  phone: string | null
  website: string | null
  // Hours
  hours: Record<string, unknown> | null
  // Address
  addressLine1: string | null
  addressLine2: string | null
  // Status (always ACTIVE for public views)
  status: typeof BusinessStatus.ACTIVE
  // Metadata
  isVerified: boolean
  isFounder: boolean
  isFeatured: boolean
  // Computed
  dealCount: number
  // External ratings (nullable, from external sources)
  rating: number | null
  reviewCount: number | null
}

/**
 * Public business summary for list views.
 */
export interface PublicBusinessSummary {
  id: string
  name: string
  slug: string | null
  category: string | null
  city: string | null
  state: string | null
  logoUrl: string | null
  coverUrl: string | null
  isVerified: boolean
  isFounder: boolean
  isFeatured: boolean
  dealCount: number
  rating: number | null
}

/**
 * Public deal listing for directory views.
 * Only ACTIVE deals should populate this type.
 */
export interface PublicDeal {
  id: string
  businessId: string
  title: string
  description: string | null
  dealCategory: string | null
  // Pricing
  originalValue: string | null
  dealPrice: string | null
  savings: string | null
  savingsPercent: number | null
  // Redemption window
  redemptionWindowStart: Date | null
  redemptionWindowEnd: Date | null
  // Availability
  voucherQuantityLimit: number | null
  vouchersAvailable: number
  // Status (always ACTIVE for public views)
  status: typeof DealStatus.ACTIVE
  // Metadata
  isFeatured: boolean
  // Business info
  business: {
    id: string
    name: string
    slug: string | null
    category: string | null
    city: string | null
    state: string | null
    logoUrl: string | null
  }
}

/**
 * Public deal summary for list views.
 */
export interface PublicDealSummary {
  id: string
  businessId: string
  title: string
  dealCategory: string | null
  originalValue: string | null
  dealPrice: string | null
  savingsPercent: number | null
  redemptionWindowEnd: Date | null
  vouchersAvailable: number
  isFeatured: boolean
  businessName: string
  businessSlug: string | null
}

/**
 * Featured content for public display.
 */
export interface PublicFeaturedContent {
  id: string
  entityType: FeaturedType
  entityId: string
  startAt: Date
  endAt: Date
  priority: number
  // Resolved entity data
  entity: PublicBusinessSummary | PublicDealSummary
}

/**
 * Business search/filter parameters.
 */
export interface BusinessSearchParams {
  category?: string
  city?: string
  state?: string
  keyword?: string
  // Proximity search
  latitude?: number
  longitude?: number
  radiusMiles?: number
  // Pagination
  page?: number
  limit?: number
  // Sorting
  sortBy?: 'relevance' | 'name' | 'distance' | 'dealCount'
  sortOrder?: 'asc' | 'desc'
  // Filters
  hasDeals?: boolean
  isFounder?: boolean
  isFeatured?: boolean
}

/**
 * Deal search/filter parameters.
 */
export interface DealSearchParams {
  category?: string
  businessId?: string
  city?: string
  state?: string
  keyword?: string
  // Price range
  minPrice?: number
  maxPrice?: number
  minSavingsPercent?: number
  // Date filters
  expiringWithinDays?: number
  activeNow?: boolean
  // Proximity search
  latitude?: number
  longitude?: number
  radiusMiles?: number
  // Pagination
  page?: number
  limit?: number
  // Sorting
  sortBy?: 'relevance' | 'price' | 'savings' | 'expiring' | 'newest'
  sortOrder?: 'asc' | 'desc'
  // Filters
  isFeatured?: boolean
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

/**
 * Business detail response (includes deals).
 */
export interface BusinessDetailResponse {
  business: PublicBusiness
  deals: PublicDealSummary[]
  // SEO metadata
  seo: {
    title: string
    description: string
    canonicalUrl: string
    openGraph: {
      title: string
      description: string
      image: string | null
      url: string
    }
  }
}

/**
 * Featured content response.
 */
export interface FeaturedResponse {
  businesses: PublicFeaturedContent[]
  deals: PublicFeaturedContent[]
}

/**
 * AI ranking context (for personalization).
 */
export interface AIRankingContext {
  userId?: string
  sessionId?: string
  viewHistory?: string[]
  purchaseHistory?: string[]
  locationBias?: {
    latitude: number
    longitude: number
  }
}

/**
 * AI ranking result.
 */
export interface AIRankingResult<T> {
  items: T[]
  confidence: number
  fallbackUsed: boolean
  rankingMethod: 'ai' | 'deterministic'
}

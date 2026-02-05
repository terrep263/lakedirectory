/**
 * MODULE 9: Public Business Directory
 * Public exports for directory layer.
 *
 * This module is Layer 3: Visibility.
 * It consumes enforced data from prior modules and exposes read-only public views.
 *
 * HARD RULES:
 * - Only ACTIVE businesses are visible
 * - Only ACTIVE deals are visible
 * - Read-only, no mutations
 */

// Types
export * from './types'

// Queries
export {
  searchBusinesses,
  getBusinessBySlug,
  searchDeals,
  getFeaturedContent,
  getBusinessCategories,
  getDealCategories,
  getActiveCities,
} from './queries'

// AI Ranking
export {
  rankBusinesses,
  rankDeals,
  getRecommendations,
  validateRankingIntegrity,
} from './ai-ranking'

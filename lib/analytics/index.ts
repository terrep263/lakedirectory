/**
 * MODULE 11: ANALYTICS & REPORTING
 * Barrel Export
 *
 * Layer 3: Visibility (Read-Only)
 *
 * This module provides clear, trustworthy insight into:
 * - Platform health
 * - Business performance
 * - Deal effectiveness
 * - Voucher issuance and redemption
 * - AI system behavior
 * - Admin workload and escalations
 *
 * HARD RULES:
 * - All analytics are READ-ONLY
 * - All analytics are COUNTY-SCOPED
 * - Vendors can only see their own business data
 * - Admins can only see counties they are assigned to
 * - AI may summarize and highlight — never fabricate or infer beyond data
 * - No cross-county aggregation
 */

// Types
export type {
  AnalyticsTimeframe,
  PlatformAnalyticsSummary,
  BusinessAnalytics,
  DealAnalytics,
  AISystemAnalytics,
  AdminOperationsAnalytics,
  VendorDealAnalytics,
  AnalyticsResult,
  AIAnalyticsInsight,
  AnalyticsWithInsights,
} from './types'

export {
  timeframeToDays,
  getTimeframeRange,
  isValidTimeframe,
  AnalyticsErrors,
} from './types'

// Admin Analytics
export {
  getPlatformAnalytics,
  getBusinessesAnalytics,
  getDealsAnalytics,
  getAISystemAnalytics,
  getAdminOperationsAnalytics,
} from './admin-analytics'

// Vendor Analytics
export {
  getVendorBusinessAnalytics,
  getVendorDealsAnalytics,
  getVendorSingleDealAnalytics,
  getVendorRevenueSummary,
} from './vendor-analytics'

// AI Insights
export {
  generatePlatformInsights,
  generateBusinessInsights,
  generateAISystemInsights,
  generateAdminOperationsInsights,
  filterInsightsByConfidence,
  hasConflictingSignals,
} from './ai-insights'

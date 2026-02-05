/**
 * MODULE 11: ANALYTICS & REPORTING
 * Type Definitions
 *
 * Layer 3: Visibility (Read-Only)
 *
 * HARD RULES:
 * - All analytics are READ-ONLY
 * - All analytics are COUNTY-SCOPED
 * - Vendors see only their own business data
 * - Admins see only their assigned counties
 * - No cross-county aggregation
 */

/**
 * Timeframe for analytics queries.
 */
export type AnalyticsTimeframe = '7d' | '30d' | '90d' | 'all'

/**
 * Convert timeframe to days.
 */
export function timeframeToDays(timeframe: AnalyticsTimeframe): number | null {
  switch (timeframe) {
    case '7d': return 7
    case '30d': return 30
    case '90d': return 90
    case 'all': return null
  }
}

/**
 * Get date range for a timeframe.
 */
export function getTimeframeRange(timeframe: AnalyticsTimeframe): {
  startDate: Date | null
  endDate: Date
} {
  const endDate = new Date()
  const days = timeframeToDays(timeframe)

  if (days === null) {
    return { startDate: null, endDate }
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  return { startDate, endDate }
}

/**
 * Platform analytics summary (Admin view).
 */
export interface PlatformAnalyticsSummary {
  countyId: string
  countyName: string
  timeframe: AnalyticsTimeframe
  generatedAt: Date

  // Business metrics
  businesses: {
    total: number
    active: number
    claimed: number
    unclaimed: number
  }

  // Deal metrics
  deals: {
    total: number
    active: number
    pending: number
    expired: number
  }

  // Voucher metrics
  vouchers: {
    issued: number
    redeemed: number
    expired: number
    redemptionRate: number // percentage
  }

  // Revenue metrics
  revenue: {
    gross: number
    platformFees: number
    vendorNet: number
  }

  // Growth trends (compared to previous period)
  growth: {
    businessesChange: number // percentage
    dealsChange: number
    vouchersChange: number
    revenueChange: number
  }
}

/**
 * Business analytics (Vendor + Admin view).
 */
export interface BusinessAnalytics {
  businessId: string
  businessName: string
  countyId: string
  timeframe: AnalyticsTimeframe
  generatedAt: Date

  // Deal summary
  deals: {
    total: number
    active: number
    totalViews: number
  }

  // Voucher metrics
  vouchers: {
    purchased: number
    redeemed: number
    expired: number
    pending: number
  }

  // Performance metrics
  performance: {
    conversionRate: number // views → purchase percentage
    redemptionRate: number // purchased → redeemed percentage
    averageOrderValue: number
  }

  // Revenue
  revenue: {
    gross: number
    platformFees: number
    net: number
  }
}

/**
 * Deal analytics (Admin view).
 */
export interface DealAnalytics {
  dealId: string
  dealTitle: string
  businessId: string
  businessName: string
  countyId: string
  timeframe: AnalyticsTimeframe
  generatedAt: Date

  // Deal status
  status: string
  isActive: boolean

  // Voucher metrics
  vouchers: {
    issued: number
    redeemed: number
    expired: number
    pending: number
  }

  // Performance
  performance: {
    redemptionRate: number
    averageRedemptionTime: number // hours from purchase to redemption
    peakRedemptionDay: string | null
  }

  // DealGuard metrics
  dealGuard: {
    trustScore: number
    lastChecked: Date | null
    flagCount: number
  }
}

/**
 * AI system analytics (Admin view).
 */
export interface AISystemAnalytics {
  countyId: string
  timeframe: AnalyticsTimeframe
  generatedAt: Date

  // DealGuard metrics
  dealGuard: {
    totalChecks: number
    averageTrustScore: number
    scoreDistribution: {
      high: number    // >= 0.8
      medium: number  // 0.5 - 0.8
      low: number     // < 0.5
    }
  }

  // Escalation metrics
  escalations: {
    total: number
    byType: Record<string, number>
    pending: number
    resolved: number
    averageResolutionTime: number // hours
  }

  // AI confidence metrics
  aiConfidence: {
    highConfidence: number
    mediumConfidence: number
    lowConfidence: number
  }
}

/**
 * Admin operations analytics (Admin view).
 */
export interface AdminOperationsAnalytics {
  countyId: string
  timeframe: AnalyticsTimeframe
  generatedAt: Date

  // Escalation queue
  escalations: {
    open: number
    resolved: number
    averageResolutionTime: number // hours
    oldestPending: Date | null
  }

  // Admin actions
  actions: {
    total: number
    byType: Record<string, number>
    uniqueAdmins: number
  }

  // Response metrics
  response: {
    averageResponseTime: number // hours
    slaCompliance: number // percentage meeting SLA
  }
}

/**
 * Vendor deal analytics summary.
 */
export interface VendorDealAnalytics {
  dealId: string
  dealTitle: string
  status: string

  // Performance
  views: number
  purchases: number
  redemptions: number
  conversionRate: number
  redemptionRate: number

  // Revenue
  revenue: number

  // Time period
  createdAt: Date
  lastActivity: Date | null
}

/**
 * Analytics result type.
 */
export type AnalyticsResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number }

/**
 * AI insight for analytics.
 */
export interface AIAnalyticsInsight {
  type: 'trend' | 'anomaly' | 'suggestion' | 'summary'
  confidence: 'high' | 'medium' | 'low'
  title: string
  description: string
  metric?: string
  value?: number
}

/**
 * Analytics with AI insights.
 */
export interface AnalyticsWithInsights<T> {
  data: T
  insights: AIAnalyticsInsight[]
  insightsGenerated: boolean
}

/**
 * ERROR RESPONSES
 */
export const AnalyticsErrors = {
  COUNTY_CONTEXT_REQUIRED: { error: 'County context is required for analytics', status: 400 },
  BUSINESS_NOT_FOUND: { error: 'Business not found', status: 404 },
  DEAL_NOT_FOUND: { error: 'Deal not found', status: 404 },
  UNAUTHORIZED_ACCESS: { error: 'Unauthorized access to analytics', status: 403 },
  CROSS_COUNTY_ACCESS: { error: 'Cross-county analytics access is forbidden', status: 403 },
  INVALID_TIMEFRAME: { error: 'Invalid timeframe', status: 400 },
} as const

/**
 * Validate timeframe parameter.
 */
export function isValidTimeframe(value: string): value is AnalyticsTimeframe {
  return ['7d', '30d', '90d', 'all'].includes(value)
}

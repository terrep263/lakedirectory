/**
 * MODULE 7: Vendor Operations
 * AI Assistance for Vendors
 *
 * AI may:
 * - Suggest deal improvements
 * - Summarize performance metrics
 * - Flag potential issues (low conversion, redemption anomalies)
 *
 * AI may NOT:
 * - Activate deals
 * - Change voucher limits
 * - Redeem vouchers
 * - Suppress enforcement errors
 * - Act on behalf of the vendor
 *
 * When threshold is crossed:
 * - AI generates vendor alert
 * - AI escalates to admin task (if severe)
 * - Vendor action is paused ONLY if enforcement requires it
 */

import { prisma } from '@/lib/prisma'
import { VoucherStatus, DealStatus } from '@prisma/client'
import type {
  VendorAISuggestion,
  VendorAIThresholds,
  VendorAlert,
  DEFAULT_VENDOR_AI_THRESHOLDS,
} from './types'

// In-memory storage for alerts (should be persisted in production)
const vendorAlerts: Map<string, VendorAlert> = new Map()

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Analyze deal performance and generate suggestions.
 * AI ASSISTANCE ONLY - Does not modify anything.
 */
export async function analyzeDealPerformance(
  dealId: string,
  thresholds: VendorAIThresholds = {
    lowConversionRatePercent: 10,
    abnormalRedemptionHours: 1,
    maxFailedRedemptionAttempts: 3,
    dealGuardScoreThreshold: 0.7,
  }
): Promise<VendorAISuggestion[]> {
  const suggestions: VendorAISuggestion[] = []

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      vouchers: {
        select: {
          status: true,
          issuedAt: true,
          redeemedAt: true,
          expiresAt: true,
        },
      },
    },
  })

  if (!deal) {
    return suggestions
  }

  // Calculate metrics
  const totalVouchers = deal.vouchers.length
  const redeemedVouchers = deal.vouchers.filter((v) => v.status === VoucherStatus.REDEEMED).length
  const assignedVouchers = deal.vouchers.filter((v) => v.status === VoucherStatus.ASSIGNED).length
  const expiredVouchers = deal.vouchers.filter(
    (v) => v.expiresAt && v.expiresAt < new Date() && v.status !== VoucherStatus.REDEEMED
  ).length

  // Check conversion rate
  if (totalVouchers > 10) {
    const conversionRate = (redeemedVouchers / totalVouchers) * 100
    if (conversionRate < thresholds.lowConversionRatePercent) {
      suggestions.push({
        type: 'PERFORMANCE_ALERT',
        severity: 'WARNING',
        message: `Low conversion rate: ${conversionRate.toFixed(1)}% of vouchers redeemed`,
        actionable: true,
        suggestedAction: 'Consider promoting this deal or adjusting the offer',
        metadata: { conversionRate, totalVouchers, redeemedVouchers },
      })
    }
  }

  // Check for high expiration rate
  if (totalVouchers > 5 && expiredVouchers > totalVouchers * 0.3) {
    suggestions.push({
      type: 'PERFORMANCE_ALERT',
      severity: 'WARNING',
      message: `High expiration rate: ${expiredVouchers} vouchers expired without redemption`,
      actionable: true,
      suggestedAction: 'Consider extending redemption windows for future deals',
      metadata: { expiredVouchers, totalVouchers },
    })
  }

  // Check for pending assignments (purchased but not redeemed)
  if (assignedVouchers > 10) {
    suggestions.push({
      type: 'PERFORMANCE_ALERT',
      severity: 'INFO',
      message: `${assignedVouchers} vouchers purchased and awaiting redemption`,
      actionable: false,
      metadata: { assignedVouchers },
    })
  }

  return suggestions
}

/**
 * Check for redemption anomalies.
 * AI OBSERVATION ONLY - Does not block redemptions.
 */
export async function checkRedemptionAnomalies(
  businessId: string,
  thresholds: VendorAIThresholds = {
    lowConversionRatePercent: 10,
    abnormalRedemptionHours: 1,
    maxFailedRedemptionAttempts: 3,
    dealGuardScoreThreshold: 0.7,
  }
): Promise<VendorAISuggestion[]> {
  const suggestions: VendorAISuggestion[] = []
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  // Check for rapid redemption patterns
  const recentRedemptions = await prisma.redemption.findMany({
    where: {
      businessId,
      redeemedAt: { gte: oneHourAgo },
    },
    orderBy: { redeemedAt: 'desc' },
  })

  if (recentRedemptions.length > 20) {
    suggestions.push({
      type: 'ISSUE_FLAG',
      severity: 'WARNING',
      message: `Unusual redemption velocity: ${recentRedemptions.length} redemptions in the last hour`,
      actionable: false,
      metadata: { recentCount: recentRedemptions.length, timeWindow: '1 hour' },
    })
  }

  // Check for very quick redemptions (within abnormalRedemptionHours of issuance)
  const quickRedemptions = await prisma.voucher.count({
    where: {
      businessId,
      status: VoucherStatus.REDEEMED,
      redeemedAt: { not: null },
    },
  })

  return suggestions
}

/**
 * Generate deal improvement suggestions based on content.
 * AI ASSISTANCE ONLY - Does not modify the deal.
 */
export function generateDealSuggestions(deal: {
  title: string
  description?: string | null
  dealPrice?: number | null
  originalValue?: number | null
}): VendorAISuggestion[] {
  const suggestions: VendorAISuggestion[] = []

  // Title length check
  if (deal.title && deal.title.length < 10) {
    suggestions.push({
      type: 'DEAL_IMPROVEMENT',
      severity: 'INFO',
      message: 'Consider a more descriptive title to attract customers',
      actionable: true,
      suggestedAction: 'Add details about what the deal includes',
    })
  }

  // Description check
  if (!deal.description || deal.description.length < 50) {
    suggestions.push({
      type: 'DEAL_IMPROVEMENT',
      severity: 'INFO',
      message: 'A detailed description helps customers understand the offer',
      actionable: true,
      suggestedAction: 'Describe the products/services, terms, and value proposition',
    })
  }

  // Discount percentage check
  if (deal.dealPrice && deal.originalValue) {
    const discountPercent = ((deal.originalValue - deal.dealPrice) / deal.originalValue) * 100
    if (discountPercent < 15) {
      suggestions.push({
        type: 'DEAL_IMPROVEMENT',
        severity: 'INFO',
        message: `Current discount is ${discountPercent.toFixed(0)}%. Deals with 20%+ discounts typically perform better.`,
        actionable: true,
        suggestedAction: 'Consider increasing the discount or adding bonus value',
        metadata: { discountPercent },
      })
    }
  }

  return suggestions
}

/**
 * Create a vendor alert record.
 * Called when thresholds are crossed.
 */
export function createVendorAlert(
  vendorId: string,
  businessId: string,
  suggestion: VendorAISuggestion,
  dealId?: string
): VendorAlert {
  const alert: VendorAlert = {
    id: generateAlertId(),
    vendorId,
    businessId,
    type: suggestion.type,
    severity: suggestion.severity,
    message: suggestion.message,
    dealId,
    createdAt: new Date(),
    acknowledged: false,
  }

  vendorAlerts.set(alert.id, alert)

  // Log for observability
  console.warn(
    `[Vendor AI] Alert created for vendor ${vendorId}: ${suggestion.type} - ${suggestion.message}`
  )

  return alert
}

/**
 * Get unacknowledged alerts for a vendor.
 */
export function getVendorAlerts(vendorId: string): VendorAlert[] {
  return Array.from(vendorAlerts.values())
    .filter((alert) => alert.vendorId === vendorId && !alert.acknowledged)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Acknowledge a vendor alert.
 */
export function acknowledgeAlert(alertId: string, vendorId: string): boolean {
  const alert = vendorAlerts.get(alertId)

  if (!alert || alert.vendorId !== vendorId) {
    return false
  }

  alert.acknowledged = true
  alert.acknowledgedAt = new Date()
  vendorAlerts.set(alertId, alert)

  return true
}

/**
 * Get performance summary for vendor dashboard.
 * AI ASSISTANCE ONLY - Read-only metrics.
 */
export async function getVendorPerformanceSummary(businessId: string): Promise<{
  totalDeals: number
  activeDeals: number
  totalVouchersIssued: number
  totalVouchersRedeemed: number
  totalRevenue: number
  conversionRate: number
  suggestions: VendorAISuggestion[]
}> {
  const [deals, vouchers, redemptions] = await Promise.all([
    prisma.deal.findMany({
      where: { businessId },
      select: { id: true, dealStatus: true, dealPrice: true },
    }),
    prisma.voucher.count({
      where: { businessId },
    }),
    prisma.redemption.findMany({
      where: { businessId },
      select: { dealPrice: true },
    }),
  ])

  const activeDeals = deals.filter((d) => d.dealStatus === DealStatus.ACTIVE).length
  const totalRevenue = redemptions.reduce(
    (sum, r) => sum + (r.dealPrice ? parseFloat(r.dealPrice.toString()) : 0),
    0
  )
  const conversionRate = vouchers > 0 ? (redemptions.length / vouchers) * 100 : 0

  const suggestions: VendorAISuggestion[] = []

  // Generate summary-level suggestions
  if (activeDeals === 0 && deals.length > 0) {
    suggestions.push({
      type: 'PERFORMANCE_ALERT',
      severity: 'WARNING',
      message: 'No active deals. Activate deals to start receiving purchases.',
      actionable: true,
      suggestedAction: 'Submit an inactive deal for admin review',
    })
  }

  if (conversionRate < 10 && vouchers > 20) {
    suggestions.push({
      type: 'PERFORMANCE_ALERT',
      severity: 'WARNING',
      message: `Overall conversion rate is ${conversionRate.toFixed(1)}%`,
      actionable: true,
      suggestedAction: 'Review deal terms and consider promotions',
    })
  }

  return {
    totalDeals: deals.length,
    activeDeals,
    totalVouchersIssued: vouchers,
    totalVouchersRedeemed: redemptions.length,
    totalRevenue,
    conversionRate,
    suggestions,
  }
}

/**
 * Clean up old acknowledged alerts.
 */
export function cleanupOldAlerts(): number {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  let cleaned = 0

  for (const [id, alert] of vendorAlerts) {
    if (alert.acknowledged && alert.acknowledgedAt && alert.acknowledgedAt < thirtyDaysAgo) {
      vendorAlerts.delete(id)
      cleaned++
    }
  }

  return cleaned
}

/**
 * MODULE 11: ANALYTICS & REPORTING
 * Admin Analytics Services
 *
 * READ-ONLY county-scoped analytics for admins.
 *
 * HARD RULES:
 * - All queries are county-scoped
 * - No cross-county aggregation
 * - Data is always read-only
 */

import { prisma } from '@/lib/prisma'
import type {
  AnalyticsResult,
  AnalyticsTimeframe,
  PlatformAnalyticsSummary,
  DealAnalytics,
  AISystemAnalytics,
  AdminOperationsAnalytics,
  BusinessAnalytics,
} from './types'
import { getTimeframeRange, AnalyticsErrors } from './types'

/**
 * Get platform overview analytics for a county.
 */
export async function getPlatformAnalytics(
  countyId: string,
  timeframe: AnalyticsTimeframe
): Promise<AnalyticsResult<PlatformAnalyticsSummary>> {
  const { startDate, endDate } = getTimeframeRange(timeframe)

  // Get county info
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    select: { id: true, name: true },
  })

  if (!county) {
    return { success: false, ...AnalyticsErrors.COUNTY_CONTEXT_REQUIRED }
  }

  // Base date filter
  const dateFilter = startDate
    ? { createdAt: { gte: startDate, lte: endDate } }
    : {}

  // Business metrics
  const [totalBusinesses, activeBusinesses, claimedBusinesses] = await Promise.all([
    prisma.business.count({
      where: { countyId },
    }),
    prisma.business.count({
      where: { countyId, businessStatus: 'ACTIVE' },
    }),
    prisma.business.count({
      where: { countyId, ownerUserId: { not: null } },
    }),
  ])

  // Deal metrics
  const [totalDeals, activeDeals, inactiveDeals, expiredDeals] = await Promise.all([
    prisma.deal.count({
      where: { countyId },
    }),
    prisma.deal.count({
      where: { countyId, dealStatus: 'ACTIVE' },
    }),
    prisma.deal.count({
      where: { countyId, dealStatus: 'INACTIVE' },
    }),
    prisma.deal.count({
      where: { countyId, dealStatus: 'EXPIRED' },
    }),
  ])

  // Voucher metrics (VoucherStatus: ISSUED, ASSIGNED, REDEEMED)
  const [issuedVouchers, redeemedVouchers, assignedVouchers] = await Promise.all([
    prisma.voucher.count({
      where: { countyId, ...dateFilter },
    }),
    prisma.voucher.count({
      where: { countyId, status: 'REDEEMED', ...dateFilter },
    }),
    prisma.voucher.count({
      where: { countyId, status: 'ASSIGNED', ...dateFilter },
    }),
  ])

  // Calculate expired based on expiresAt
  const expiredVouchers = await prisma.voucher.count({
    where: {
      countyId,
      expiresAt: { lt: new Date() },
      status: { not: 'REDEEMED' },
      ...dateFilter,
    },
  })

  const redemptionRate = issuedVouchers > 0
    ? (redeemedVouchers / issuedVouchers) * 100
    : 0

  // Revenue metrics from purchases (amountPaid is the only amount field)
  const purchases = await prisma.purchase.aggregate({
    where: { countyId, status: 'COMPLETED', ...dateFilter },
    _sum: {
      amountPaid: true,
    },
  })

  const grossRevenue = purchases._sum.amountPaid?.toNumber() ?? 0
  // Platform fee is typically a percentage - estimate at 10%
  const platformFees = grossRevenue * 0.1
  const vendorNet = grossRevenue - platformFees

  // Growth trends (compare to previous period)
  let growth = {
    businessesChange: 0,
    dealsChange: 0,
    vouchersChange: 0,
    revenueChange: 0,
  }

  if (startDate) {
    const previousStartDate = new Date(startDate)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    previousStartDate.setDate(previousStartDate.getDate() - daysDiff)

    const previousDateFilter = {
      createdAt: { gte: previousStartDate, lt: startDate },
    }

    const [prevBusinesses, prevDeals, prevVouchers, prevRevenue] = await Promise.all([
      prisma.business.count({
        where: { countyId, ...previousDateFilter },
      }),
      prisma.deal.count({
        where: { countyId, ...previousDateFilter },
      }),
      prisma.voucher.count({
        where: { countyId, ...previousDateFilter },
      }),
      prisma.purchase.aggregate({
        where: { countyId, status: 'COMPLETED', ...previousDateFilter },
        _sum: { amountPaid: true },
      }),
    ])

    const currentBusinesses = await prisma.business.count({
      where: { countyId, ...dateFilter },
    })
    const currentDeals = await prisma.deal.count({
      where: { countyId, ...dateFilter },
    })

    growth = {
      businessesChange: prevBusinesses > 0
        ? ((currentBusinesses - prevBusinesses) / prevBusinesses) * 100
        : 0,
      dealsChange: prevDeals > 0
        ? ((totalDeals - prevDeals) / prevDeals) * 100
        : 0,
      vouchersChange: prevVouchers > 0
        ? ((issuedVouchers - prevVouchers) / prevVouchers) * 100
        : 0,
      revenueChange: (prevRevenue._sum.amountPaid?.toNumber() ?? 0) > 0
        ? ((grossRevenue - (prevRevenue._sum.amountPaid?.toNumber() ?? 0)) /
           (prevRevenue._sum.amountPaid?.toNumber() ?? 1)) * 100
        : 0,
    }
  }

  return {
    success: true,
    data: {
      countyId: county.id,
      countyName: county.name,
      timeframe,
      generatedAt: new Date(),
      businesses: {
        total: totalBusinesses,
        active: activeBusinesses,
        claimed: claimedBusinesses,
        unclaimed: totalBusinesses - claimedBusinesses,
      },
      deals: {
        total: totalDeals,
        active: activeDeals,
        pending: inactiveDeals,  // inactive deals (pending activation)
        expired: expiredDeals,
      },
      vouchers: {
        issued: issuedVouchers,
        redeemed: redeemedVouchers,
        expired: expiredVouchers,
        redemptionRate: Math.round(redemptionRate * 100) / 100,
      },
      revenue: {
        gross: grossRevenue,
        platformFees,
        vendorNet,
      },
      growth,
    },
  }
}

/**
 * Get business analytics for all businesses in a county.
 */
export async function getBusinessesAnalytics(
  countyId: string,
  timeframe: AnalyticsTimeframe,
  limit: number = 50,
  offset: number = 0
): Promise<AnalyticsResult<{ businesses: BusinessAnalytics[]; total: number }>> {
  const { startDate, endDate } = getTimeframeRange(timeframe)
  const dateFilter = startDate
    ? { createdAt: { gte: startDate, lte: endDate } }
    : {}

  // Get businesses with aggregated data
  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      where: { countyId },
      select: {
        id: true,
        name: true,
        countyId: true,
      },
      take: limit,
      skip: offset,
      orderBy: { name: 'asc' },
    }),
    prisma.business.count({ where: { countyId } }),
  ])

  // Get analytics for each business
  const businessAnalytics: BusinessAnalytics[] = await Promise.all(
    businesses.map(async (business) => {
      const [deals, vouchers, purchases] = await Promise.all([
        prisma.deal.findMany({
          where: { businessId: business.id },
          select: { id: true, dealStatus: true },
        }),
        prisma.voucher.aggregate({
          where: { deal: { businessId: business.id }, ...dateFilter },
          _count: { id: true },
        }),
        prisma.purchase.aggregate({
          where: { deal: { businessId: business.id }, status: 'COMPLETED', ...dateFilter },
          _sum: { amountPaid: true },
          _count: { id: true },
        }),
      ])

      const [redeemed, assigned] = await Promise.all([
        prisma.voucher.count({
          where: { deal: { businessId: business.id }, status: 'REDEEMED', ...dateFilter },
        }),
        prisma.voucher.count({
          where: { deal: { businessId: business.id }, status: 'ASSIGNED', ...dateFilter },
        }),
      ])

      // Calculate expired based on expiresAt
      const expired = await prisma.voucher.count({
        where: {
          deal: { businessId: business.id },
          expiresAt: { lt: new Date() },
          status: { not: 'REDEEMED' },
          ...dateFilter,
        },
      })

      // Pending = assigned but not yet redeemed
      const pending = assigned

      const totalVouchers = vouchers._count.id
      const totalPurchases = purchases._count.id
      const grossRevenue = purchases._sum.amountPaid?.toNumber() ?? 0
      const platformFees = grossRevenue * 0.1  // Estimate 10% platform fee

      return {
        businessId: business.id,
        businessName: business.name,
        countyId: business.countyId ?? countyId,  // Use passed countyId as fallback
        timeframe,
        generatedAt: new Date(),
        deals: {
          total: deals.length,
          active: deals.filter(d => d.dealStatus === 'ACTIVE').length,
          totalViews: 0, // Would need view tracking
        },
        vouchers: {
          purchased: totalVouchers,
          redeemed,
          expired,
          pending,
        },
        performance: {
          conversionRate: 0, // Would need view tracking
          redemptionRate: totalVouchers > 0 ? (redeemed / totalVouchers) * 100 : 0,
          averageOrderValue: totalPurchases > 0 ? grossRevenue / totalPurchases : 0,
        },
        revenue: {
          gross: grossRevenue,
          platformFees,
          net: grossRevenue - platformFees,
        },
      }
    })
  )

  return {
    success: true,
    data: { businesses: businessAnalytics, total },
  }
}

/**
 * Get deal analytics for all deals in a county.
 */
export async function getDealsAnalytics(
  countyId: string,
  timeframe: AnalyticsTimeframe,
  limit: number = 50,
  offset: number = 0
): Promise<AnalyticsResult<{ deals: DealAnalytics[]; total: number }>> {
  const { startDate, endDate } = getTimeframeRange(timeframe)
  const dateFilter = startDate
    ? { createdAt: { gte: startDate, lte: endDate } }
    : {}

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where: { countyId },
      include: {
        business: { select: { id: true, name: true } },
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.deal.count({ where: { countyId } }),
  ])

  const dealAnalytics: DealAnalytics[] = await Promise.all(
    deals.map(async (deal) => {
      const [issued, redeemed, assigned] = await Promise.all([
        prisma.voucher.count({
          where: { dealId: deal.id, ...dateFilter },
        }),
        prisma.voucher.count({
          where: { dealId: deal.id, status: 'REDEEMED', ...dateFilter },
        }),
        prisma.voucher.count({
          where: { dealId: deal.id, status: 'ASSIGNED', ...dateFilter },
        }),
      ])

      // Calculate expired based on expiresAt
      const expired = await prisma.voucher.count({
        where: {
          dealId: deal.id,
          expiresAt: { lt: new Date() },
          status: { not: 'REDEEMED' },
          ...dateFilter,
        },
      })

      // Pending = assigned but not yet redeemed
      const pending = assigned

      // Get redemption times for average calculation
      const redemptions = await prisma.redemption.findMany({
        where: {
          voucher: { dealId: deal.id },
          ...dateFilter,
        },
        select: { createdAt: true, voucher: { select: { issuedAt: true } } },
      })

      let averageRedemptionTime = 0
      if (redemptions.length > 0) {
        const totalHours = redemptions.reduce((sum, r) => {
          const hours = (r.createdAt.getTime() - r.voucher.issuedAt.getTime()) / (1000 * 60 * 60)
          return sum + hours
        }, 0)
        averageRedemptionTime = totalHours / redemptions.length
      }

      // Get DealGuard score from validations (no trustScore field, so count validations)
      const validation = await prisma.voucherValidation.findFirst({
        where: { dealId: deal.id },
        orderBy: { validatedAt: 'desc' },
        select: { validatedAt: true },
      })

      const validationCount = await prisma.voucherValidation.count({
        where: { dealId: deal.id },
      })

      // AdminEscalation doesn't have dealId - count escalations for related entities
      const flagCount = await prisma.adminEscalation.count({
        where: { entityId: deal.id, entityType: 'Deal' },
      })

      return {
        dealId: deal.id,
        dealTitle: deal.title,
        businessId: deal.business.id,
        businessName: deal.business.name,
        countyId: deal.countyId ?? countyId,
        timeframe,
        generatedAt: new Date(),
        status: deal.dealStatus,
        isActive: deal.dealStatus === 'ACTIVE',
        vouchers: {
          issued,
          redeemed,
          expired,
          pending,
        },
        performance: {
          redemptionRate: issued > 0 ? (redeemed / issued) * 100 : 0,
          averageRedemptionTime: Math.round(averageRedemptionTime * 100) / 100,
          peakRedemptionDay: null, // Would need more complex analysis
        },
        dealGuard: {
          trustScore: validationCount > 0 ? 1 : 0, // Simplified: has validations = trusted
          lastChecked: validation?.validatedAt ?? null,
          flagCount,
        },
      }
    })
  )

  return {
    success: true,
    data: { deals: dealAnalytics, total },
  }
}

/**
 * Get AI system analytics for a county.
 */
export async function getAISystemAnalytics(
  countyId: string,
  timeframe: AnalyticsTimeframe
): Promise<AnalyticsResult<AISystemAnalytics>> {
  const { startDate, endDate } = getTimeframeRange(timeframe)
  const dateFilter = startDate
    ? { createdAt: { gte: startDate, lte: endDate } }
    : {}

  // DealGuard metrics - VoucherValidation doesn't have trustScore
  // Count validations as a proxy for system activity
  const validationDateFilter = startDate
    ? { validatedAt: { gte: startDate, lte: endDate } }
    : {}

  const totalChecks = await prisma.voucherValidation.count({
    where: { countyId, ...validationDateFilter },
  })

  // Since we don't have trust scores, report based on validation counts
  // All validated = trusted (score distribution is simplified)
  const avgScore = totalChecks > 0 ? 1 : 0
  const scoreDistribution = {
    high: totalChecks,  // All validations are considered "high" trust
    medium: 0,
    low: 0,
  }

  // Escalation metrics (uses escalationType and resolved boolean)
  const escalations = await prisma.adminEscalation.findMany({
    where: { countyId, ...dateFilter },
    select: {
      escalationType: true,
      resolved: true,
      createdAt: true,
      resolvedAt: true,
    },
  })

  const escalationsByType: Record<string, number> = {}
  escalations.forEach(e => {
    escalationsByType[e.escalationType] = (escalationsByType[e.escalationType] || 0) + 1
  })

  const resolvedEscalations = escalations.filter(e => e.resolved === true)
  const pendingEscalations = escalations.filter(e => e.resolved === false)

  let avgResolutionTime = 0
  if (resolvedEscalations.length > 0) {
    const totalHours = resolvedEscalations.reduce((sum, e) => {
      if (e.resolvedAt) {
        return sum + (e.resolvedAt.getTime() - e.createdAt.getTime()) / (1000 * 60 * 60)
      }
      return sum
    }, 0)
    avgResolutionTime = totalHours / resolvedEscalations.length
  }

  // AI confidence (derived from trust scores)
  const aiConfidence = {
    highConfidence: scoreDistribution.high,
    mediumConfidence: scoreDistribution.medium,
    lowConfidence: scoreDistribution.low,
  }

  return {
    success: true,
    data: {
      countyId,
      timeframe,
      generatedAt: new Date(),
      dealGuard: {
        totalChecks,
        averageTrustScore: Math.round(avgScore * 100) / 100,
        scoreDistribution,
      },
      escalations: {
        total: escalations.length,
        byType: escalationsByType,
        pending: pendingEscalations.length,
        resolved: resolvedEscalations.length,
        averageResolutionTime: Math.round(avgResolutionTime * 100) / 100,
      },
      aiConfidence,
    },
  }
}

/**
 * Get admin operations analytics for a county.
 */
export async function getAdminOperationsAnalytics(
  countyId: string,
  timeframe: AnalyticsTimeframe
): Promise<AnalyticsResult<AdminOperationsAnalytics>> {
  const { startDate, endDate } = getTimeframeRange(timeframe)
  const dateFilter = startDate
    ? { createdAt: { gte: startDate, lte: endDate } }
    : {}

  // Escalation queue (uses resolved boolean, not status)
  const [openEscalations, resolvedEscalations, oldestPending] = await Promise.all([
    prisma.adminEscalation.count({
      where: { countyId, resolved: false, ...dateFilter },
    }),
    prisma.adminEscalation.findMany({
      where: { countyId, resolved: true, ...dateFilter },
      select: { createdAt: true, resolvedAt: true },
    }),
    prisma.adminEscalation.findFirst({
      where: { countyId, resolved: false },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ])

  let avgResolutionTime = 0
  if (resolvedEscalations.length > 0) {
    const totalHours = resolvedEscalations.reduce((sum, e) => {
      if (e.resolvedAt) {
        return sum + (e.resolvedAt.getTime() - e.createdAt.getTime()) / (1000 * 60 * 60)
      }
      return sum
    }, 0)
    avgResolutionTime = totalHours / resolvedEscalations.length
  }

  // Admin actions
  const actions = await prisma.adminActionLog.findMany({
    where: { countyId, ...dateFilter },
    select: { actionType: true, adminUserId: true },
  })

  const actionsByType: Record<string, number> = {}
  const uniqueAdmins = new Set<string>()
  actions.forEach(a => {
    actionsByType[a.actionType] = (actionsByType[a.actionType] || 0) + 1
    uniqueAdmins.add(a.adminUserId)
  })

  // Response metrics (simplified - would need more tracking in production)
  const avgResponseTime = avgResolutionTime // Simplified: using resolution time as response time
  const slaCompliance = resolvedEscalations.length > 0
    ? (resolvedEscalations.filter(e => {
        if (!e.resolvedAt) return false
        const hours = (e.resolvedAt.getTime() - e.createdAt.getTime()) / (1000 * 60 * 60)
        return hours <= 24 // 24-hour SLA
      }).length / resolvedEscalations.length) * 100
    : 100

  return {
    success: true,
    data: {
      countyId,
      timeframe,
      generatedAt: new Date(),
      escalations: {
        open: openEscalations,
        resolved: resolvedEscalations.length,
        averageResolutionTime: Math.round(avgResolutionTime * 100) / 100,
        oldestPending: oldestPending?.createdAt ?? null,
      },
      actions: {
        total: actions.length,
        byType: actionsByType,
        uniqueAdmins: uniqueAdmins.size,
      },
      response: {
        averageResponseTime: Math.round(avgResponseTime * 100) / 100,
        slaCompliance: Math.round(slaCompliance * 100) / 100,
      },
    },
  }
}

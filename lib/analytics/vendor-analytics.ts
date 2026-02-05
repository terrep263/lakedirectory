/**
 * MODULE 11: ANALYTICS & REPORTING
 * Vendor Analytics Services
 *
 * READ-ONLY analytics for vendors.
 * Vendors can ONLY see their own business data.
 *
 * HARD RULES:
 * - Vendors see only their own business
 * - All queries are county-scoped
 * - Data is always read-only
 */

import { prisma } from '@/lib/prisma'
import type {
  AnalyticsResult,
  AnalyticsTimeframe,
  BusinessAnalytics,
  VendorDealAnalytics,
} from './types'
import { getTimeframeRange, AnalyticsErrors } from './types'

/**
 * Get business analytics for a vendor's business.
 */
export async function getVendorBusinessAnalytics(
  businessId: string,
  vendorId: string,
  timeframe: AnalyticsTimeframe
): Promise<AnalyticsResult<BusinessAnalytics>> {
  const { startDate, endDate } = getTimeframeRange(timeframe)
  const dateFilter = startDate
    ? { createdAt: { gte: startDate, lte: endDate } }
    : {}

  // Verify vendor ownership
  const ownership = await prisma.vendorOwnership.findUnique({
    where: { userId: vendorId },
    select: { businessId: true },
  })

  if (!ownership || ownership.businessId !== businessId) {
    return { success: false, ...AnalyticsErrors.UNAUTHORIZED_ACCESS }
  }

  // Get business
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      countyId: true,
    },
  })

  if (!business) {
    return { success: false, ...AnalyticsErrors.BUSINESS_NOT_FOUND }
  }

  // Get deals
  const deals = await prisma.deal.findMany({
    where: { businessId },
    select: { id: true, dealStatus: true },
  })

  // Get voucher metrics (VoucherStatus: ISSUED, ASSIGNED, REDEEMED)
  const [totalVouchers, redeemed, assigned] = await Promise.all([
    prisma.voucher.count({
      where: { deal: { businessId }, ...dateFilter },
    }),
    prisma.voucher.count({
      where: { deal: { businessId }, status: 'REDEEMED', ...dateFilter },
    }),
    prisma.voucher.count({
      where: { deal: { businessId }, status: 'ASSIGNED', ...dateFilter },
    }),
  ])

  // Calculate expired based on expiresAt
  const expired = await prisma.voucher.count({
    where: {
      deal: { businessId },
      expiresAt: { lt: new Date() },
      status: { not: 'REDEEMED' },
      ...dateFilter,
    },
  })

  // Pending = assigned but not yet redeemed
  const pending = assigned

  // Get revenue (Purchase uses amountPaid, not totalAmount/platformFee)
  const purchases = await prisma.purchase.aggregate({
    where: { deal: { businessId }, status: 'COMPLETED', ...dateFilter },
    _sum: { amountPaid: true },
    _count: { id: true },
  })

  const grossRevenue = purchases._sum.amountPaid?.toNumber() ?? 0
  const platformFees = grossRevenue * 0.1  // Estimate 10% platform fee
  const totalPurchases = purchases._count.id

  return {
    success: true,
    data: {
      businessId: business.id,
      businessName: business.name,
      countyId: business.countyId ?? '',
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
    },
  }
}

/**
 * Get deal analytics for a vendor's deals.
 */
export async function getVendorDealsAnalytics(
  businessId: string,
  vendorId: string,
  timeframe: AnalyticsTimeframe
): Promise<AnalyticsResult<VendorDealAnalytics[]>> {
  const { startDate, endDate } = getTimeframeRange(timeframe)
  const dateFilter = startDate
    ? { createdAt: { gte: startDate, lte: endDate } }
    : {}

  // Verify vendor ownership
  const ownership = await prisma.vendorOwnership.findUnique({
    where: { userId: vendorId },
    select: { businessId: true },
  })

  if (!ownership || ownership.businessId !== businessId) {
    return { success: false, ...AnalyticsErrors.UNAUTHORIZED_ACCESS }
  }

  // Get all deals for the business
  const deals = await prisma.deal.findMany({
    where: { businessId },
    select: {
      id: true,
      title: true,
      dealStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get analytics for each deal
  const dealAnalytics: VendorDealAnalytics[] = await Promise.all(
    deals.map(async (deal) => {
      const [purchases, redemptions] = await Promise.all([
        prisma.voucher.count({
          where: { dealId: deal.id, ...dateFilter },
        }),
        prisma.voucher.count({
          where: { dealId: deal.id, status: 'REDEEMED', ...dateFilter },
        }),
      ])

      const revenue = await prisma.purchase.aggregate({
        where: { dealId: deal.id, status: 'COMPLETED', ...dateFilter },
        _sum: { amountPaid: true },
      })

      // Get last activity (Voucher uses issuedAt, not createdAt)
      const lastVoucher = await prisma.voucher.findFirst({
        where: { dealId: deal.id },
        orderBy: { issuedAt: 'desc' },
        select: { issuedAt: true },
      })

      const lastRedemption = await prisma.redemption.findFirst({
        where: { voucher: { dealId: deal.id } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })

      const lastActivity = lastRedemption?.createdAt ?? lastVoucher?.issuedAt ?? null

      return {
        dealId: deal.id,
        dealTitle: deal.title,
        status: deal.dealStatus,
        views: 0, // Would need view tracking
        purchases,
        redemptions,
        conversionRate: 0, // Would need view tracking
        redemptionRate: purchases > 0 ? (redemptions / purchases) * 100 : 0,
        revenue: revenue._sum.amountPaid?.toNumber() ?? 0,
        createdAt: deal.createdAt,
        lastActivity,
      }
    })
  )

  return {
    success: true,
    data: dealAnalytics,
  }
}

/**
 * Get a single deal's detailed analytics for a vendor.
 */
export async function getVendorSingleDealAnalytics(
  dealId: string,
  vendorId: string,
  timeframe: AnalyticsTimeframe
): Promise<AnalyticsResult<VendorDealAnalytics>> {
  const { startDate, endDate } = getTimeframeRange(timeframe)
  const dateFilter = startDate
    ? { createdAt: { gte: startDate, lte: endDate } }
    : {}

  // Get deal with business
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      title: true,
      dealStatus: true,
      createdAt: true,
      businessId: true,
    },
  })

  if (!deal) {
    return { success: false, ...AnalyticsErrors.DEAL_NOT_FOUND }
  }

  // Verify vendor ownership
  const ownership = await prisma.vendorOwnership.findUnique({
    where: { userId: vendorId },
    select: { businessId: true },
  })

  if (!ownership || ownership.businessId !== deal.businessId) {
    return { success: false, ...AnalyticsErrors.UNAUTHORIZED_ACCESS }
  }

  // Get metrics
  const [purchases, redemptions, revenue] = await Promise.all([
    prisma.voucher.count({
      where: { dealId: deal.id, ...dateFilter },
    }),
    prisma.voucher.count({
      where: { dealId: deal.id, status: 'REDEEMED', ...dateFilter },
    }),
    prisma.purchase.aggregate({
      where: { dealId: deal.id, status: 'COMPLETED', ...dateFilter },
      _sum: { amountPaid: true },
    }),
  ])

  // Get last activity
  const lastRedemption = await prisma.redemption.findFirst({
    where: { voucher: { dealId: deal.id } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  return {
    success: true,
    data: {
      dealId: deal.id,
      dealTitle: deal.title,
      status: deal.dealStatus,
      views: 0,
      purchases,
      redemptions,
      conversionRate: 0,
      redemptionRate: purchases > 0 ? (redemptions / purchases) * 100 : 0,
      revenue: revenue._sum.amountPaid?.toNumber() ?? 0,
      createdAt: deal.createdAt,
      lastActivity: lastRedemption?.createdAt ?? null,
    },
  }
}

/**
 * Get vendor revenue summary.
 */
export async function getVendorRevenueSummary(
  businessId: string,
  vendorId: string,
  timeframe: AnalyticsTimeframe
): Promise<AnalyticsResult<{
  gross: number
  platformFees: number
  net: number
  transactionCount: number
  averageTransaction: number
}>> {
  const { startDate, endDate } = getTimeframeRange(timeframe)
  const dateFilter = startDate
    ? { createdAt: { gte: startDate, lte: endDate } }
    : {}

  // Verify vendor ownership
  const ownership = await prisma.vendorOwnership.findUnique({
    where: { userId: vendorId },
    select: { businessId: true },
  })

  if (!ownership || ownership.businessId !== businessId) {
    return { success: false, ...AnalyticsErrors.UNAUTHORIZED_ACCESS }
  }

  const purchases = await prisma.purchase.aggregate({
    where: { deal: { businessId }, status: 'COMPLETED', ...dateFilter },
    _sum: { amountPaid: true },
    _count: { id: true },
  })

  const gross = purchases._sum.amountPaid?.toNumber() ?? 0
  const platformFees = gross * 0.1  // Estimate 10% platform fee
  const transactionCount = purchases._count.id

  return {
    success: true,
    data: {
      gross,
      platformFees,
      net: gross - platformFees,
      transactionCount,
      averageTransaction: transactionCount > 0 ? gross / transactionCount : 0,
    },
  }
}

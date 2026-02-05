/**
 * MODULE 7: Vendor Operations
 * GET /api/vendor/redemptions
 *
 * Purpose: View redemption history for vendor's business
 * Authorization:
 *   - VENDOR only
 * Rules:
 *   - Only returns redemptions for vendor's business
 *   - Read-only: redemptions are immutable
 *   - Includes deal and value information
 * Output:
 *   - Paginated redemption history with metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireVendorOwnership, authFailure } from '@/lib/identity'

export async function GET(request: NextRequest) {
  // GUARD: Vendor with business ownership (Module 1)
  const vendorResult = await requireVendorOwnership(request)
  if (!vendorResult.success) {
    return authFailure(vendorResult)
  }

  const { businessId } = vendorResult.data

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const skip = (page - 1) * limit

  // Optional filters
  const dealFilter = searchParams.get('dealId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const whereClause: {
    businessId: string
    dealId?: string
    redeemedAt?: { gte?: Date; lte?: Date }
  } = { businessId }

  if (dealFilter) {
    whereClause.dealId = dealFilter
  }

  if (startDate || endDate) {
    whereClause.redeemedAt = {}
    if (startDate) {
      whereClause.redeemedAt.gte = new Date(startDate)
    }
    if (endDate) {
      whereClause.redeemedAt.lte = new Date(endDate)
    }
  }

  // Fetch redemptions with deal info
  const [redemptions, totalCount] = await Promise.all([
    prisma.redemption.findMany({
      where: whereClause,
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            dealCategory: true,
          },
        },
        voucher: {
          select: {
            qrToken: true,
            issuedAt: true,
          },
        },
      },
      orderBy: { redeemedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.redemption.count({ where: whereClause }),
  ])

  const totalPages = Math.ceil(totalCount / limit)

  // Calculate summary metrics
  const summary = await prisma.redemption.aggregate({
    where: { businessId },
    _count: { id: true },
    _sum: { dealPrice: true },
  })

  // Get today's redemptions
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayCount = await prisma.redemption.count({
    where: {
      businessId,
      redeemedAt: { gte: today },
    },
  })

  // Get this week's redemptions
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekCount = await prisma.redemption.count({
    where: {
      businessId,
      redeemedAt: { gte: weekStart },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      redemptions: redemptions.map((r) => ({
        id: r.id,
        voucherId: r.voucherId,
        dealId: r.dealId,
        dealTitle: r.deal.title,
        dealCategory: r.deal.dealCategory,
        redeemedAt: r.redeemedAt,
        originalValue: r.originalValue?.toString() ?? null,
        dealPrice: r.dealPrice?.toString() ?? null,
        voucherIssuedAt: r.voucher.issuedAt,
        // Time from issuance to redemption (in hours)
        redemptionTime: r.voucher.issuedAt
          ? Math.round((r.redeemedAt.getTime() - r.voucher.issuedAt.getTime()) / (1000 * 60 * 60))
          : null,
      })),
      summary: {
        totalRedemptions: summary._count.id,
        totalRevenue: summary._sum.dealPrice?.toString() ?? '0',
        todayCount,
        weekCount,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    },
  })
}

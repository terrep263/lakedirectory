/**
 * MODULE 7: Vendor Operations
 * GET /api/vendor/deals
 *
 * Purpose: List deals for vendor's business
 * Authorization:
 *   - VENDOR only
 * Rules:
 *   - Only returns deals belonging to vendor's business
 *   - Includes voucher metrics per deal
 * Output:
 *   - Paginated list of deal summaries with status and metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VoucherStatus, DealStatus, Prisma } from '@prisma/client'
import { requireVendorOwnership, authFailure } from '@/lib/identity'

export async function GET(request: NextRequest) {
  // GUARD: Vendor with business ownership (Module 1)
  const vendorResult = await requireVendorOwnership(request)
  if (!vendorResult.success) {
    return authFailure(vendorResult)
  }

  const { businessId } = vendorResult.data

  // Parse pagination params
  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const skip = (page - 1) * limit

  // Filter by status if provided
  const statusFilter = searchParams.get('status')

  const whereClause: Prisma.DealWhereInput = { businessId }
  if (statusFilter && ['INACTIVE', 'ACTIVE', 'EXPIRED'].includes(statusFilter)) {
    whereClause.dealStatus = statusFilter as DealStatus
  }

  // Fetch deals with voucher counts
  const [deals, totalCount] = await Promise.all([
    prisma.deal.findMany({
      where: whereClause,
      include: {
        vouchers: {
          select: {
            status: true,
            expiresAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.deal.count({ where: whereClause }),
  ])

  const now = new Date()
  const totalPages = Math.ceil(totalCount / limit)

  // Map deals to summaries with metrics
  const dealsSummary = deals.map((deal) => {
    const vouchersIssued = deal.vouchers.filter((v) => v.status === VoucherStatus.ISSUED).length
    const vouchersAssigned = deal.vouchers.filter((v) => v.status === VoucherStatus.ASSIGNED).length
    const vouchersRedeemed = deal.vouchers.filter((v) => v.status === VoucherStatus.REDEEMED).length
    const vouchersExpired = deal.vouchers.filter(
      (v) => v.expiresAt && v.expiresAt < now && v.status !== VoucherStatus.REDEEMED
    ).length

    return {
      id: deal.id,
      title: deal.title,
      description: deal.description,
      dealCategory: deal.dealCategory,
      status: deal.dealStatus,
      originalValue: deal.originalValue?.toString() ?? null,
      dealPrice: deal.dealPrice?.toString() ?? null,
      voucherQuantityLimit: deal.voucherQuantityLimit,
      redemptionWindowStart: deal.redemptionWindowStart,
      redemptionWindowEnd: deal.redemptionWindowEnd,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
      // Voucher metrics
      metrics: {
        totalVouchers: deal.vouchers.length,
        issued: vouchersIssued,
        assigned: vouchersAssigned,
        redeemed: vouchersRedeemed,
        expired: vouchersExpired,
      },
    }
  })

  return NextResponse.json({
    success: true,
    data: dealsSummary,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  })
}

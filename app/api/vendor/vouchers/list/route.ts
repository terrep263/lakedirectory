/**
 * MODULE 7: Vendor Operations
 * GET /api/vendor/vouchers/list
 *
 * Purpose: View voucher inventory (read-only)
 * Authorization:
 *   - VENDOR only
 * Rules:
 *   - Only returns vouchers for vendor's business
 *   - Read-only: no direct voucher mutation
 *   - No QR tokens exposed (security)
 *   - No user identifiers exposed (privacy)
 * Output:
 *   - Paginated voucher list with status and deal info
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VoucherStatus } from '@prisma/client'
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

  // Filter by status if provided
  const statusFilter = searchParams.get('status')
  const dealFilter = searchParams.get('dealId')

  const whereClause: {
    businessId: string
    status?: VoucherStatus
    dealId?: string
  } = { businessId }

  if (statusFilter && ['ISSUED', 'ASSIGNED', 'REDEEMED'].includes(statusFilter)) {
    whereClause.status = statusFilter as VoucherStatus
  }

  if (dealFilter) {
    whereClause.dealId = dealFilter
  }

  // Query vouchers with read-only fields
  // NO QR tokens (security), NO user identifiers (privacy)
  const [vouchers, totalCount] = await Promise.all([
    prisma.voucher.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        issuedAt: true,
        expiresAt: true,
        redeemedAt: true,
        dealId: true,
        deal: {
          select: {
            title: true,
            dealStatus: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.voucher.count({ where: whereClause }),
  ])

  const totalPages = Math.ceil(totalCount / limit)
  const now = new Date()

  // Calculate summary by status
  const summary = await prisma.voucher.groupBy({
    by: ['status'],
    where: { businessId },
    _count: { status: true },
  })

  const statusCounts: Record<string, number> = {
    ISSUED: 0,
    ASSIGNED: 0,
    REDEEMED: 0,
  }

  for (const s of summary) {
    statusCounts[s.status] = s._count.status
  }

  return NextResponse.json({
    success: true,
    data: {
      vouchers: vouchers.map((v) => ({
        id: v.id,
        status: v.status,
        issuedAt: v.issuedAt,
        expiresAt: v.expiresAt,
        redeemedAt: v.redeemedAt,
        isExpired: v.expiresAt ? v.expiresAt < now : false,
        dealId: v.dealId,
        dealTitle: v.deal.title,
        dealStatus: v.deal.dealStatus,
      })),
      summary: {
        issued: statusCounts.ISSUED,
        assigned: statusCounts.ASSIGNED,
        redeemed: statusCounts.REDEEMED,
        total: statusCounts.ISSUED + statusCounts.ASSIGNED + statusCounts.REDEEMED,
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

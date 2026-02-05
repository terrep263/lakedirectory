/**
 * MODULE 5: Redemption Enforcement
 * GET /api/redemption/:voucherId
 *
 * Purpose: Retrieve redemption record
 * Authorization:
 *   - Owning USER (via voucher.accountId)
 *   - Owning VENDOR (business owner)
 *   - ADMIN
 * Output:
 *   - Redemption record with voucher and deal info
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canViewRedemption, redemptionFailure, RedemptionErrors } from '@/lib/redemption'

interface RouteContext {
  params: Promise<{ voucherId: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { voucherId } = await context.params

  if (!voucherId || typeof voucherId !== 'string') {
    return NextResponse.json(
      { error: 'Voucher ID is required' },
      { status: 400 }
    )
  }

  // Check if caller can view this redemption
  const authResult = await canViewRedemption(request, voucherId)
  if (!authResult.success) {
    return redemptionFailure(authResult)
  }

  // Fetch full redemption details
  const redemption = await prisma.redemption.findUnique({
    where: { voucherId },
    include: {
      voucher: {
        select: {
          id: true,
          qrToken: true,
          status: true,
          issuedAt: true,
          expiresAt: true,
        },
      },
      deal: {
        select: {
          id: true,
          title: true,
          description: true,
          dealCategory: true,
        },
      },
      vendor: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  })

  if (!redemption) {
    return redemptionFailure(RedemptionErrors.REDEMPTION_NOT_FOUND)
  }

  // Fetch business info
  const business = await prisma.business.findUnique({
    where: { id: redemption.businessId },
    select: {
      id: true,
      name: true,
      category: true,
      city: true,
      state: true,
    },
  })

  return NextResponse.json({
    redemption: {
      id: redemption.id,
      voucherId: redemption.voucherId,
      dealId: redemption.dealId,
      businessId: redemption.businessId,
      redeemedAt: redemption.redeemedAt,
      createdAt: redemption.createdAt,
      originalValue: redemption.originalValue?.toString(),
      dealPrice: redemption.dealPrice?.toString(),
      savings: redemption.originalValue && redemption.dealPrice
        ? (Number(redemption.originalValue) - Number(redemption.dealPrice)).toFixed(2)
        : null,
    },
    voucher: {
      id: redemption.voucher.id,
      qrToken: redemption.voucher.qrToken,
      status: redemption.voucher.status,
      issuedAt: redemption.voucher.issuedAt,
      expiresAt: redemption.voucher.expiresAt,
    },
    deal: {
      id: redemption.deal.id,
      title: redemption.deal.title,
      description: redemption.deal.description,
      category: redemption.deal.dealCategory,
    },
    business: business
      ? {
          id: business.id,
          name: business.name,
          category: business.category,
          city: business.city,
          state: business.state,
        }
      : null,
    redeemedBy: {
      id: redemption.vendor.id,
      email: redemption.vendor.email,
    },
  })
}

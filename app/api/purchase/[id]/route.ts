/**
 * MODULE 6: User Purchase Flow
 * GET /api/purchase/:id
 *
 * Purpose: Retrieve a purchase record
 * Authorization:
 *   - Owning USER (purchase.userId matches caller)
 *   - ADMIN (can view any purchase)
 * Rules:
 *   - Purchase must exist
 *   - Non-owners receive 404 (hide existence)
 * Output:
 *   - Purchase record with voucher and deal details
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canViewPurchase, purchaseFailure } from '@/lib/purchase'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id: purchaseId } = await params

  if (!purchaseId || typeof purchaseId !== 'string') {
    return NextResponse.json(
      { error: 'Purchase ID is required' },
      { status: 400 }
    )
  }

  // GUARD: Verify caller can view this purchase
  const viewResult = await canViewPurchase(request, purchaseId)
  if (!viewResult.success) {
    return purchaseFailure(viewResult)
  }

  const { purchase } = viewResult.data

  // Fetch related voucher and deal data
  const fullPurchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      voucher: true,
      deal: {
        include: {
          business: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      },
    },
  })

  if (!fullPurchase) {
    return NextResponse.json(
      { error: 'Purchase not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    purchase: {
      id: purchase.id,
      userId: purchase.userId,
      dealId: purchase.dealId,
      voucherId: purchase.voucherId,
      amountPaid: purchase.amountPaid,
      paymentProvider: purchase.paymentProvider,
      paymentIntentId: purchase.paymentIntentId,
      status: purchase.status,
      createdAt: purchase.createdAt,
    },
    voucher: {
      id: fullPurchase.voucher.id,
      qrToken: fullPurchase.voucher.qrToken,
      status: fullPurchase.voucher.status,
      issuedAt: fullPurchase.voucher.issuedAt,
      expiresAt: fullPurchase.voucher.expiresAt,
      redeemedAt: fullPurchase.voucher.redeemedAt,
    },
    deal: {
      id: fullPurchase.deal.id,
      title: fullPurchase.deal.title,
      description: fullPurchase.deal.description,
      originalValue: fullPurchase.deal.originalValue?.toString() ?? null,
      dealPrice: fullPurchase.deal.dealPrice?.toString() ?? null,
      redemptionWindowStart: fullPurchase.deal.redemptionWindowStart,
      redemptionWindowEnd: fullPurchase.deal.redemptionWindowEnd,
      status: fullPurchase.deal.dealStatus,
    },
    business: fullPurchase.deal.business,
  })
}

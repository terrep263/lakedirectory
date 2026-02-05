/**
 * MODULE 3: Deal Definition
 * POST /api/deals/:id/activate
 *
 * Purpose: Activate a deal
 * Authorization:
 *   - ADMIN only
 * Rules:
 *   - Business must be ACTIVE
 *   - All required fields validated
 *   - Status set to ACTIVE
 * Output: Activated deal
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authFailure } from '@/lib/identity'
import { canActivateDeal, dealFailure, DealErrors } from '@/lib/deal'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  // HARD ENFORCEMENT: Only ADMIN can activate
  const authResult = await requireAdmin(request)
  if (!authResult.success) {
    return authFailure(authResult)
  }

  const identity = authResult.data

  const { id } = await context.params

  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { error: 'Deal ID is required' },
      { status: 400 }
    )
  }

  // Check if deal can be activated
  const canActivate = await canActivateDeal(identity, id)
  if (!canActivate.success) {
    return dealFailure(canActivate)
  }

  // Activate the deal
  const deal = await prisma.deal.update({
    where: { id },
    data: {
      dealStatus: 'ACTIVE',
      isActive: true, // Legacy field sync
    },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          category: true,
          city: true,
          state: true,
        },
      },
    },
  })

  return NextResponse.json({
    deal: {
      id: deal.id,
      businessId: deal.businessId,
      title: deal.title,
      description: deal.description,
      category: deal.dealCategory,
      originalValue: deal.originalValue?.toString(),
      dealPrice: deal.dealPrice?.toString(),
      redemptionWindowStart: deal.redemptionWindowStart,
      redemptionWindowEnd: deal.redemptionWindowEnd,
      voucherQuantityLimit: deal.voucherQuantityLimit,
      status: deal.dealStatus,
      previousStatus: 'INACTIVE',
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
      business: {
        id: deal.business.id,
        name: deal.business.name,
        category: deal.business.category,
        city: deal.business.city,
        state: deal.business.state,
      },
    },
    activatedBy: identity.id,
    activatedAt: new Date().toISOString(),
  })
}

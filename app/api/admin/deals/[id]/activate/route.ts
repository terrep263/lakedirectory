/**
 * MODULE 8: Admin Operations
 * POST /api/admin/deals/:id/activate
 *
 * Purpose: Activate a deal (transition from INACTIVE to ACTIVE)
 * Authorization:
 *   - ADMIN only
 * Rules:
 *   - Deal must be INACTIVE
 *   - Business must be ACTIVE
 *   - All required fields must be present
 *   - Action is logged to audit trail
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DealStatus } from '@prisma/client'
import {
  requireAdminContext,
  adminFailure,
  canActivateDeal,
  logAdminActionInTransaction,
} from '@/lib/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params

  // GUARD: Admin only (Module 8)
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) {
    return adminFailure(adminResult)
  }

  const admin = adminResult.data

  // GUARD: Can activate deal
  const canActivate = await canActivateDeal(dealId)
  if (!canActivate.success) {
    return adminFailure(canActivate)
  }

  const { deal } = canActivate.data

  // ATOMIC: Activate deal and log action
  const result = await prisma.$transaction(async (tx) => {
    // Update deal status
    const updatedDeal = await tx.deal.update({
      where: { id: dealId },
      data: {
        dealStatus: DealStatus.ACTIVE,
      },
      select: {
        id: true,
        title: true,
        businessId: true,
        dealStatus: true,
        updatedAt: true,
        business: {
          select: { name: true },
        },
      },
    })

    // Log admin action
    await logAdminActionInTransaction(
      tx,
      admin.id,
      'DEAL_ACTIVATED',
      'DEAL',
      dealId,
      {
        previousStatus: DealStatus.INACTIVE,
        newStatus: DealStatus.ACTIVE,
        dealTitle: deal.title,
        businessId: deal.businessId,
      }
    )

    return updatedDeal
  })

  return NextResponse.json({
    success: true,
    data: {
      dealId: result.id,
      title: result.title,
      previousStatus: DealStatus.INACTIVE,
      newStatus: result.dealStatus,
      activatedAt: result.updatedAt,
      businessName: result.business.name,
    },
  })
}

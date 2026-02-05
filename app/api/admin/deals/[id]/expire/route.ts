/**
 * MODULE 8: Admin Operations
 * POST /api/admin/deals/:id/expire
 *
 * Purpose: Expire a deal (transition from ACTIVE to EXPIRED)
 * Authorization:
 *   - ADMIN only
 * Rules:
 *   - Deal must be ACTIVE
 *   - Action is logged to audit trail
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DealStatus } from '@prisma/client'
import {
  requireAdminContext,
  adminFailure,
  logAdminActionInTransaction,
} from '@/lib/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params

  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) {
    return adminFailure(adminResult)
  }

  const admin = adminResult.data

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { id: true, title: true, dealStatus: true, businessId: true },
  })

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  if (deal.dealStatus !== DealStatus.ACTIVE) {
    return NextResponse.json({ error: 'Deal must be ACTIVE to expire' }, { status: 409 })
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.deal.update({
      where: { id: dealId },
      data: { dealStatus: DealStatus.EXPIRED },
      select: { id: true, dealStatus: true, updatedAt: true },
    })

    await logAdminActionInTransaction(tx, admin.id, 'DEAL_EXPIRED', 'DEAL', dealId, {
      previousStatus: DealStatus.ACTIVE,
      newStatus: DealStatus.EXPIRED,
      dealTitle: deal.title,
      businessId: deal.businessId,
    })

    return updated
  })

  return NextResponse.json({
    success: true,
    data: {
      dealId: result.id,
      previousStatus: DealStatus.ACTIVE,
      newStatus: result.dealStatus,
      expiredAt: result.updatedAt,
    },
  })
}


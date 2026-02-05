/**
 * MODULE 8: Admin Operations
 * POST /api/admin/founders/remove
 *
 * Purpose: Remove founder status from a business
 * Authorization:
 *   - ADMIN only
 * Rules:
 *   - Business must have active founder status
 *   - Does not delete record, marks as inactive
 *   - Action is logged to audit trail
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireAdminContext,
  adminFailure,
  canRemoveFounder,
  logAdminActionInTransaction,
} from '@/lib/admin'

export async function POST(request: NextRequest) {
  // GUARD: Admin only (Module 8)
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) {
    return adminFailure(adminResult)
  }

  const admin = adminResult.data

  // Parse request body
  let body: { businessId: string; reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { businessId, reason } = body

  if (!businessId || typeof businessId !== 'string') {
    return NextResponse.json(
      { error: 'businessId is required' },
      { status: 400 }
    )
  }

  // GUARD: Can remove founder status
  const canRemove = await canRemoveFounder(businessId)
  if (!canRemove.success) {
    return adminFailure(canRemove)
  }

  const { founderStatus: existing } = canRemove.data

  // Get business name for logging
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true },
  })

  // ATOMIC: Remove founder status and log action
  const result = await prisma.$transaction(async (tx) => {
    // Mark as inactive (soft delete)
    const founderStatus = await tx.founderStatus.update({
      where: { businessId },
      data: {
        isActive: false,
        removedAt: new Date(),
        removedBy: admin.id,
      },
    })

    // Log admin action
    await logAdminActionInTransaction(
      tx,
      admin.id,
      'FOUNDER_REMOVED',
      'FOUNDER_STATUS',
      founderStatus.id,
      {
        businessId,
        businessName: business?.name || 'Unknown',
        reason: reason || null,
        grantedAt: existing.grantedAt.toISOString(),
        durationDays: Math.floor(
          (Date.now() - existing.grantedAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }
    )

    return founderStatus
  })

  return NextResponse.json({
    success: true,
    data: {
      founderStatusId: result.id,
      businessId: result.businessId,
      businessName: business?.name,
      removedAt: result.removedAt,
      isActive: result.isActive,
    },
  })
}

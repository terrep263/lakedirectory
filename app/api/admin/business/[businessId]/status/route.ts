/**
 * MODULE 8: Admin Operations
 * POST /api/admin/business/[businessId]/status
 *
 * Purpose: Change business status (lifecycle management)
 * Authorization:
 *   - ADMIN only
 * Rules:
 *   - Enforce lifecycle transitions only (DRAFT→ACTIVE, ACTIVE→SUSPENDED, SUSPENDED→ACTIVE)
 *   - Action is logged to audit trail
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BusinessStatus } from '@prisma/client'
import {
  requireAdminContext,
  adminFailure,
  canChangeBusinessStatus,
  logAdminActionInTransaction,
  AdminErrors,
} from '@/lib/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params

  // GUARD: Admin only (Module 8)
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) {
    return adminFailure(adminResult)
  }

  const admin = adminResult.data

  // Parse request body
  let body: { status: string; reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  // Validate status
  const { status, reason } = body
  if (!status || !['DRAFT', 'ACTIVE', 'SUSPENDED'].includes(status)) {
    return NextResponse.json(
      { error: 'Invalid status. Must be DRAFT, ACTIVE, or SUSPENDED' },
      { status: 400 }
    )
  }

  const newStatus = status as BusinessStatus

  // GUARD: Can change business status
  const canChange = await canChangeBusinessStatus(businessId, newStatus)
  if (!canChange.success) {
    return adminFailure(canChange)
  }

  const { business } = canChange.data
  const previousStatus = business.currentStatus

  // Determine action type
  let actionType: 'BUSINESS_ACTIVATED' | 'BUSINESS_SUSPENDED' | 'BUSINESS_REINSTATED'
  if (newStatus === BusinessStatus.ACTIVE && previousStatus === BusinessStatus.DRAFT) {
    actionType = 'BUSINESS_ACTIVATED'
  } else if (newStatus === BusinessStatus.ACTIVE && previousStatus === BusinessStatus.SUSPENDED) {
    actionType = 'BUSINESS_REINSTATED'
  } else if (newStatus === BusinessStatus.SUSPENDED) {
    actionType = 'BUSINESS_SUSPENDED'
  } else {
    return NextResponse.json(
      { error: AdminErrors.INVALID_BUSINESS_TRANSITION.error },
      { status: AdminErrors.INVALID_BUSINESS_TRANSITION.status }
    )
  }

  // ATOMIC: Update status and log action
  const result = await prisma.$transaction(async (tx) => {
    // Update business status
    const updatedBusiness = await tx.business.update({
      where: { id: businessId },
      data: {
        businessStatus: newStatus,
      },
      select: {
        id: true,
        name: true,
        businessStatus: true,
        updatedAt: true,
      },
    })

    // Log admin action
    await logAdminActionInTransaction(
      tx,
      admin.id,
      actionType,
      'BUSINESS',
      businessId,
      {
        previousStatus,
        newStatus,
        businessName: business.name,
        reason: reason || null,
      }
    )

    return updatedBusiness
  })

  return NextResponse.json({
    success: true,
    data: {
      businessId: result.id,
      name: result.name,
      previousStatus,
      newStatus: result.businessStatus,
      changedAt: result.updatedAt,
      action: actionType,
    },
  })
}

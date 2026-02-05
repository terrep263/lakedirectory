/**
 * MODULE 8: Admin Operations
 * POST /api/admin/founders/assign
 *
 * Purpose: Assign founder status to a business
 * Authorization:
 *   - ADMIN only (with county access)
 * Rules:
 *   - Business must not already have active founder status
 *   - Optional expiration date
 *   - Action is logged to audit trail
 *   - County-scoped operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireAdminContext,
  adminFailure,
  canAssignFounder,
  logAdminActionInTransaction,
} from '@/lib/admin'
import {
  requireAdminCountyAccess,
  countyFailure,
} from '@/lib/county'

export async function POST(request: NextRequest) {
  // GUARD: Admin with county access
  const countyResult = await requireAdminCountyAccess(request)
  if (!countyResult.success) {
    return countyFailure(countyResult)
  }

  const adminCtx = countyResult.data

  // Require active county context
  if (!('activeCounty' in adminCtx)) {
    return NextResponse.json(
      { error: 'County context required for this operation' },
      { status: 400 }
    )
  }

  const countyId = adminCtx.activeCounty.id
  const admin = adminCtx

  // Parse request body
  let body: { businessId: string; expiresAt?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { businessId, expiresAt } = body

  if (!businessId || typeof businessId !== 'string') {
    return NextResponse.json(
      { error: 'businessId is required' },
      { status: 400 }
    )
  }

  // Parse expiration date if provided
  let expirationDate: Date | null = null
  if (expiresAt) {
    expirationDate = new Date(expiresAt)
    if (isNaN(expirationDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid expiresAt date format' },
        { status: 400 }
      )
    }
    if (expirationDate <= new Date()) {
      return NextResponse.json(
        { error: 'expiresAt must be in the future' },
        { status: 400 }
      )
    }
  }

  // GUARD: Can assign founder status
  const canAssign = await canAssignFounder(businessId)
  if (!canAssign.success) {
    return adminFailure(canAssign)
  }

  const { business } = canAssign.data

  // ATOMIC: Create founder status and log action
  const result = await prisma.$transaction(async (tx) => {
    // Check if there's an inactive founder status to update
    const existingFounder = await tx.founderStatus.findUnique({
      where: { businessId },
    })

    let founderStatus
    if (existingFounder) {
      // Reactivate existing record
      founderStatus = await tx.founderStatus.update({
        where: { businessId },
        data: {
          isActive: true,
          grantedAt: new Date(),
          grantedBy: admin.id,
          expiresAt: expirationDate,
          removedAt: null,
          removedBy: null,
        },
      })
    } else {
      // Create new founder status
      founderStatus = await tx.founderStatus.create({
        data: {
          businessId,
          grantedBy: admin.id,
          expiresAt: expirationDate,
          countyId, // County-scoped
        },
      })
    }

    // Log admin action
    await logAdminActionInTransaction(
      tx,
      admin.id,
      'FOUNDER_ASSIGNED',
      'FOUNDER_STATUS',
      founderStatus.id,
      {
        businessId,
        businessName: business.name,
        expiresAt: expirationDate?.toISOString() || null,
        reactivated: !!existingFounder,
      }
    )

    return founderStatus
  })

  return NextResponse.json({
    success: true,
    data: {
      founderStatusId: result.id,
      businessId: result.businessId,
      businessName: business.name,
      grantedAt: result.grantedAt,
      expiresAt: result.expiresAt,
      isActive: result.isActive,
    },
  })
}

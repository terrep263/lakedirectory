/**
 * MODULE 2: Business Record (Source of Truth)
 * PATCH /api/business/:businessId/status
 *
 * Purpose: Change business lifecycle state
 * Authorization:
 *   - ADMIN only
 * Rules:
 *   - Allowed transitions:
 *     DRAFT → ACTIVE
 *     ACTIVE → SUSPENDED
 *     SUSPENDED → ACTIVE
 *   - Activation requires minimum fields (name, category)
 * Output: Updated Business record
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BusinessStatus } from '@prisma/client'
import { requireAdmin, authFailure } from '@/lib/identity'
import {
  BusinessErrors,
  businessFailure,
  isValidStatusTransition,
} from '@/lib/business'

interface RouteContext {
  params: Promise<{ businessId: string }>
}

interface StatusUpdateRequest {
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED'
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  // HARD ENFORCEMENT: Only ADMIN can change status
  const authResult = await requireAdmin(request)
  if (!authResult.success) {
    return authFailure(authResult)
  }

  const { businessId } = await context.params

  if (!businessId || typeof businessId !== 'string') {
    return NextResponse.json(
      { error: 'Business ID is required' },
      { status: 400 }
    )
  }

  // Parse input
  let body: StatusUpdateRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { status: newStatus } = body

  // Validate status value
  if (!newStatus || !['DRAFT', 'ACTIVE', 'SUSPENDED'].includes(newStatus)) {
    return NextResponse.json(
      { error: 'Status must be DRAFT, ACTIVE, or SUSPENDED' },
      { status: 400 }
    )
  }

  // Fetch the business
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  })

  if (!business) {
    return businessFailure(BusinessErrors.BUSINESS_NOT_FOUND)
  }

  const currentStatus = business.businessStatus

  // Check if transition is allowed
  if (!isValidStatusTransition(currentStatus, newStatus as BusinessStatus)) {
    return NextResponse.json(
      {
        error: BusinessErrors.INVALID_STATUS_TRANSITION.error,
        details: `Cannot transition from ${currentStatus} to ${newStatus}`,
        allowedTransitions: {
          DRAFT: ['ACTIVE'],
          ACTIVE: ['SUSPENDED'],
          SUSPENDED: ['ACTIVE'],
        },
      },
      { status: BusinessErrors.INVALID_STATUS_TRANSITION.status }
    )
  }

  // If activating, verify required fields
  if (newStatus === 'ACTIVE') {
    const missingFields: string[] = []

    if (!business.name || business.name.trim().length === 0) {
      missingFields.push('name')
    }
    if (!business.category || business.category.trim().length === 0) {
      missingFields.push('category')
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: BusinessErrors.MISSING_REQUIRED_FIELDS.error,
          missingFields,
        },
        { status: BusinessErrors.MISSING_REQUIRED_FIELDS.status }
      )
    }
  }

  // Update status
  const updatedBusiness = await prisma.business.update({
    where: { id: businessId },
    data: {
      businessStatus: newStatus as BusinessStatus,
    },
  })

  return NextResponse.json({
    business: {
      id: updatedBusiness.id,
      name: updatedBusiness.name,
      status: updatedBusiness.businessStatus,
      previousStatus: currentStatus,
      ownerUserId: updatedBusiness.ownerUserId,
      updatedAt: updatedBusiness.updatedAt,
    },
    updatedBy: authResult.data.id,
    transition: {
      from: currentStatus,
      to: newStatus,
    },
  })
}

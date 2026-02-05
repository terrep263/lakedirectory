/**
 * MODULE 2: Business Record (Source of Truth)
 * POST /api/business/claim
 *
 * Purpose: Bind an existing business to a vendor
 * Authorization:
 *   - VENDOR only
 * Rules:
 *   - Business must exist
 *   - Business must not already have an owner
 *   - Vendor must not already own a business
 *   - Ownership binding is PERMANENT
 * Output: Updated Business record
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, authFailure, IdentityRole } from '@/lib/identity'
import { canClaimBusiness, businessFailure, BusinessErrors } from '@/lib/business'

interface ClaimBusinessRequest {
  businessId: string
}

export async function POST(request: NextRequest) {
  // HARD ENFORCEMENT: Only VENDOR can claim
  const authResult = await requireRole(request, IdentityRole.VENDOR)
  if (!authResult.success) {
    return authFailure(authResult)
  }

  const identity = authResult.data

  // Parse input
  let body: ClaimBusinessRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { businessId } = body

  if (!businessId || typeof businessId !== 'string') {
    return NextResponse.json(
      { error: 'businessId is required' },
      { status: 400 }
    )
  }

  // Check if claim is allowed
  const canClaim = await canClaimBusiness(businessId, identity.id)
  if (!canClaim.success) {
    return businessFailure(canClaim)
  }

  // Claim the business - PERMANENT binding
  const business = await prisma.business.update({
    where: { id: businessId },
    data: {
      ownerUserId: identity.id,
    },
  })

  return NextResponse.json(
    {
      business: {
        id: business.id,
        name: business.name,
        description: business.description,
        category: business.category,
        status: business.businessStatus,
        ownerUserId: business.ownerUserId,
        addressLine1: business.addressLine1,
        addressLine2: business.addressLine2,
        city: business.city,
        state: business.state,
        postalCode: business.postalCode,
        phone: business.phone,
        website: business.website,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt,
      },
      claimedBy: identity.id,
      claimedAt: new Date().toISOString(),
    },
    { status: 200 }
  )
}

/**
 * MODULE 2: Business Record (Source of Truth)
 * GET /api/business/:businessId
 *
 * Purpose: Retrieve a business record
 * Authorization:
 *   - Public read if ACTIVE
 *   - Owner or ADMIN if DRAFT/SUSPENDED
 * Output: Business record
 *
 * DELETE /api/business/:businessId
 * Purpose: BLOCKED - businesses cannot be deleted
 * Always returns 405
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BusinessStatus } from '@prisma/client'
import { authenticateIdentity, IdentityRole } from '@/lib/identity'
import { BusinessErrors, businessFailure } from '@/lib/business'

interface RouteContext {
  params: Promise<{ businessId: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { businessId } = await context.params

  if (!businessId || typeof businessId !== 'string') {
    return NextResponse.json(
      { error: 'Business ID is required' },
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

  // If ACTIVE, allow public access
  if (business.businessStatus === BusinessStatus.ACTIVE) {
    return NextResponse.json({
      business: formatBusinessResponse(business),
    })
  }

  // For DRAFT or SUSPENDED, require authentication
  const authResult = await authenticateIdentity(request)

  if (!authResult.success) {
    // Not authenticated and business is not active
    return businessFailure(BusinessErrors.BUSINESS_NOT_FOUND) // Hide existence
  }

  const identity = authResult.data

  // Allow access if ADMIN or owner
  const isAdmin = identity.role === IdentityRole.ADMIN
  const isOwner = business.ownerUserId === identity.id

  if (!isAdmin && !isOwner) {
    // Not authorized to view non-active business
    return businessFailure(BusinessErrors.BUSINESS_NOT_FOUND) // Hide existence
  }

  return NextResponse.json({
    business: formatBusinessResponse(business),
  })
}

/**
 * DELETE is BLOCKED - businesses cannot be deleted
 */
export async function DELETE() {
  return NextResponse.json(
    { error: BusinessErrors.DELETE_NOT_ALLOWED.error },
    { status: BusinessErrors.DELETE_NOT_ALLOWED.status }
  )
}

/**
 * Format business for API response
 */
function formatBusinessResponse(business: {
  id: string
  name: string
  description: string | null
  category: string | null
  businessStatus: BusinessStatus
  ownerUserId: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  website: string | null
  logoUrl: string | null
  coverUrl: string | null
  hours: unknown
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: business.id,
    name: business.name,
    description: business.description,
    category: business.category,
    status: business.businessStatus,
    ownerUserId: business.ownerUserId,
    address: {
      line1: business.addressLine1,
      line2: business.addressLine2,
      city: business.city,
      state: business.state,
      postalCode: business.postalCode,
      latitude: business.latitude,
      longitude: business.longitude,
    },
    contact: {
      phone: business.phone,
      website: business.website,
    },
    media: {
      logoUrl: business.logoUrl,
      coverUrl: business.coverUrl,
    },
    hours: business.hours,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
  }
}

/**
 * MODULE 2: Business Record (Source of Truth)
 * POST /api/business/create
 *
 * Purpose: Create a new business (ADMIN and System Import only)
 * Authorization:
 *   - ADMIN only (manual edge cases)
 *   - System import processes (bulk import)
 * Rules:
 *   - VENDOR role is FORBIDDEN (vendors claim existing businesses)
 *   - All businesses created with ownerUserId = null (unclaimed)
 *   - Business is created with status = DRAFT (ADMIN) or OPERATIONAL (import)
 * Output: Business record
 * Security: Logs rejected VENDOR attempts as security events
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  authenticateIdentity,
  authFailure,
  IdentityRole,
} from '@/lib/identity'
import {
  BusinessErrors,
  type CreateBusinessInput,
} from '@/lib/business'

export async function POST(request: NextRequest) {
  // Authenticate the caller
  const authResult = await authenticateIdentity(request)
  if (!authResult.success) {
    return authFailure(authResult)
  }

  const identity = authResult.data

  // HARD ENFORCEMENT: Only ADMIN can create businesses
  // VENDOR role is FORBIDDEN - vendors must claim existing businesses
  if (identity.role === IdentityRole.VENDOR) {
    // SECURITY AUDIT: Log rejected vendor attempt to create business
    console.error('[SECURITY_AUDIT] Vendor attempted to create business', {
      event: 'VENDOR_CREATE_BUSINESS_REJECTED',
      vendorId: identity.id,
      timestamp: new Date().toISOString(),
      severity: 'MEDIUM',
      message: 'Vendor attempted to create business instead of claiming existing business',
    })

    return NextResponse.json(
      {
        error: 'Vendors cannot create businesses. Businesses are created through bulk import and must be claimed via /api/business/claim',
        action: 'Use the claim flow to bind to an existing business'
      },
      { status: 403 }
    )
  }

  // HARD ENFORCEMENT: USER cannot create businesses
  if (identity.role === IdentityRole.USER) {
    return NextResponse.json(
      { error: BusinessErrors.USER_CANNOT_CREATE_BUSINESS.error },
      { status: BusinessErrors.USER_CANNOT_CREATE_BUSINESS.status }
    )
  }

  // Parse and validate input
  let body: CreateBusinessInput

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  // Validate required fields
  const { name, category } = body

  if (typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    )
  }

  if (typeof category !== 'string' || category.trim().length === 0) {
    return NextResponse.json(
      { error: 'Category is required' },
      { status: 400 }
    )
  }

  // INVARIANT: All businesses created with ownerUserId = null (unclaimed)
  // ADMIN creates unowned businesses for manual edge cases
  // System import processes create unclaimed businesses in bulk
  const ownerUserId: string | null = null

  // Create the business with DRAFT status (ADMIN manual creation)
  const business = await prisma.business.create({
    data: {
      name: name.trim(),
      description: body.description?.trim() || null,
      category: category.trim(),
      addressLine1: body.addressLine1?.trim() || null,
      addressLine2: body.addressLine2?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      postalCode: body.postalCode?.trim() || null,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      phone: body.phone?.trim() || null,
      website: body.website?.trim() || null,
      ownerUserId,
      businessStatus: 'DRAFT',
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
        latitude: business.latitude,
        longitude: business.longitude,
        phone: business.phone,
        website: business.website,
        createdAt: business.createdAt,
      },
      createdBy: identity.id,
    },
    { status: 201 }
  )
}

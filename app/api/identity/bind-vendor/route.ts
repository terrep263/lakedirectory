/**
 * MODULE 1: Identity & Ownership
 * POST /api/identity/bind-vendor
 *
 * Purpose: Bind a VENDOR identity to a business
 * Input: userId, businessId
 * Rules:
 *   - UserIdentity.role must be VENDOR
 *   - VendorOwnership must not already exist for this user
 *   - Business must exist
 *   - Binding is PERMANENT
 * Output: VendorOwnership record
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authFailure, IdentityRole, IdentityErrors } from '@/lib/identity'

interface BindVendorRequest {
  userId: string
  businessId: string
}

export async function POST(request: NextRequest) {
  // HARD ENFORCEMENT: Only ADMIN can bind vendors to businesses
  // This is an administrative action, not self-service
  const authResult = await requireAdmin(request)
  if (!authResult.success) {
    return authFailure(authResult)
  }

  let body: BindVendorRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { userId, businessId } = body

  // Validate required fields
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    )
  }

  if (!businessId || typeof businessId !== 'string') {
    return NextResponse.json(
      { error: 'businessId is required' },
      { status: 400 }
    )
  }

  // Fetch the identity
  const identity = await prisma.userIdentity.findUnique({
    where: { id: userId },
    include: { vendorOwnership: true },
  })

  if (!identity) {
    return NextResponse.json(
      { error: 'Identity not found' },
      { status: 404 }
    )
  }

  // HARD ENFORCEMENT: Role must be VENDOR
  if (identity.role === IdentityRole.USER) {
    return NextResponse.json(
      { error: IdentityErrors.USER_CANNOT_BIND.error },
      { status: IdentityErrors.USER_CANNOT_BIND.status }
    )
  }

  if (identity.role === IdentityRole.ADMIN) {
    return NextResponse.json(
      { error: IdentityErrors.ADMIN_CANNOT_BIND.error },
      { status: IdentityErrors.ADMIN_CANNOT_BIND.status }
    )
  }

  // HARD ENFORCEMENT: Cannot bind twice (permanent binding)
  if (identity.vendorOwnership) {
    return NextResponse.json(
      { error: IdentityErrors.VENDOR_ALREADY_BOUND.error },
      { status: IdentityErrors.VENDOR_ALREADY_BOUND.status }
    )
  }

  // Verify business exists
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  })

  if (!business) {
    return NextResponse.json(
      { error: 'Business not found' },
      { status: 404 }
    )
  }

  // Check if business is already bound to another vendor
  const existingBinding = await prisma.vendorOwnership.findUnique({
    where: { businessId },
  })

  if (existingBinding) {
    return NextResponse.json(
      { error: 'Business is already bound to another vendor' },
      { status: 409 }
    )
  }

  // Create permanent binding
  const ownership = await prisma.vendorOwnership.create({
    data: {
      userId,
      businessId,
    },
  })

  return NextResponse.json(
    {
      ownership: {
        id: ownership.id,
        userId: ownership.userId,
        businessId: ownership.businessId,
        createdAt: ownership.createdAt,
      },
      boundBy: authResult.data.id,
    },
    { status: 201 }
  )
}

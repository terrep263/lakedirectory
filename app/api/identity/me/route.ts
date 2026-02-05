/**
 * MODULE 1: Identity & Ownership
 * GET /api/identity/me
 *
 * Purpose: Return the caller's identity and permissions
 * Output:
 *   - id
 *   - email
 *   - role
 *   - status
 *   - businessId (if vendor with ownership)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateIdentity, authFailure, IdentityRole } from '@/lib/identity'

export async function GET(request: NextRequest) {
  // Authenticate the request
  const authResult = await authenticateIdentity(request)
  if (!authResult.success) {
    return authFailure(authResult)
  }

  const identity = authResult.data

  // Build response based on role
  const response: {
    id: string
    email: string
    role: IdentityRole
    status: string
    businessId?: string
  } = {
    id: identity.id,
    email: identity.email,
    role: identity.role,
    status: identity.status,
  }

  // If VENDOR, include businessId from ownership
  if (identity.role === IdentityRole.VENDOR) {
    const ownership = await prisma.vendorOwnership.findUnique({
      where: { userId: identity.id },
    })

    if (ownership) {
      response.businessId = ownership.businessId
    }
  }

  return NextResponse.json(response, { status: 200 })
}

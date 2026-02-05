import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { verifyIdentityToken } from '@/lib/identity/token'
import { IdentityRole } from '@/lib/identity/types'

export interface VendorAuthResult {
  accountId: string
  businessId: string
  email: string
  isVerified: boolean
}

export async function authenticateVendor(
  request: NextRequest
): Promise<{ success: true; vendor: VendorAuthResult } | { success: false; response: NextResponse }> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const token = authHeader.substring(7)
  // Prefer identity tokens (Module 1); fall back to legacy vendor token
  const identity = verifyIdentityToken(token)

  if (identity && identity.role === IdentityRole.VENDOR) {
    const ownership = await prisma.vendorOwnership.findUnique({
      where: { userId: identity.sub },
    })

    if (!ownership) {
      return {
        success: false,
        response: NextResponse.json({ error: 'No business claimed' }, { status: 403 }),
      }
    }

    const business = await prisma.business.findUnique({
      where: { id: ownership.businessId },
      select: { id: true, isVerified: true },
    })

    if (!business) {
      return {
        success: false,
        response: NextResponse.json({ error: 'Business not found' }, { status: 404 }),
      }
    }

    return {
      success: true,
      vendor: {
        // accountId is legacy; we use identity id for compatibility
        accountId: identity.sub,
        businessId: business.id,
        email: identity.email,
        isVerified: business.isVerified,
      },
    }
  }

  const payload = verifyToken(token)

  if (!payload) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  }

  const account = await prisma.account.findUnique({
    where: { id: payload.accountId },
    include: {
      business: true
    }
  })

  if (!account || account.role !== 'BUSINESS') {
    return {
      success: false,
      response: NextResponse.json({ error: 'Vendor access required' }, { status: 403 })
    }
  }

  if (!account.business) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'No business claimed', redirectTo: '/claim-business' },
        { status: 403 }
      )
    }
  }

  return {
    success: true,
    vendor: {
      accountId: account.id,
      businessId: account.business.id,
      email: account.email,
      isVerified: account.business.isVerified
    }
  }
}

/**
 * MODULE 7: Vendor Operations
 * GET /api/vendor/business
 *
 * Purpose: Retrieve vendor's business profile
 * Authorization:
 *   - VENDOR only (must own exactly one business)
 * Rules:
 *   - Vendor can only see their own business
 *   - Read-only view (no mutations)
 * Output:
 *   - Full business profile with directory visibility info
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireVendorWithBusiness,
  vendorFailure,
} from '@/lib/vendor'
import { authFailure } from '@/lib/identity'

export async function GET(request: NextRequest) {
  // GUARD: Vendor with business ownership
  const result = await requireVendorWithBusiness(request)
  if (!result.success) {
    return vendorFailure(result)
  }

  const { vendor, business } = result.data

  // Fetch additional business data
  const fullBusiness = await prisma.business.findUnique({
    where: { id: business.id },
    include: {
      subscription: true,
      _count: {
        select: {
          deals: true,
          vouchers: true,
        },
      },
    },
  })

  if (!fullBusiness) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      // Core identity
      id: business.id,
      name: business.name,
      status: business.status,
      isVerified: business.isVerified,

      // Directory fields
      category: business.category,
      description: business.description,

      // Location
      addressLine1: business.addressLine1,
      addressLine2: business.addressLine2,
      city: business.city,
      state: business.state,
      postalCode: business.postalCode,

      // Contact
      phone: business.phone,
      website: business.website,

      // Media
      logoUrl: business.logoUrl,
      coverUrl: business.coverUrl,
      photos: business.photos,

      // Hours
      hours: business.hours,

      // Metrics (read-only)
      monthlyVoucherAllowance: business.monthlyVoucherAllowance,
      totalDeals: fullBusiness._count.deals,
      totalVouchers: fullBusiness._count.vouchers,

      // Subscription
      subscription: fullBusiness.subscription
        ? {
            id: fullBusiness.subscription.id,
            status: fullBusiness.subscription.status,
            startedAt: fullBusiness.subscription.startedAt,
            endsAt: fullBusiness.subscription.endsAt,
          }
        : null,

      // Timestamps
      createdAt: business.createdAt,
    },
    vendor: {
      id: vendor.id,
      email: vendor.email,
    },
  })
}

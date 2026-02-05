/**
 * COUNTY SYSTEM BOUNDARY MODULE (Foundational)
 * SUPER_ADMIN County Management API
 *
 * GET /api/super-admin/counties - List all counties
 * POST /api/super-admin/counties - Create a new county
 *
 * Authorization: SUPER_ADMIN only
 *
 * HARD RULES:
 * - Only SUPER_ADMIN may create counties
 * - Counties may be disabled but never deleted
 * - County slugs must be unique
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireSuperAdmin,
  countyFailure,
} from '@/lib/county'
import {
  isValidCountySlug,
  isValidStateAbbreviation,
} from '@/lib/county/types'

/**
 * GET /api/super-admin/counties
 * List all counties (active and inactive)
 */
export async function GET(request: NextRequest) {
  // GUARD: Require SUPER_ADMIN
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  // Fetch all counties
  const counties = await prisma.county.findMany({
    select: {
      id: true,
      name: true,
      state: true,
      slug: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          businesses: true,
          deals: true,
          vouchers: true,
        },
      },
    },
    orderBy: [
      { state: 'asc' },
      { name: 'asc' },
    ],
  })

  return NextResponse.json({
    success: true,
    data: counties.map((c) => ({
      id: c.id,
      name: c.name,
      state: c.state,
      slug: c.slug,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      stats: {
        businesses: c._count.businesses,
        deals: c._count.deals,
        vouchers: c._count.vouchers,
      },
    })),
  })
}

/**
 * POST /api/super-admin/counties
 * Create a new county
 */
export async function POST(request: NextRequest) {
  // GUARD: Require SUPER_ADMIN
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  const admin = adminResult.data

  // Parse request body
  let body: {
    name?: string
    state?: string
    slug?: string
    googlePlacesConfig?: unknown
    boundaryGeometry?: unknown
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  // Validate required fields
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: 'County name is required' },
      { status: 400 }
    )
  }

  if (!body.state || typeof body.state !== 'string') {
    return NextResponse.json(
      { error: 'State is required' },
      { status: 400 }
    )
  }

  if (!isValidStateAbbreviation(body.state)) {
    return NextResponse.json(
      { error: 'Invalid state abbreviation' },
      { status: 400 }
    )
  }

  if (!body.slug || typeof body.slug !== 'string') {
    return NextResponse.json(
      { error: 'County slug is required' },
      { status: 400 }
    )
  }

  if (!isValidCountySlug(body.slug)) {
    return NextResponse.json(
      { error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.' },
      { status: 400 }
    )
  }

  // Check slug uniqueness
  const existing = await prisma.county.findUnique({
    where: { slug: body.slug },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'County with this slug already exists' },
      { status: 409 }
    )
  }

  // Create county
  const county = await prisma.county.create({
    data: {
      name: body.name.trim(),
      state: body.state.toUpperCase(),
      slug: body.slug.toLowerCase(),
      isActive: true,
      googlePlacesConfig: body.googlePlacesConfig || undefined,
      boundaryGeometry: body.boundaryGeometry || undefined,
    },
  })

  // Log admin action
  await prisma.adminActionLog.create({
    data: {
      adminUserId: admin.id,
      actionType: 'COUNTY_CREATED',
      targetEntityType: 'County',
      targetEntityId: county.id,
      countyId: null, // Global action
      metadata: {
        name: county.name,
        state: county.state,
        slug: county.slug,
      },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      id: county.id,
      name: county.name,
      state: county.state,
      slug: county.slug,
      isActive: county.isActive,
      createdAt: county.createdAt,
    },
  }, { status: 201 })
}

/**
 * GEOGRAPHIC CONTEXT & DISCOVERY BOUNDARY MODULE
 * Admin Cities Management API
 *
 * GET /api/admin/cities - List all cities for admin's county
 * POST /api/admin/cities - Create a new city
 *
 * Authorization: ADMIN with county access
 *
 * HARD RULES:
 * - Cities are schema, not content (curated list only)
 * - Max ~20 cities per county
 * - No free-text city entry for users
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminCountyAccess, hasCountyAccess, CountyErrors } from '@/lib/county'
import { canAddCity, MAX_CITIES_PER_COUNTY, CityErrors as GeoCityErrors } from '@/lib/geography/city-guards'
import { isValidCitySlug } from '@/lib/geography/types'

/**
 * GET /api/admin/cities
 * List all cities for the admin's county (including inactive)
 */
export async function GET(request: NextRequest) {
  // GUARD: Require admin with county access
  const adminResult = await requireAdminCountyAccess(request)
  if (!adminResult.success) {
    return NextResponse.json(
      { error: adminResult.error },
      { status: adminResult.status }
    )
  }

  // Ensure we have county context (not SUPER_ADMIN global access)
  if (!hasCountyAccess(adminResult.data)) {
    return NextResponse.json(
      { error: CountyErrors.COUNTY_CONTEXT_REQUIRED.error },
      { status: CountyErrors.COUNTY_CONTEXT_REQUIRED.status }
    )
  }

  const { activeCounty: county } = adminResult.data

  // Fetch all cities for this county
  const cities = await prisma.city.findMany({
    where: { countyId: county.id },
    orderBy: [
      { displayOrder: 'asc' },
      { name: 'asc' },
    ],
    include: {
      _count: {
        select: {
          businesses: true,
        },
      },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      county: {
        id: county.id,
        name: county.name,
        state: county.state,
      },
      maxCities: MAX_CITIES_PER_COUNTY,
      currentCount: cities.length,
      cities: cities.map(city => ({
        id: city.id,
        name: city.name,
        slug: city.slug,
        isActive: city.isActive,
        displayOrder: city.displayOrder,
        businessCount: city._count.businesses,
        createdAt: city.createdAt,
        updatedAt: city.updatedAt,
      })),
    },
  })
}

/**
 * POST /api/admin/cities
 * Create a new city in the admin's county
 */
export async function POST(request: NextRequest) {
  // GUARD: Require admin with county access
  const adminResult = await requireAdminCountyAccess(request)
  if (!adminResult.success) {
    return NextResponse.json(
      { error: adminResult.error },
      { status: adminResult.status }
    )
  }

  // Ensure we have county context (not SUPER_ADMIN global access)
  if (!hasCountyAccess(adminResult.data)) {
    return NextResponse.json(
      { error: CountyErrors.COUNTY_CONTEXT_REQUIRED.error },
      { status: CountyErrors.COUNTY_CONTEXT_REQUIRED.status }
    )
  }

  const admin = adminResult.data
  const county = adminResult.data.activeCounty

  // Check if county can add more cities
  const canAddResult = await canAddCity(county.id)
  if (!canAddResult.success) {
    return NextResponse.json(
      { error: canAddResult.error },
      { status: canAddResult.status }
    )
  }

  if (!canAddResult.data.canAdd) {
    return NextResponse.json(
      { error: GeoCityErrors.MAX_CITIES_REACHED.error },
      { status: GeoCityErrors.MAX_CITIES_REACHED.status }
    )
  }

  // Parse request body
  let body: {
    name?: string
    slug?: string
    displayOrder?: number
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
      { error: GeoCityErrors.CITY_NAME_REQUIRED.error },
      { status: GeoCityErrors.CITY_NAME_REQUIRED.status }
    )
  }

  if (!body.slug || typeof body.slug !== 'string') {
    return NextResponse.json(
      { error: GeoCityErrors.CITY_SLUG_REQUIRED.error },
      { status: GeoCityErrors.CITY_SLUG_REQUIRED.status }
    )
  }

  if (!isValidCitySlug(body.slug)) {
    return NextResponse.json(
      { error: GeoCityErrors.INVALID_CITY_SLUG.error },
      { status: GeoCityErrors.INVALID_CITY_SLUG.status }
    )
  }

  // Check slug uniqueness within county
  const existing = await prisma.city.findUnique({
    where: {
      countyId_slug: {
        countyId: county.id,
        slug: body.slug.toLowerCase(),
      },
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: GeoCityErrors.CITY_ALREADY_EXISTS.error },
      { status: GeoCityErrors.CITY_ALREADY_EXISTS.status }
    )
  }

  // Create city
  const city = await prisma.city.create({
    data: {
      countyId: county.id,
      name: body.name.trim(),
      slug: body.slug.toLowerCase(),
      displayOrder: body.displayOrder ?? 0,
      isActive: true,
    },
  })

  // Log admin action
  await prisma.adminActionLog.create({
    data: {
      adminUserId: admin.id,
      actionType: 'CITY_CREATED',
      targetEntityType: 'City',
      targetEntityId: city.id,
      countyId: county.id,
      metadata: {
        name: city.name,
        slug: city.slug,
      },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      id: city.id,
      countyId: city.countyId,
      name: city.name,
      slug: city.slug,
      isActive: city.isActive,
      displayOrder: city.displayOrder,
      createdAt: city.createdAt,
    },
  }, { status: 201 })
}

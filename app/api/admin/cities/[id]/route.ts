/**
 * GEOGRAPHIC CONTEXT & DISCOVERY BOUNDARY MODULE
 * Admin City Detail API
 *
 * GET /api/admin/cities/[id] - Get city details
 * PATCH /api/admin/cities/[id] - Update city
 *
 * Authorization: ADMIN with county access
 *
 * HARD RULES:
 * - Cities belong to ONE county only
 * - Cities may be disabled but not deleted (businesses reference them)
 * - Slug changes must maintain uniqueness within county
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminCountyAccess, hasCountyAccess, CountyErrors } from '@/lib/county'
import { CityErrors as GeoCityErrors } from '@/lib/geography/city-guards'
import { isValidCitySlug } from '@/lib/geography/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/cities/[id]
 * Get city details
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params

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

  const county = adminResult.data.activeCounty

  // Fetch city
  const city = await prisma.city.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          businesses: true,
        },
      },
    },
  })

  if (!city) {
    return NextResponse.json(
      { error: GeoCityErrors.CITY_NOT_FOUND.error },
      { status: GeoCityErrors.CITY_NOT_FOUND.status }
    )
  }

  // HARD CHECK: City must belong to admin's county
  if (city.countyId !== county.id) {
    return NextResponse.json(
      { error: GeoCityErrors.CITY_NOT_IN_COUNTY.error },
      { status: GeoCityErrors.CITY_NOT_IN_COUNTY.status }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      id: city.id,
      countyId: city.countyId,
      name: city.name,
      slug: city.slug,
      isActive: city.isActive,
      displayOrder: city.displayOrder,
      businessCount: city._count.businesses,
      createdAt: city.createdAt,
      updatedAt: city.updatedAt,
    },
  })
}

/**
 * PATCH /api/admin/cities/[id]
 * Update city
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params

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

  // Fetch city
  const city = await prisma.city.findUnique({
    where: { id },
  })

  if (!city) {
    return NextResponse.json(
      { error: GeoCityErrors.CITY_NOT_FOUND.error },
      { status: GeoCityErrors.CITY_NOT_FOUND.status }
    )
  }

  // HARD CHECK: City must belong to admin's county
  if (city.countyId !== county.id) {
    return NextResponse.json(
      { error: GeoCityErrors.CITY_NOT_IN_COUNTY.error },
      { status: GeoCityErrors.CITY_NOT_IN_COUNTY.status }
    )
  }

  // Parse request body
  let body: {
    name?: string
    slug?: string
    isActive?: boolean
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

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: GeoCityErrors.CITY_NAME_REQUIRED.error },
        { status: GeoCityErrors.CITY_NAME_REQUIRED.status }
      )
    }
    updateData.name = body.name.trim()
  }

  if (body.slug !== undefined) {
    if (!isValidCitySlug(body.slug)) {
      return NextResponse.json(
        { error: GeoCityErrors.INVALID_CITY_SLUG.error },
        { status: GeoCityErrors.INVALID_CITY_SLUG.status }
      )
    }

    // Check slug uniqueness (if changing)
    if (body.slug.toLowerCase() !== city.slug) {
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
    }

    updateData.slug = body.slug.toLowerCase()
  }

  if (body.isActive !== undefined) {
    updateData.isActive = Boolean(body.isActive)
  }

  if (body.displayOrder !== undefined) {
    updateData.displayOrder = Number(body.displayOrder)
  }

  // Update city
  const updatedCity = await prisma.city.update({
    where: { id },
    data: updateData,
  })

  // Log admin action
  await prisma.adminActionLog.create({
    data: {
      adminUserId: admin.id,
      actionType: 'CITY_UPDATED',
      targetEntityType: 'City',
      targetEntityId: city.id,
      countyId: county.id,
      metadata: {
        changes: updateData,
        previousValues: {
          name: city.name,
          slug: city.slug,
          isActive: city.isActive,
          displayOrder: city.displayOrder,
        },
      },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      id: updatedCity.id,
      countyId: updatedCity.countyId,
      name: updatedCity.name,
      slug: updatedCity.slug,
      isActive: updatedCity.isActive,
      displayOrder: updatedCity.displayOrder,
      updatedAt: updatedCity.updatedAt,
    },
  })
}

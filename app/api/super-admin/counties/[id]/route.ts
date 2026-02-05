/**
 * COUNTY SYSTEM BOUNDARY MODULE (Foundational)
 * SUPER_ADMIN County Management API - Single County Operations
 *
 * GET /api/super-admin/counties/:id - Get county details
 * PATCH /api/super-admin/counties/:id - Update county (disable/enable, config)
 *
 * Authorization: SUPER_ADMIN only
 *
 * HARD RULES:
 * - Counties may be disabled but NEVER deleted
 * - County ID and slug are immutable after creation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireSuperAdmin,
  countyFailure,
} from '@/lib/county'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/super-admin/counties/:id
 * Get detailed county information
 */
export async function GET(request: NextRequest, context: RouteParams) {
  const { id: countyId } = await context.params

  // GUARD: Require SUPER_ADMIN
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  // Fetch county with stats
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    include: {
      _count: {
        select: {
          businesses: true,
          deals: true,
          vouchers: true,
          redemptions: true,
          purchases: true,
          adminCountyAccess: true,
        },
      },
      adminCountyAccess: {
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  })

  if (!county) {
    return NextResponse.json(
      { error: 'County not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      id: county.id,
      name: county.name,
      state: county.state,
      slug: county.slug,
      isActive: county.isActive,
      googlePlacesConfig: county.googlePlacesConfig,
      boundaryGeometry: county.boundaryGeometry,
      createdAt: county.createdAt,
      updatedAt: county.updatedAt,
      stats: {
        businesses: county._count.businesses,
        deals: county._count.deals,
        vouchers: county._count.vouchers,
        redemptions: county._count.redemptions,
        purchases: county._count.purchases,
        admins: county._count.adminCountyAccess,
      },
      admins: county.adminCountyAccess.map((a) => ({
        id: a.admin.id,
        email: a.admin.email,
        grantedAt: a.grantedAt,
      })),
    },
  })
}

/**
 * PATCH /api/super-admin/counties/:id
 * Update county configuration
 *
 * Updatable fields:
 * - name
 * - isActive (disable/enable)
 * - googlePlacesConfig
 * - boundaryGeometry
 *
 * NOT updatable:
 * - id (immutable)
 * - slug (immutable)
 * - state (immutable)
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
  const { id: countyId } = await context.params

  // GUARD: Require SUPER_ADMIN
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  const admin = adminResult.data

  // Verify county exists
  const existing = await prisma.county.findUnique({
    where: { id: countyId },
  })

  if (!existing) {
    return NextResponse.json(
      { error: 'County not found' },
      { status: 404 }
    )
  }

  // Parse request body
  let body: {
    name?: string
    isActive?: boolean
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

  // Validate name if provided
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid county name' },
        { status: 400 }
      )
    }
  }

  // Validate isActive if provided
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    return NextResponse.json(
      { error: 'isActive must be a boolean' },
      { status: 400 }
    )
  }

  // Build update data using Prisma types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {}

  if (body.name !== undefined) {
    updateData.name = body.name.trim()
  }
  if (body.isActive !== undefined) {
    updateData.isActive = body.isActive
  }
  if (body.googlePlacesConfig !== undefined) {
    updateData.googlePlacesConfig = body.googlePlacesConfig
  }
  if (body.boundaryGeometry !== undefined) {
    updateData.boundaryGeometry = body.boundaryGeometry
  }

  // Update county
  const county = await prisma.county.update({
    where: { id: countyId },
    data: updateData,
  })

  // Log admin action
  await prisma.adminActionLog.create({
    data: {
      adminUserId: admin.id,
      actionType: body.isActive === false ? 'COUNTY_DISABLED' :
                  body.isActive === true ? 'COUNTY_ENABLED' : 'COUNTY_UPDATED',
      targetEntityType: 'County',
      targetEntityId: county.id,
      countyId: null, // Global action
      metadata: {
        changes: updateData,
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
      updatedAt: county.updatedAt,
    },
  })
}

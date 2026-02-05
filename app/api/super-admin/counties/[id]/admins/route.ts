/**
 * COUNTY SYSTEM BOUNDARY MODULE (Foundational)
 * SUPER_ADMIN Admin County Access Management
 *
 * GET /api/super-admin/counties/:id/admins - List admins with access
 * POST /api/super-admin/counties/:id/admins - Grant admin access to county
 * DELETE /api/super-admin/counties/:id/admins - Revoke admin access
 *
 * Authorization: SUPER_ADMIN only
 *
 * HARD RULES:
 * - Only SUPER_ADMIN may grant/revoke admin county access
 * - ADMIN role is required for the target identity
 * - An admin can have access to multiple counties
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { IdentityRole } from '@prisma/client'
import {
  requireSuperAdmin,
  countyFailure,
  CountyErrors,
} from '@/lib/county'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/super-admin/counties/:id/admins
 * List all admins with access to this county
 */
export async function GET(request: NextRequest, context: RouteParams) {
  const { id: countyId } = await context.params

  // GUARD: Require SUPER_ADMIN
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  // Verify county exists
  const county = await prisma.county.findUnique({
    where: { id: countyId },
  })

  if (!county) {
    return NextResponse.json(
      { error: 'County not found' },
      { status: 404 }
    )
  }

  // Fetch admin access records
  const accessRecords = await prisma.adminCountyAccess.findMany({
    where: { countyId },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: { grantedAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    data: accessRecords.map((r) => ({
      accessId: r.id,
      adminId: r.admin.id,
      email: r.admin.email,
      role: r.admin.role,
      status: r.admin.status,
      grantedAt: r.grantedAt,
      grantedBy: r.grantedBy,
    })),
  })
}

/**
 * POST /api/super-admin/counties/:id/admins
 * Grant admin access to this county
 */
export async function POST(request: NextRequest, context: RouteParams) {
  const { id: countyId } = await context.params

  // GUARD: Require SUPER_ADMIN
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  const superAdmin = adminResult.data

  // Verify county exists and is active
  const county = await prisma.county.findUnique({
    where: { id: countyId },
  })

  if (!county) {
    return NextResponse.json(
      { error: 'County not found' },
      { status: 404 }
    )
  }

  // Parse request body
  let body: { adminId?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  if (!body.adminId || typeof body.adminId !== 'string') {
    return NextResponse.json(
      { error: 'adminId is required' },
      { status: 400 }
    )
  }

  // Verify target identity exists and is ADMIN
  const targetAdmin = await prisma.userIdentity.findUnique({
    where: { id: body.adminId },
  })

  if (!targetAdmin) {
    return NextResponse.json(
      { error: 'Admin identity not found' },
      { status: 404 }
    )
  }

  if (targetAdmin.role !== IdentityRole.ADMIN) {
    return NextResponse.json(
      { error: 'Target identity must have ADMIN role' },
      { status: 400 }
    )
  }

  // Check if access already exists
  const existingAccess = await prisma.adminCountyAccess.findUnique({
    where: {
      adminId_countyId: {
        adminId: body.adminId,
        countyId,
      },
    },
  })

  if (existingAccess) {
    return NextResponse.json(
      { error: CountyErrors.ADMIN_ALREADY_HAS_COUNTY_ACCESS.error },
      { status: 409 }
    )
  }

  // Grant access
  const access = await prisma.adminCountyAccess.create({
    data: {
      adminId: body.adminId,
      countyId,
      grantedBy: superAdmin.id,
    },
  })

  // Log admin action
  await prisma.adminActionLog.create({
    data: {
      adminUserId: superAdmin.id,
      actionType: 'ADMIN_COUNTY_ACCESS_GRANTED',
      targetEntityType: 'AdminCountyAccess',
      targetEntityId: access.id,
      countyId,
      metadata: {
        grantedTo: targetAdmin.email,
        countyName: county.name,
      },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      accessId: access.id,
      adminId: body.adminId,
      countyId,
      grantedAt: access.grantedAt,
    },
  }, { status: 201 })
}

/**
 * DELETE /api/super-admin/counties/:id/admins
 * Revoke admin access to this county
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  const { id: countyId } = await context.params

  // GUARD: Require SUPER_ADMIN
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  const superAdmin = adminResult.data

  // Parse request body
  let body: { adminId?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  if (!body.adminId || typeof body.adminId !== 'string') {
    return NextResponse.json(
      { error: 'adminId is required' },
      { status: 400 }
    )
  }

  // Verify access exists
  const existingAccess = await prisma.adminCountyAccess.findUnique({
    where: {
      adminId_countyId: {
        adminId: body.adminId,
        countyId,
      },
    },
    include: {
      admin: {
        select: { email: true },
      },
      county: {
        select: { name: true },
      },
    },
  })

  if (!existingAccess) {
    return NextResponse.json(
      { error: 'Admin does not have access to this county' },
      { status: 404 }
    )
  }

  // Revoke access
  await prisma.adminCountyAccess.delete({
    where: {
      adminId_countyId: {
        adminId: body.adminId,
        countyId,
      },
    },
  })

  // Log admin action
  await prisma.adminActionLog.create({
    data: {
      adminUserId: superAdmin.id,
      actionType: 'ADMIN_COUNTY_ACCESS_REVOKED',
      targetEntityType: 'AdminCountyAccess',
      targetEntityId: existingAccess.id,
      countyId,
      metadata: {
        revokedFrom: existingAccess.admin.email,
        countyName: existingAccess.county.name,
      },
    },
  })

  return NextResponse.json({
    success: true,
    message: 'Admin access revoked',
  })
}

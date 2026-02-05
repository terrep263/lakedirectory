/**
 * SUPER_ADMIN: Admin Identity Directory
 *
 * GET /api/super-admin/admin-identities
 *
 * Returns a small directory of identities eligible for county access grants.
 * This is a UI-support endpoint (Super Admin console).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { IdentityRole } from '@prisma/client'
import { requireSuperAdmin, countyFailure } from '@/lib/county'

export async function GET(request: NextRequest) {
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  const admins = await prisma.userIdentity.findMany({
    where: {
      role: IdentityRole.ADMIN,
    },
    select: {
      id: true,
      email: true,
      status: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  })

  return NextResponse.json({
    success: true,
    data: admins,
  })
}


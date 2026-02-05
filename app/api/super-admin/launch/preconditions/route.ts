/**
 * NEW COUNTY LAUNCH PLAYBOOK
 * Phase 0: Preconditions Check API
 *
 * GET /api/super-admin/launch/preconditions
 *
 * Authorization: SUPER_ADMIN only
 *
 * This endpoint checks all launch preconditions before beginning
 * the New County Launch Playbook.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, countyFailure } from '@/lib/county'
import { checkAllPreconditions } from '@/lib/county-launch'

/**
 * GET /api/super-admin/launch/preconditions
 * Check all launch preconditions
 */
export async function GET(request: NextRequest) {
  // GUARD: Require SUPER_ADMIN
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  // Check all preconditions
  const result = await checkAllPreconditions()

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }

  return NextResponse.json({
    success: true,
    data: result.data,
  })
}

/**
 * NEW COUNTY LAUNCH PLAYBOOK
 * Launch County Detail & Progress API
 *
 * GET /api/super-admin/launch/counties/[id] - Get launch progress
 *
 * Authorization: SUPER_ADMIN only
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, countyFailure } from '@/lib/county'
import { getLaunchProgress, getLaunchLogs } from '@/lib/county-launch'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/super-admin/launch/counties/[id]
 * Get launch progress for a county
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id: countyId } = await context.params

  // GUARD: Require SUPER_ADMIN
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  // Get launch progress
  const progressResult = await getLaunchProgress(countyId)
  if (!progressResult.success) {
    return NextResponse.json(
      { error: progressResult.error },
      { status: progressResult.status }
    )
  }

  // Get launch logs
  const logsResult = await getLaunchLogs(countyId)
  const logs = logsResult.success ? logsResult.data : []

  return NextResponse.json({
    success: true,
    data: {
      progress: progressResult.data,
      logs,
    },
  })
}

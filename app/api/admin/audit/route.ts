/**
 * MODULE 8: Admin Operations
 * GET /api/admin/audit
 *
 * Purpose: Retrieve audit logs with filtering and pagination
 * Authorization:
 *   - ADMIN only
 * Output:
 *   - Paginated list of admin action logs
 *   - Optional filtering by admin, action type, entity
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdminContext,
  adminFailure,
  queryAuditLogs,
  getAuditStats,
  type AdminActionType,
  type TargetEntityType,
} from '@/lib/admin'

export async function GET(request: NextRequest) {
  // GUARD: Admin only (Module 8)
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) {
    return adminFailure(adminResult)
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams
  const adminUserId = searchParams.get('adminUserId') || undefined
  const actionType = searchParams.get('actionType') as AdminActionType | undefined
  const targetEntityType = searchParams.get('targetEntityType') as TargetEntityType | undefined
  const targetEntityId = searchParams.get('targetEntityId') || undefined
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const includeStats = searchParams.get('includeStats') === 'true'

  // Build query
  const auditResult = await queryAuditLogs({
    adminUserId,
    actionType,
    targetEntityType,
    targetEntityId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    page,
    limit,
  })

  // Optionally include stats
  let stats = null
  if (includeStats) {
    stats = await getAuditStats()
  }

  return NextResponse.json({
    success: true,
    data: auditResult.logs,
    pagination: auditResult.pagination,
    ...(stats && { stats }),
  })
}

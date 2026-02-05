/**
 * MODULE 8: Admin Operations
 * GET /api/admin/queue
 *
 * Purpose: View pending admin actions (unified queue)
 * Authorization:
 *   - ADMIN only
 * Output:
 *   - Prioritized list of pending items (escalations, deals, businesses)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdminContext,
  adminFailure,
  buildAdminQueue,
  getEscalationStats,
  getAuditStats,
} from '@/lib/admin'

export async function GET(request: NextRequest) {
  // GUARD: Admin only (Module 8)
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) {
    return adminFailure(adminResult)
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams
  const includeStats = searchParams.get('includeStats') === 'true'

  // Build the admin queue
  const queue = await buildAdminQueue()

  // Optionally include stats
  let stats = null
  if (includeStats) {
    const [escalationStats, auditStats] = await Promise.all([
      getEscalationStats(),
      getAuditStats(),
    ])
    stats = {
      escalations: escalationStats,
      audit: auditStats,
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      queue,
      totalItems: queue.length,
      ...(stats && { stats }),
    },
  })
}

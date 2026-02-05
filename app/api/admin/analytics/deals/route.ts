/**
 * MODULE 11: ANALYTICS & REPORTING
 * Admin Deal Analytics API
 *
 * GET /api/admin/analytics/deals
 *
 * Authorization: ADMIN with county access
 *
 * Returns deal-level analytics including:
 * - Voucher metrics
 * - Performance metrics
 * - DealGuard trust scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCountyAccess, hasCountyAccess, CountyErrors } from '@/lib/county'
import { getDealsAnalytics } from '@/lib/analytics/admin-analytics'
import { isValidTimeframe, type AnalyticsTimeframe } from '@/lib/analytics/types'

/**
 * GET /api/admin/analytics/deals
 * Get deal-level analytics
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

  // Ensure we have county context
  if (!hasCountyAccess(adminResult.data)) {
    return NextResponse.json(
      { error: CountyErrors.COUNTY_CONTEXT_REQUIRED.error },
      { status: CountyErrors.COUNTY_CONTEXT_REQUIRED.status }
    )
  }

  const county = adminResult.data.activeCounty

  // Parse query parameters
  const url = new URL(request.url)
  const timeframeParam = url.searchParams.get('timeframe') || '30d'
  const limitParam = url.searchParams.get('limit') || '50'
  const offsetParam = url.searchParams.get('offset') || '0'

  if (!isValidTimeframe(timeframeParam)) {
    return NextResponse.json(
      { error: 'Invalid timeframe. Use: 7d, 30d, 90d, or all' },
      { status: 400 }
    )
  }

  const timeframe = timeframeParam as AnalyticsTimeframe
  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100)
  const offset = Math.max(parseInt(offsetParam, 10) || 0, 0)

  // Get analytics
  const result = await getDealsAnalytics(county.id, timeframe, limit, offset)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }

  return NextResponse.json({
    success: true,
    data: result.data.deals,
    pagination: {
      total: result.data.total,
      limit,
      offset,
      hasMore: offset + limit < result.data.total,
    },
  })
}

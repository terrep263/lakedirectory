/**
 * MODULE 11: ANALYTICS & REPORTING
 * Vendor Single Deal Analytics API
 *
 * GET /api/vendor/analytics/deals/[id]
 *
 * Authorization: VENDOR only
 *
 * Returns detailed analytics for a single deal.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateIdentity } from '@/lib/identity'
import { IdentityRole } from '@prisma/client'
import { getVendorSingleDealAnalytics } from '@/lib/analytics/vendor-analytics'
import { isValidTimeframe, type AnalyticsTimeframe } from '@/lib/analytics/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/vendor/analytics/deals/[id]
 * Get single deal analytics
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id: dealId } = await context.params

  // GUARD: Authenticate identity
  const authResult = await authenticateIdentity(request)
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const identity = authResult.data

  // GUARD: Must be VENDOR
  if (identity.role !== IdentityRole.VENDOR) {
    return NextResponse.json(
      { error: 'VENDOR role required' },
      { status: 403 }
    )
  }

  // Parse query parameters
  const url = new URL(request.url)
  const timeframeParam = url.searchParams.get('timeframe') || '30d'

  if (!isValidTimeframe(timeframeParam)) {
    return NextResponse.json(
      { error: 'Invalid timeframe. Use: 7d, 30d, 90d, or all' },
      { status: 400 }
    )
  }

  const timeframe = timeframeParam as AnalyticsTimeframe

  // Get analytics (ownership is verified inside)
  const result = await getVendorSingleDealAnalytics(
    dealId,
    identity.id,
    timeframe
  )

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

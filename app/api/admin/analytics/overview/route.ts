/**
 * MODULE 11: ANALYTICS & REPORTING
 * Admin Platform Overview Analytics API
 *
 * GET /api/admin/analytics/overview
 *
 * Authorization: ADMIN with county access
 *
 * Returns county-level platform overview including:
 * - Business metrics
 * - Deal metrics
 * - Voucher metrics
 * - Revenue metrics
 * - Growth trends
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCountyAccess, hasCountyAccess, CountyErrors } from '@/lib/county'
import { getPlatformAnalytics } from '@/lib/analytics/admin-analytics'
import {
  generatePlatformInsights,
  filterInsightsByConfidence,
  hasConflictingSignals,
} from '@/lib/analytics/ai-insights'
import { isValidTimeframe, type AnalyticsTimeframe } from '@/lib/analytics/types'

/**
 * GET /api/admin/analytics/overview
 * Get platform overview analytics
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
  const includeInsights = url.searchParams.get('insights') !== 'false'

  if (!isValidTimeframe(timeframeParam)) {
    return NextResponse.json(
      { error: 'Invalid timeframe. Use: 7d, 30d, 90d, or all' },
      { status: 400 }
    )
  }

  const timeframe = timeframeParam as AnalyticsTimeframe

  // Get analytics
  const result = await getPlatformAnalytics(county.id, timeframe)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }

  // Generate AI insights if requested
  let insights = null
  let insightsGenerated = false

  if (includeInsights) {
    const rawInsights = generatePlatformInsights(result.data)

    // Check for conflicting signals
    if (hasConflictingSignals(rawInsights)) {
      // Suppress narrative, show metrics only
      insights = []
      insightsGenerated = false
    } else {
      // Filter by confidence (suppress low confidence)
      insights = filterInsightsByConfidence(rawInsights, 'medium')
      insightsGenerated = insights.length > 0
    }
  }

  return NextResponse.json({
    success: true,
    data: result.data,
    insights,
    insightsGenerated,
  })
}

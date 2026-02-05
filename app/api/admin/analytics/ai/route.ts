/**
 * MODULE 11: ANALYTICS & REPORTING
 * Admin AI System Analytics API
 *
 * GET /api/admin/analytics/ai
 *
 * Authorization: ADMIN with county access
 *
 * Returns AI and escalation metrics including:
 * - DealGuard score distribution
 * - Escalation counts by type
 * - AI confidence levels
 * - Resolution times
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCountyAccess, hasCountyAccess, CountyErrors } from '@/lib/county'
import {
  getAISystemAnalytics,
  getAdminOperationsAnalytics,
} from '@/lib/analytics/admin-analytics'
import {
  generateAISystemInsights,
  generateAdminOperationsInsights,
  filterInsightsByConfidence,
} from '@/lib/analytics/ai-insights'
import { isValidTimeframe, type AnalyticsTimeframe } from '@/lib/analytics/types'

/**
 * GET /api/admin/analytics/ai
 * Get AI system and escalation metrics
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

  // Get both AI system and admin operations analytics
  const [aiResult, opsResult] = await Promise.all([
    getAISystemAnalytics(county.id, timeframe),
    getAdminOperationsAnalytics(county.id, timeframe),
  ])

  if (!aiResult.success) {
    return NextResponse.json(
      { error: aiResult.error },
      { status: aiResult.status }
    )
  }

  if (!opsResult.success) {
    return NextResponse.json(
      { error: opsResult.error },
      { status: opsResult.status }
    )
  }

  // Generate insights if requested
  let insights = null
  if (includeInsights) {
    const aiInsights = generateAISystemInsights(aiResult.data)
    const opsInsights = generateAdminOperationsInsights(opsResult.data)
    const allInsights = [...aiInsights, ...opsInsights]
    insights = filterInsightsByConfidence(allInsights, 'medium')
  }

  return NextResponse.json({
    success: true,
    data: {
      aiSystem: aiResult.data,
      adminOperations: opsResult.data,
    },
    insights,
  })
}

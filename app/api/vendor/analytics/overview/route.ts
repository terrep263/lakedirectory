/**
 * MODULE 11: ANALYTICS & REPORTING
 * Vendor Business Overview Analytics API
 *
 * GET /api/vendor/analytics/overview
 *
 * Authorization: VENDOR only
 *
 * Returns vendor's business performance summary including:
 * - Deal summary
 * - Voucher metrics
 * - Performance metrics
 * - Revenue
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateIdentity } from '@/lib/identity'
import { IdentityRole } from '@prisma/client'
import { getVendorBusinessAnalytics } from '@/lib/analytics/vendor-analytics'
import {
  generateBusinessInsights,
  filterInsightsByConfidence,
} from '@/lib/analytics/ai-insights'
import { isValidTimeframe, type AnalyticsTimeframe, AnalyticsErrors } from '@/lib/analytics/types'

/**
 * GET /api/vendor/analytics/overview
 * Get vendor business performance summary
 */
export async function GET(request: NextRequest) {
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

  // Get vendor's business
  const ownership = await prisma.vendorOwnership.findUnique({
    where: { userId: identity.id },
    select: { businessId: true },
  })

  if (!ownership) {
    return NextResponse.json(
      { error: AnalyticsErrors.BUSINESS_NOT_FOUND.error },
      { status: AnalyticsErrors.BUSINESS_NOT_FOUND.status }
    )
  }

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
  const result = await getVendorBusinessAnalytics(
    ownership.businessId,
    identity.id,
    timeframe
  )

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }

  // Generate insights if requested
  let insights = null
  if (includeInsights) {
    const rawInsights = generateBusinessInsights(result.data)
    insights = filterInsightsByConfidence(rawInsights, 'medium')
  }

  return NextResponse.json({
    success: true,
    data: result.data,
    insights,
  })
}

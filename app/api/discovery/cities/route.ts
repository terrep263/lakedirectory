/**
 * GEOGRAPHIC CONTEXT & DISCOVERY BOUNDARY MODULE
 * Public Cities API
 *
 * GET /api/discovery/cities - List active cities for the current county
 *
 * Authorization: Public (county resolved from domain)
 *
 * HARD RULES:
 * - County is resolved from domain ONLY
 * - Only active cities are returned
 * - No cross-county data exposure
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveCountyFromDomain } from '@/lib/geography/domain-resolution'
import { listCountyCities } from '@/lib/geography/city-guards'

/**
 * GET /api/discovery/cities
 * List all active cities for the county (resolved from domain)
 */
export async function GET(request: NextRequest) {
  // 1. Resolve county from domain (REQUIRED)
  const countyResult = await resolveCountyFromDomain(request)
  if (!countyResult.success) {
    return NextResponse.json(
      { error: countyResult.error },
      { status: countyResult.status }
    )
  }

  const county = countyResult.data

  // 2. Get active cities for this county
  const citiesResult = await listCountyCities(county.id, false)
  if (!citiesResult.success) {
    return NextResponse.json(
      { error: citiesResult.error },
      { status: citiesResult.status }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      county: {
        id: county.id,
        name: county.name,
        state: county.state,
        slug: county.slug,
      },
      cities: citiesResult.data.map(city => ({
        id: city.id,
        name: city.name,
        slug: city.slug,
      })),
    },
  })
}

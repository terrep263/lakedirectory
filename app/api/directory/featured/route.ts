/**
 * MODULE 9: Public Business Directory
 * GET /api/directory/featured
 *
 * Purpose: Featured content feed
 * Authorization: None (public endpoint)
 * Rules:
 *   - Only admin-selected featured entities
 *   - Respect startAt / endAt time bounds
 *   - No AI override of admin selections
 *   - Read-only
 */

import { NextRequest, NextResponse } from 'next/server'
import { getFeaturedContent } from '@/lib/directory'

export async function GET(request: NextRequest) {
  // Fetch featured content (respects time bounds, ONLY ACTIVE entities)
  const featured = await getFeaturedContent()

  // Set cache headers for public caching
  const response = NextResponse.json({
    success: true,
    data: {
      businesses: featured.businesses,
      deals: featured.deals,
    },
    counts: {
      businesses: featured.businesses.length,
      deals: featured.deals.length,
    },
  })

  // Cache for 5 minutes, allow stale for 1 hour
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=3600'
  )

  return response
}

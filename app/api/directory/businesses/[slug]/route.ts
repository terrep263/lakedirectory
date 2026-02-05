/**
 * MODULE 9: Public Business Directory
 * GET /api/directory/businesses/:slug
 *
 * Purpose: Business detail page
 * Authorization: None (public endpoint)
 * Rules:
 *   - Must resolve to ACTIVE business
 *   - Include ACTIVE deals for that business
 *   - Include SEO metadata for sharing
 *   - Read-only
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBusinessBySlug } from '@/lib/directory'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Business slug is required' },
      { status: 400 }
    )
  }

  // Get base URL for canonical URLs
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('host') || 'localhost'
  const baseUrl = `${protocol}://${host}`

  // Fetch business (ONLY returns if ACTIVE)
  const result = await getBusinessBySlug(slug, baseUrl)

  if (!result) {
    // Return 404 for non-existent or non-ACTIVE businesses
    // This hides the existence of INACTIVE/SUSPENDED businesses
    return NextResponse.json(
      { success: false, error: 'Business not found' },
      { status: 404 }
    )
  }

  // Set cache headers for public caching
  const response = NextResponse.json({
    success: true,
    data: result.business,
    deals: result.deals,
    seo: result.seo,
  })

  // Cache for 5 minutes, allow stale for 1 hour
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=3600'
  )

  return response
}

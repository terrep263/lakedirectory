import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/home/featured-businesses
 * Fetch featured businesses for homepage display
 * 
 * SPEC COMPLIANCE:
 * - SCHEMA TRUTH: Featured flag exists on BusinessPage (authoritative display layer)
 * - Filter by BusinessPage.isFeatured = true AND isPublished = true
 * - Order by BusinessPage.featuredAt DESC (most recently featured first)
 * - Return business details needed for card display (via Business relation)
 * 
 * Query Parameters:
 * - limit: number (optional, default 2) - number of featured businesses to return
 *
 * Returns:
 * - Array of featured businesses with key details
 * - Empty array if no featured businesses found
 */
export async function GET(request: NextRequest) {
  try {
    // Get optional limit parameter
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 2
    const limit = Math.min(isNaN(parsedLimit) ? 2 : parsedLimit, 10) // Max 10 to prevent abuse

    if (limit < 1) {
      return NextResponse.json(
        { error: 'Limit must be at least 1' },
        { status: 400 }
      )
    }

    const featuredPages = await prisma.businessPage.findMany({
      where: {
        isPublished: true,
        isFeatured: true,
        business: { businessStatus: 'ACTIVE' },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        heroImageUrl: true,
        locationText: true,
        featuredAt: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            category: true,
            city: true,
            state: true,
            phone: true,
            website: true,
            logoUrl: true,
            coverUrl: true,
            recommendationCount: true,
            aggregateRating: true,
            totalRatings: true,
          },
        },
      },
      orderBy: { featuredAt: 'desc' }, // Most recently featured first
      take: limit,
    })

    // Transform to response format (matching what homepage cards expect)
    const businesses = featuredPages.map((p) => ({
      id: p.business.id,
      name: p.business.name || p.title,
      slug: p.business.slug || p.slug,
      city: p.business.city,
      primaryCategory: p.business.category,
      rating: p.business.aggregateRating,
      reviewCount: p.business.totalRatings || 0,
      // Prefer coverUrl, fallback to logoUrl, then page hero image
      primaryImagePath: p.business.coverUrl || p.business.logoUrl || p.heroImageUrl,
      recommendationCount: p.business.recommendationCount,
      description: p.business.description,
      featuredAt: p.featuredAt,
    }))

    return NextResponse.json(
      {
        count: businesses.length,
        businesses,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching featured businesses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch featured businesses' },
      { status: 500 }
    )
  }
}


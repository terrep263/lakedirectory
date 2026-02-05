import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/home/featured
 *
 * Returns featured BusinessPages for homepage display.
 * Queries BusinessPage where isPublished=true and isFeatured=true.
 * Orders by featuredAt DESC, limits to 4 (default).
 *
 * Returns: BusinessPage display fields plus enough Business fields
 * to render the homepage "app-style" cards (category/ratings/price).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '4', 10) || 4, 1), 12);

    // Query featured, published BusinessPages
    const pages = await prisma.businessPage.findMany({
      where: {
        isPublished: true,
        isFeatured: true,
      },
      orderBy: {
        featuredAt: 'desc',
      },
      take: limit,
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
            category: true,
            city: true,
            state: true,
            coverUrl: true,
            logoUrl: true,
            isVerified: true,
            ownerId: true,
            createdAt: true,
            aggregateRating: true,
            totalRatings: true,
            priceLevel: true,
            priceRange: true,
            _count: {
              select: {
                deals: {
                  where: {
                    dealStatus: 'ACTIVE',
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      count: pages.length,
      pages,
    });

  } catch (error) {
    console.error('Error fetching featured pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured pages' },
      { status: 500 }
    );
  }
}

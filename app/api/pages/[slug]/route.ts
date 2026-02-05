import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/pages/{slug}
 *
 * Returns a published BusinessPage by slug.
 * Includes heroImageUrl, title, locationText, aiDescription, and related business data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // Find published BusinessPage by slug
    const page = await prisma.businessPage.findUnique({
      where: { slug },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            category: true,
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
            phone: true,
            website: true,
            aggregateRating: true,
            totalRatings: true,
            recommendationCount: true,
            formattedAddress: true,
            latitude: true,
            longitude: true,
            hours: true,
            coverUrl: true,
            logoUrl: true,
            photos: true,
            deals: {
              where: {
                dealStatus: 'ACTIVE',
              },
              select: {
                id: true,
                title: true,
                description: true,
                originalValue: true,
                dealPrice: true,
                redemptionWindowEnd: true,
              },
            },
          },
        },
      },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Check if page is published
    if (!page.isPublished) {
      return NextResponse.json({ error: 'Page not published' }, { status: 404 });
    }

    // Build response
    return NextResponse.json({
      id: page.id,
      slug: page.slug,
      title: page.title,
      heroImageUrl: page.heroImageUrl,
      locationText: page.locationText,
      aiDescription: page.aiDescription,
      isFeatured: page.isFeatured,
      featuredAt: page.featuredAt,
      publishedAt: page.publishedAt,
      businessId: page.businessId,
      business: page.business,
    });

  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    );
  }
}

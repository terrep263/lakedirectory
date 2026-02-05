import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/identity'

/**
 * GET /api/admin/business/[businessId]
 * Fetch comprehensive business details for admin view
 *
 * Returns:
 * - Full business record with all fields
 * - Associated deals
 * - Share events
 * - Recommendation data
 * - Reward events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    // GUARD: Admin only
    const adminResult = await requireAdmin(request)
    if (!adminResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: adminResult.status || 403 }
      )
    }

    const { businessId } = await params

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Fetch comprehensive business data
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        address: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zipCode: true,
        postalCode: true,
        phone: true,
        website: true,
        logoUrl: true,
        coverUrl: true,
        latitude: true,
        longitude: true,
        isVerified: true,
        businessStatus: true,
        countyId: true,
        cityId: true,
        recommendationCount: true,
        monthlyVoucherAllowance: true,
        createdAt: true,
        updatedAt: true,

        // Relations
        deals: {
          select: {
            id: true,
            title: true,
            description: true,
            dealStatus: true,
            originalValue: true,
            dealPrice: true,
            voucherQuantityLimit: true,
            redemptionWindowStart: true,
            redemptionWindowEnd: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },

        county: {
          select: {
            id: true,
            name: true,
            slug: true,
            launchStatus: true,
          },
        },

        cityRef: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    if (!business) {
      return NextResponse.json(
        { error: `Business not found: ${businessId}` },
        { status: 404 }
      )
    }

    // Fetch engagement metrics
    const [shareCount, recommendationCount, rewardTotal] = await Promise.all([
      prisma.shareEvent.count({
        where: { businessId },
      }),
      prisma.recommendation.count({
        where: { businessId },
      }),
      prisma.rewardEvent.aggregate({
        where: {
          eventType: 'SHARE',
          // Filter by business if possible through shareEvent relation
        },
        _sum: { points: true },
      }),
    ])

    return NextResponse.json(
      {
        business,
        metrics: {
          totalShares: shareCount,
          totalRecommendations: recommendationCount,
          totalRewardPoints: rewardTotal._sum.points || 0,
          dealsCount: business.deals.length,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching business details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business details' },
      { status: 500 }
    )
  }
}

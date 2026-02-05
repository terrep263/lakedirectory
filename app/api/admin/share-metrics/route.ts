import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/identity'

/**
 * GET /api/admin/share-metrics
 * Get overall share metrics across all businesses or filtered by county
 * 
 * Query Parameters:
 * - countyId: string (optional) - filter by specific county
 * 
 * Returns:
 * - Total shares by platform
 * - Top shared businesses
 * - Total rewards given for shares
 */
export async function GET(request: NextRequest) {
  try {
    // GUARD: Admin only
    const adminResult = await requireAdmin(request)
    if (!adminResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: adminResult.status || 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const countyId = searchParams.get('countyId')

    const where = countyId ? { countyId } : {}

    // Get share statistics
    const [
      totalShares,
      facebookShares,
      instagramShares,
      twitterShares,
      linkedinShares,
      totalRewardsGiven,
      topSharedBusinesses,
      recentShares,
    ] = await Promise.all([
      // Total shares
      prisma.shareEvent.count({ where }),
      
      // Facebook shares
      prisma.shareEvent.count({ where: { ...where, platform: 'facebook' } }),
      
      // Instagram shares
      prisma.shareEvent.count({ where: { ...where, platform: 'instagram' } }),
      
      // Twitter shares
      prisma.shareEvent.count({ where: { ...where, platform: 'twitter' } }),
      
      // LinkedIn shares
      prisma.shareEvent.count({ where: { ...where, platform: 'linkedin' } }),
      
      // Total rewards given for shares
      prisma.rewardEvent.aggregate({
        where: { ...where, eventType: 'share' },
        _sum: { points: true },
      }),
      
      // Top 10 shared businesses
      prisma.shareEvent.groupBy({
        by: ['businessId'],
        where: {
          ...where,
          businessId: { not: null },
        },
        _count: {
          businessId: true,
        },
        orderBy: {
          _count: {
            businessId: 'desc',
          },
        },
        take: 10,
      }),
      
      // Recent shares
      prisma.shareEvent.findMany({
        where,
        take: 50,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
          business: {
            select: {
              id: true,
              name: true,
            },
          },
          deal: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
    ])

    // Fetch business details for top shared businesses
    const businessIds = topSharedBusinesses
      .map((item) => item.businessId)
      .filter((id): id is string => id !== null)
    
    const businesses = await prisma.business.findMany({
      where: {
        id: { in: businessIds },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    })

    const businessMap = new Map(businesses.map((b) => [b.id, b]))

    const topSharedWithDetails = topSharedBusinesses
      .filter((item) => item.businessId)
      .map((item) => {
        const business = businessMap.get(item.businessId!)
        return {
          businessId: item.businessId,
          businessName: business?.name || 'Unknown',
          businessSlug: business?.slug,
          shareCount: item._count.businessId,
        }
      })

    return NextResponse.json({
      summary: {
        totalShares,
        byPlatform: {
          facebook: facebookShares,
          instagram: instagramShares,
          twitter: twitterShares,
          linkedin: linkedinShares,
        },
        totalRewardsGiven: totalRewardsGiven._sum.points || 0,
      },
      topSharedBusinesses: topSharedWithDetails,
      recentShares: recentShares.map((share) => ({
        id: share.id,
        platform: share.platform,
        userEmail: share.user.email,
        business: share.business
          ? {
              id: share.business.id,
              name: share.business.name,
            }
          : null,
        deal: share.deal
          ? {
              id: share.deal.id,
              title: share.deal.title,
            }
          : null,
        createdAt: share.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching share metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch share metrics' },
      { status: 500 }
    )
  }
}

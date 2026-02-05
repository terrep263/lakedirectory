import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/identity'

/**
 * GET /api/admin/share-metrics/[businessId]
 * Get share metrics for a specific business
 * 
 * Returns:
 * - Facebook share count
 * - Instagram share count
 * - Twitter share count
 * - LinkedIn share count
 * - Total shares across all platforms
 * - Recent shares with user info
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

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Query the share counts by platform
    const [
      facebookShares, 
      instagramShares,
      twitterShares, 
      linkedinShares,
      totalShares,
      recentShares,
    ] = await Promise.all([
      // Facebook shares
      prisma.shareEvent.count({
        where: {
          businessId,
          platform: 'facebook',
        },
      }),
      
      // Instagram shares
      prisma.shareEvent.count({
        where: {
          businessId,
          platform: 'instagram',
        },
      }),
      
      // Twitter shares
      prisma.shareEvent.count({
        where: {
          businessId,
          platform: 'twitter',
        },
      }),
      
      // LinkedIn shares
      prisma.shareEvent.count({
        where: {
          businessId,
          platform: 'linkedin',
        },
      }),
      
      // Total shares (all platforms)
      prisma.shareEvent.count({
        where: {
          businessId,
        },
      }),
      
      // Recent shares with user info
      prisma.shareEvent.findMany({
        where: {
          businessId,
        },
        take: 20,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      business: {
        id: business.id,
        name: business.name,
      },
      shares: {
        byPlatform: {
          facebook: facebookShares,
          instagram: instagramShares,
          twitter: twitterShares,
          linkedin: linkedinShares,
        },
        total: totalShares,
      },
      recentShares: recentShares.map((share) => ({
        id: share.id,
        platform: share.platform,
        userId: share.userId,
        userEmail: share.user.email,
        createdAt: share.createdAt,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch share metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch share metrics' },
      { status: 500 }
    )
  }
}

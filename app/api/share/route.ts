import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveIdentity, authFailure } from '@/lib/identity'
import { assignShareReward } from '@/lib/rewards'

/**
 * POST /api/share
 * Records a social media share event
 * 
 * Request Body:
 * - businessId: string (optional)
 * - dealId: string (optional)
 * - platform: string ('facebook', 'instagram', 'twitter', 'linkedin', etc.)
 * - countyId: string (required)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireActiveIdentity(request)
    if (!authResult.success) return authFailure(authResult)

    const body = await request.json()
    const { businessId, dealId, platform, countyId } = body

    // Validate required fields
    if (!platform) {
      return NextResponse.json(
        { error: 'Missing required field: platform' },
        { status: 400 }
      )
    }

    if (!countyId) {
      return NextResponse.json(
        { error: 'Missing required field: countyId' },
        { status: 400 }
      )
    }

    // At least one of businessId or dealId must be provided
    if (!businessId && !dealId) {
      return NextResponse.json(
        { error: 'Either businessId or dealId must be provided' },
        { status: 400 }
      )
    }

    // Get user identity
    const user = await prisma.userIdentity.findUnique({
      where: { email: authResult.data.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Validate that business exists (if provided)
    if (businessId) {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      })

      if (!business) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        )
      }
    }

    // Validate that deal exists (if provided)
    if (dealId) {
      const deal = await prisma.deal.findUnique({
        where: { id: dealId },
      })

      if (!deal) {
        return NextResponse.json(
          { error: 'Deal not found' },
          { status: 404 }
        )
      }
    }

    // Create share event
    const shareEvent = await prisma.shareEvent.create({
      data: {
        userId: user.id,
        businessId: businessId || null,
        dealId: dealId || null,
        platform,
        countyId,
      },
    })

    // Assign reward points for the share
    await assignShareReward(user.id, platform, countyId)

    // Get updated reward balance
    const updatedUser = await prisma.userIdentity.findUnique({
      where: { id: user.id },
      select: { rewardBalance: true },
    })

    return NextResponse.json({
      message: 'Share event recorded successfully',
      shareEvent: {
        id: shareEvent.id,
        platform: shareEvent.platform,
        createdAt: shareEvent.createdAt,
      },
      rewards: {
        pointsEarned: 5,
        newBalance: updatedUser?.rewardBalance || 0,
      },
    })
  } catch (error) {
    console.error('Error recording share event:', error)
    return NextResponse.json(
      { error: 'Failed to record share event' },
      { status: 500 }
    )
  }
}

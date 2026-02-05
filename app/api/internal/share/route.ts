import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assignShareReward } from '@/lib/rewards'

/**
 * POST /api/internal/share
 * Internal endpoint to log share events
 * 
 * Request Body:
 * - userId: string (required)
 * - businessId: string (optional)
 * - dealId: string (optional)
 * - platform: string (required) - 'facebook', 'instagram', 'twitter', 'linkedin'
 * - countyId: string (required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, businessId, dealId, platform, countyId } = body

    // Validate required fields
    if (!userId || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and platform are required' },
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

    // Validate user exists
    const user = await prisma.userIdentity.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Validate business exists (if provided)
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

    // Validate deal exists (if provided)
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

    // Check share limits before logging
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0)

    // Get today's shares
    const todayShares = await prisma.shareEvent.count({
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
    })

    // Get this week's reward events for shares
    const weeklyShareRewards = await prisma.rewardEvent.findMany({
      where: {
        userId,
        eventType: 'share',
        createdAt: { gte: weekStart },
      },
      select: {
        points: true,
        createdAt: true,
      },
    })

    // Calculate weekly points and days with shares
    const weeklyPoints = weeklyShareRewards.reduce((sum, event) => sum + event.points, 0)
    
    // Get unique days this week that earned rewards
    const daysWithShares = new Set(
      weeklyShareRewards.map(event => 
        new Date(event.createdAt).toDateString()
      )
    ).size

    // Check if today already has shares (to count towards 2-day limit)
    const todayDateString = todayStart.toDateString()
    const todayHasShares = weeklyShareRewards.some(event => 
      new Date(event.createdAt).toDateString() === todayDateString
    )

    // Determine if rewards can be earned
    let canEarnRewards = true
    let limitMessage = null

    if (todayShares >= 5) {
      canEarnRewards = false
      limitMessage = 'Daily limit reached: Maximum 5 shares per day'
    } else if (weeklyPoints >= 25) {
      canEarnRewards = false
      limitMessage = 'Weekly limit reached: Maximum 25 points per week'
    } else if (!todayHasShares && daysWithShares >= 2) {
      canEarnRewards = false
      limitMessage = 'Weekly days limit reached: You can only earn points on 2 days per week'
    }

    // Log share event to ShareEvent model (always log, even if no rewards)
    const shareEvent = await prisma.shareEvent.create({
      data: {
        userId,
        businessId: businessId || null,
        dealId: dealId || null,
        platform,
        countyId,
      },
    })

    let pointsEarned = 0

    // Assign reward points for sharing (only if within limits)
    if (canEarnRewards) {
      await assignShareReward(userId, platform, countyId)
      pointsEarned = 1
    }

    // Get updated user balance
    const updatedUser = await prisma.userIdentity.findUnique({
      where: { id: userId },
      select: { rewardBalance: true },
    })

    return NextResponse.json({
      message: limitMessage || 'Share event recorded successfully',
      shareEvent: {
        id: shareEvent.id,
        platform: shareEvent.platform,
        createdAt: shareEvent.createdAt,
      },
      rewards: {
        pointsEarned,
        newBalance: updatedUser?.rewardBalance || 0,
        limitReached: !canEarnRewards,
        limitMessage,
        dailySharesUsed: todayShares + 1,
        dailySharesLimit: 5,
        weeklyPointsUsed: weeklyPoints + pointsEarned,
        weeklyPointsLimit: 25,
        weeklyDaysUsed: todayHasShares ? daysWithShares : daysWithShares + 1,
        weeklyDaysLimit: 2,
      },
    })
  } catch (error) {
    console.error('Failed to log share event:', error)
    return NextResponse.json(
      { error: 'Failed to log share event' },
      { status: 500 }
    )
  }
}

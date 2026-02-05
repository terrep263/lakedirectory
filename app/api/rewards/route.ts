import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveIdentity, authFailure } from '@/lib/identity'
import { getUserRewardBalance, getUserRewardHistory } from '@/lib/rewards'

/**
 * GET /api/rewards
 * Get current user's reward balance and history
 * 
 * Query Parameters:
 * - limit: number (optional, default 50) - number of recent events to return
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireActiveIdentity(request)
    if (!authResult.success) return authFailure(authResult)

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Get reward balance and history
    const [balance, history] = await Promise.all([
      getUserRewardBalance(user.id),
      getUserRewardHistory(user.id, limit),
    ])

    return NextResponse.json({
      balance,
      history,
      totalEvents: history.length,
    })
  } catch (error) {
    console.error('Error fetching rewards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    )
  }
}

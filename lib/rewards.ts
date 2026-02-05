import { prisma } from './prisma'
import { PrismaClient } from '@prisma/client'

/**
 * Assign reward points to a user for a specific action
 * 
 * @param userId - The user's identity ID
 * @param points - Number of points to award
 * @param eventType - Type of reward event (share, referral, recommendation, etc.)
 * @param description - Optional description of the reward
 * @param countyId - Optional county ID for county-scoped rewards
 * @param tx - Optional transaction client for atomic operations
 */
export async function assignRewardPoints(
  userId: string,
  points: number,
  eventType: string,
  description?: string,
  countyId?: string,
  tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
) {
  const client = tx || prisma

  // Create reward event record
  await client.rewardEvent.create({
    data: {
      userId,
      points,
      eventType,
      description: description || `Reward for ${eventType}`,
      countyId: countyId || null,
    },
  })

  // Update user's reward balance
  await client.userIdentity.update({
    where: { id: userId },
    data: {
      rewardBalance: {
        increment: points,
      },
    },
  })
}

/**
 * Assign share reward points
 * Default: 1 point per share
 */
export async function assignShareReward(
  userId: string,
  platform: string,
  countyId?: string
) {
  const SHARE_REWARD_POINTS = 1

  await assignRewardPoints(
    userId,
    SHARE_REWARD_POINTS,
    'share',
    `Reward for sharing on ${platform}`,
    countyId
  )
}

/**
 * Get user's current reward balance
 */
export async function getUserRewardBalance(userId: string): Promise<number> {
  const user = await prisma.userIdentity.findUnique({
    where: { id: userId },
    select: { rewardBalance: true },
  })

  return user?.rewardBalance || 0
}

/**
 * Get user's reward history
 */
export async function getUserRewardHistory(userId: string, limit = 50) {
  return await prisma.rewardEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

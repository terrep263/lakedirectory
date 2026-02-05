/**
 * SHARE TRACKING & REWARDS SYSTEM
 * 
 * This file demonstrates how to use the complete share tracking and rewards system.
 */

// =============================================================================
// CLIENT-SIDE USAGE
// =============================================================================

import { ShareTracking } from '@/components/ShareTracking'
import { RewardsDisplay } from '@/components/RewardsDisplay'

// Example 1: Share a business
export function ShareBusinessButton({ 
  businessId, 
  countyId,
  businessUrl 
}: { 
  businessId: string
  countyId: string
  businessUrl: string
}) {
  return (
    <ShareTracking
      businessId={businessId}
      countyId={countyId}
      platform="facebook"
      shareUrl={businessUrl}
    >
      {({ handleShare, isSharing, pointsEarned }) => (
        <div>
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSharing ? 'Sharing...' : 'Share on Facebook'}
          </button>
          {pointsEarned && (
            <p className="text-sm text-green-600 mt-2">
              +{pointsEarned} points earned! 🎉
            </p>
          )}
        </div>
      )}
    </ShareTracking>
  )
}

// Example 2: Share a deal
export function ShareDealButton({ 
  dealId, 
  countyId,
  dealUrl 
}: { 
  dealId: string
  countyId: string
  dealUrl: string
}) {
  return (
    <div className="flex gap-2">
      {/* Facebook */}
      <ShareTracking
        dealId={dealId}
        countyId={countyId}
        platform="facebook"
        shareUrl={dealUrl}
      >
        {({ handleShare, isSharing }) => (
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="p-2 bg-blue-600 text-white rounded-full"
          >
            📘
          </button>
        )}
      </ShareTracking>

      {/* Twitter */}
      <ShareTracking
        dealId={dealId}
        countyId={countyId}
        platform="twitter"
        shareUrl={dealUrl}
      >
        {({ handleShare, isSharing }) => (
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="p-2 bg-sky-500 text-white rounded-full"
          >
            🐦
          </button>
        )}
      </ShareTracking>

      {/* LinkedIn */}
      <ShareTracking
        dealId={dealId}
        countyId={countyId}
        platform="linkedin"
        shareUrl={dealUrl}
      >
        {({ handleShare, isSharing }) => (
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="p-2 bg-blue-700 text-white rounded-full"
          >
            💼
          </button>
        )}
      </ShareTracking>
    </div>
  )
}

// Example 3: Display user rewards
export function UserDashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>
      
      {/* Display rewards balance and history */}
      <RewardsDisplay />
    </div>
  )
}

// =============================================================================
// SERVER-SIDE USAGE (API Routes)
// =============================================================================

/**
 * Manual reward assignment (e.g., for admin actions)
 */
import { assignRewardPoints } from '@/lib/rewards'

export async function giveReferralReward(userId: string, countyId: string) {
  await assignRewardPoints(
    userId,
    10,
    'referral',
    'Reward for referring a friend',
    countyId
  )
}

export async function giveSignupBonus(userId: string, countyId: string) {
  await assignRewardPoints(
    userId,
    25,
    'signup',
    'Welcome bonus for signing up',
    countyId
  )
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * POST /api/share
 * 
 * Records a share event and awards points
 * 
 * Request:
 * {
 *   "businessId": "abc123",  // optional
 *   "dealId": "def456",      // optional (at least one required)
 *   "platform": "facebook",  // required
 *   "countyId": "county123"  // required
 * }
 * 
 * Response:
 * {
 *   "message": "Share event recorded successfully",
 *   "shareEvent": {
 *     "id": "xyz789",
 *     "platform": "facebook",
 *     "createdAt": "2026-01-26T..."
 *   },
 *   "rewards": {
 *     "pointsEarned": 5,
 *     "newBalance": 45
 *   }
 * }
 */

/**
 * GET /api/rewards?limit=50
 * 
 * Gets user's reward balance and history
 * 
 * Response:
 * {
 *   "balance": 45,
 *   "history": [
 *     {
 *       "id": "xyz789",
 *       "points": 5,
 *       "eventType": "share",
 *       "description": "Reward for sharing on facebook",
 *       "createdAt": "2026-01-26T..."
 *     }
 *   ],
 *   "totalEvents": 1
 * }
 */

// =============================================================================
// ADMIN DASHBOARD METRICS
// =============================================================================

/**
 * Get share statistics for admin dashboard
 */
import { prisma } from '@/lib/prisma'

export async function getShareStatistics(countyId?: string) {
  const where = countyId ? { countyId } : {}
  
  const [
    totalShares,
    facebookShares,
    instagramShares,
    twitterShares,
    linkedinShares,
    totalRewardsGiven,
  ] = await Promise.all([
    prisma.shareEvent.count({ where }),
    prisma.shareEvent.count({ where: { ...where, platform: 'facebook' } }),
    prisma.shareEvent.count({ where: { ...where, platform: 'instagram' } }),
    prisma.shareEvent.count({ where: { ...where, platform: 'twitter' } }),
    prisma.shareEvent.count({ where: { ...where, platform: 'linkedin' } }),
    prisma.rewardEvent.aggregate({
      where: { ...where, eventType: 'share' },
      _sum: { points: true },
    }),
  ])
  
  return {
    totalShares,
    byPlatform: {
      facebook: facebookShares,
      instagram: instagramShares,
      twitter: twitterShares,
      linkedin: linkedinShares,
    },
    totalRewardsGiven: totalRewardsGiven._sum.points || 0,
  }
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Adjust reward points in lib/rewards.ts
 * 
 * Default values:
 * - Share: 5 points
 * - Referral: 10 points (example above)
 * - Signup: 25 points (example above)
 * 
 * Customize by modifying the assignRewardPoints function calls
 */

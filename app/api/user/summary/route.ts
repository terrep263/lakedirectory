/**
 * MODULE 10: User Visibility (Vouchers & History)
 * GET /api/user/summary - Complete user data summary with AI assistance
 *
 * Authorization: USER only
 *
 * This endpoint provides:
 * - All vouchers, purchases, and redemptions
 * - AI-generated summary (non-authoritative)
 * - Expiration reminders
 *
 * HARD RULES:
 * - Users may only see their own data
 * - All data is read-only
 * - AI may summarize, never alter
 * - Low AI confidence → suppressed output
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireUserRoleForVisibility,
  getUserVouchers,
  getUserPurchases,
  getUserRedemptions,
  generateAIAssistance,
  visibilityFailure,
} from '@/lib/user-visibility'

export async function GET(request: NextRequest) {
  // 1. GUARD: Require USER role
  const userResult = await requireUserRoleForVisibility(request)
  if (!userResult.success) {
    return visibilityFailure(userResult)
  }

  const identity = userResult.data

  // 2. QUERY: Fetch all user data in parallel
  const [vouchersResult, purchasesResult, redemptionsResult] = await Promise.all([
    getUserVouchers(identity.id),
    getUserPurchases(identity.id),
    getUserRedemptions(identity.id),
  ])

  // Handle failures
  if (!vouchersResult.success) {
    return visibilityFailure(vouchersResult)
  }
  if (!purchasesResult.success) {
    return visibilityFailure(purchasesResult)
  }
  if (!redemptionsResult.success) {
    return visibilityFailure(redemptionsResult)
  }

  // 3. GENERATE AI ASSISTANCE (non-authoritative)
  const aiAssistance = generateAIAssistance({
    identity,
    vouchers: vouchersResult.data,
    purchases: purchasesResult.data,
    redemptions: redemptionsResult.data,
  })

  // 4. Return complete summary
  return NextResponse.json({
    success: true,
    data: {
      vouchers: vouchersResult.data,
      purchases: purchasesResult.data,
      redemptions: redemptionsResult.data,
    },
    meta: {
      vouchers: {
        total: vouchersResult.data.length,
        active: vouchersResult.data.filter((v) => v.status === 'ASSIGNED').length,
        redeemed: vouchersResult.data.filter((v) => v.status === 'REDEEMED').length,
        expired: vouchersResult.data.filter((v) => v.status === 'EXPIRED').length,
      },
      purchases: {
        total: purchasesResult.data.length,
      },
      redemptions: {
        total: redemptionsResult.data.length,
      },
    },
    // AI assistance is clearly labeled as non-authoritative
    ai: aiAssistance.suppressed
      ? {
          available: false,
          reason: aiAssistance.reason,
        }
      : {
          available: true,
          summary: aiAssistance.summary,
          reminders: aiAssistance.reminders,
          // Explicit disclaimer
          disclaimer: 'AI-generated summary for convenience. Refer to raw data for authoritative information.',
        },
  })
}

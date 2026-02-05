/**
 * MODULE 10: User Visibility (Vouchers & History)
 * GET /api/user/redemptions - View redemption history
 *
 * Authorization: USER only
 * Rules: Return only redemptions for vouchers owned by user
 *
 * HARD RULES:
 * - Users may only see their own data
 * - Redemption data is read-only
 * - No mutations permitted
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireUserRoleForVisibility,
  getUserRedemptions,
  visibilityFailure,
} from '@/lib/user-visibility'

export async function GET(request: NextRequest) {
  // 1. GUARD: Require USER role
  const userResult = await requireUserRoleForVisibility(request)
  if (!userResult.success) {
    return visibilityFailure(userResult)
  }

  const identity = userResult.data

  // 2. QUERY: Fetch user's redemptions
  const redemptionsResult = await getUserRedemptions(identity.id)
  if (!redemptionsResult.success) {
    return visibilityFailure(redemptionsResult)
  }

  // 3. Return read-only view
  return NextResponse.json({
    success: true,
    data: redemptionsResult.data,
    meta: {
      total: redemptionsResult.data.length,
    },
  })
}

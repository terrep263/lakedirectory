/**
 * MODULE 10: User Visibility (Vouchers & History)
 * GET /api/user/purchases - View purchase history
 *
 * Authorization: USER only
 * Rules: Return only purchases made by user
 *
 * HARD RULES:
 * - Users may only see their own data
 * - Purchase data is read-only
 * - No mutations permitted
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireUserRoleForVisibility,
  getUserPurchases,
  visibilityFailure,
} from '@/lib/user-visibility'

export async function GET(request: NextRequest) {
  // 1. GUARD: Require USER role
  const userResult = await requireUserRoleForVisibility(request)
  if (!userResult.success) {
    return visibilityFailure(userResult)
  }

  const identity = userResult.data

  // 2. QUERY: Fetch user's purchases
  const purchasesResult = await getUserPurchases(identity.id)
  if (!purchasesResult.success) {
    return visibilityFailure(purchasesResult)
  }

  // 3. Return read-only view
  return NextResponse.json({
    success: true,
    data: purchasesResult.data,
    meta: {
      total: purchasesResult.data.length,
    },
  })
}

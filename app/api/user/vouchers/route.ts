/**
 * MODULE 10: User Visibility (Vouchers & History)
 * GET /api/user/vouchers - View owned vouchers
 *
 * Authorization: USER only
 * Rules: Return only vouchers assigned to user
 *
 * HARD RULES:
 * - Users may only see their own data
 * - Voucher data is read-only
 * - Status reflects enforcement truth exactly
 * - EXPIRED and REDEEMED vouchers must be clearly labeled
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireUserRoleForVisibility,
  getUserVouchers,
  visibilityFailure,
} from '@/lib/user-visibility'

export async function GET(request: NextRequest) {
  // 1. GUARD: Require USER role
  const userResult = await requireUserRoleForVisibility(request)
  if (!userResult.success) {
    return visibilityFailure(userResult)
  }

  const identity = userResult.data

  // 2. QUERY: Fetch user's vouchers
  const vouchersResult = await getUserVouchers(identity.id)
  if (!vouchersResult.success) {
    return visibilityFailure(vouchersResult)
  }

  // 3. Optional: Parse status filter from query params
  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')

  let vouchers = vouchersResult.data

  // Apply filter if provided
  if (statusFilter) {
    const validStatuses = ['ASSIGNED', 'REDEEMED', 'EXPIRED']
    if (validStatuses.includes(statusFilter.toUpperCase())) {
      vouchers = vouchers.filter(
        (v) => v.status === statusFilter.toUpperCase()
      )
    }
  }

  // 4. Return read-only view
  return NextResponse.json({
    success: true,
    data: vouchers,
    meta: {
      total: vouchers.length,
      active: vouchers.filter((v) => v.status === 'ASSIGNED').length,
      redeemed: vouchers.filter((v) => v.status === 'REDEEMED').length,
      expired: vouchers.filter((v) => v.status === 'EXPIRED').length,
    },
  })
}

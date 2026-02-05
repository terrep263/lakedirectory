/**
 * MODULE 10: User Visibility (Vouchers & History)
 * GET /api/user/vouchers/:id - Voucher detail view
 *
 * Authorization: Owning USER only
 * Rules:
 * - Return voucher details only if owned by requesting user
 * - Include QR token for redemption display
 * - No cross-user access
 *
 * HARD RULES:
 * - Users may only see their own data
 * - Voucher data is read-only
 * - Status reflects enforcement truth exactly
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireVoucherOwnership,
  visibilityFailure,
  explainVoucherStatus,
} from '@/lib/user-visibility'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteParams) {
  const { id: voucherId } = await context.params

  // 1. GUARD: Require USER role AND voucher ownership
  const ownershipResult = await requireVoucherOwnership(request, voucherId)
  if (!ownershipResult.success) {
    return visibilityFailure(ownershipResult)
  }

  const { voucher } = ownershipResult.data

  // 2. Generate AI explanation (non-authoritative)
  const statusExplanation = explainVoucherStatus({
    voucherId: voucher.voucherId,
    dealId: voucher.dealId,
    businessName: voucher.businessName,
    dealTitle: voucher.dealTitle,
    status: voucher.status,
    expiresAt: voucher.expiresAt,
    redeemedAt: voucher.redeemedAt,
  })

  // 3. Return detailed read-only view
  return NextResponse.json({
    success: true,
    data: {
      voucherId: voucher.voucherId,
      dealId: voucher.dealId,
      businessName: voucher.businessName,
      dealTitle: voucher.dealTitle,
      dealDescription: voucher.dealDescription,
      status: voucher.status,
      expiresAt: voucher.expiresAt,
      redeemedAt: voucher.redeemedAt,
      qrToken: voucher.qrToken,
      originalValue: voucher.originalValue,
      dealPrice: voucher.dealPrice,
      issuedAt: voucher.issuedAt,
      purchasedAt: voucher.purchasedAt,
    },
    // AI assistance - non-authoritative status explanation
    ai: {
      statusExplanation,
      disclaimer: 'AI-generated explanation. Status field is authoritative.',
    },
  })
}

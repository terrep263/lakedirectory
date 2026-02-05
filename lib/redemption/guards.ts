/**
 * MODULE 5: Redemption Enforcement
 * Guards for voucher redemption authorization.
 *
 * These guards ensure:
 * - Voucher is redeemable (ISSUED, not expired)
 * - Vendor owns the business associated with the voucher
 * - Redemption is atomic (handled at transaction level)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VoucherStatus } from '@prisma/client'
import {
  authenticateIdentity,
  requireRole,
  IdentityRole,
  type IdentityContext,
} from '@/lib/identity'
import type { VoucherContext, RedemptionResult } from './types'
import { isVoucherRedeemable } from './types'

/**
 * ERROR RESPONSES
 * Hard failures with clear error messages. No soft errors.
 */
export const RedemptionErrors = {
  VOUCHER_NOT_FOUND: { error: 'Voucher not found', status: 404 },
  VOUCHER_ALREADY_REDEEMED: { error: 'Voucher has already been redeemed', status: 409 },
  VOUCHER_EXPIRED: { error: 'Voucher has expired', status: 410 },
  VOUCHER_NOT_ISSUED: { error: 'Voucher is not in redeemable state', status: 409 },
  VENDOR_NOT_OWNER: { error: 'You do not own the business associated with this voucher', status: 403 },
  USER_CANNOT_REDEEM: { error: 'USER role cannot redeem vouchers', status: 403 },
  ADMIN_CANNOT_REDEEM: { error: 'ADMIN cannot redeem vouchers directly', status: 403 },
  REDEMPTION_NOT_FOUND: { error: 'Redemption record not found', status: 404 },
  TRANSACTION_FAILED: { error: 'Redemption transaction failed', status: 500 },
  MISSING_IDENTIFIER: { error: 'Either voucherId or qrToken is required', status: 400 },
} as const

/**
 * GUARD: requireVoucherRedeemable
 *
 * Validates that:
 * - Voucher exists
 * - Voucher status is ISSUED
 * - Voucher is not expired
 */
export async function requireVoucherRedeemable(
  voucherId?: string,
  qrToken?: string
): Promise<RedemptionResult<VoucherContext>> {
  if (!voucherId && !qrToken) {
    return { success: false, ...RedemptionErrors.MISSING_IDENTIFIER }
  }

  // Fetch voucher by ID or QR token
  const voucher = await prisma.voucher.findFirst({
    where: voucherId
      ? { id: voucherId }
      : { qrToken: qrToken! },
  })

  if (!voucher) {
    return { success: false, ...RedemptionErrors.VOUCHER_NOT_FOUND }
  }

  // Check if redeemable
  const { redeemable, reason } = isVoucherRedeemable(voucher.status, voucher.expiresAt)

  if (!redeemable) {
    if (voucher.status === VoucherStatus.REDEEMED) {
      return { success: false, ...RedemptionErrors.VOUCHER_ALREADY_REDEEMED }
    }
    if (reason?.includes('expired')) {
      return { success: false, ...RedemptionErrors.VOUCHER_EXPIRED }
    }
    return { success: false, ...RedemptionErrors.VOUCHER_NOT_ISSUED }
  }

  return {
    success: true,
    data: {
      id: voucher.id,
      dealId: voucher.dealId,
      businessId: voucher.businessId,
      status: voucher.status,
      qrToken: voucher.qrToken,
      expiresAt: voucher.expiresAt,
      issuedAt: voucher.issuedAt,
    },
  }
}

/**
 * GUARD: requireVendorBusinessOwnership
 *
 * Validates that the authenticated vendor owns the business
 * associated with the voucher.
 */
export async function requireVendorBusinessOwnership(
  request: NextRequest,
  businessId: string
): Promise<RedemptionResult<{ identity: IdentityContext }>> {
  // Authenticate
  const authResult = await authenticateIdentity(request)
  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  const identity = authResult.data

  // HARD ENFORCEMENT: Only VENDOR can redeem
  if (identity.role === IdentityRole.USER) {
    return { success: false, ...RedemptionErrors.USER_CANNOT_REDEEM }
  }

  if (identity.role === IdentityRole.ADMIN) {
    return { success: false, ...RedemptionErrors.ADMIN_CANNOT_REDEEM }
  }

  // Fetch business to verify ownership
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  })

  if (!business) {
    return { success: false, ...RedemptionErrors.VOUCHER_NOT_FOUND }
  }

  // HARD ENFORCEMENT: Vendor must own the business
  if (business.ownerUserId !== identity.id) {
    return { success: false, ...RedemptionErrors.VENDOR_NOT_OWNER }
  }

  return { success: true, data: { identity } }
}

/**
 * GUARD: canViewRedemption
 *
 * Validates that the caller can view a redemption record:
 * - Owning USER (via voucher.accountId)
 * - Owning VENDOR (business owner)
 * - ADMIN
 */
export async function canViewRedemption(
  request: NextRequest,
  voucherId: string
): Promise<RedemptionResult<{ identity: IdentityContext; redemption: unknown }>> {
  // Authenticate
  const authResult = await authenticateIdentity(request)
  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  const identity = authResult.data

  // Fetch redemption with voucher
  const redemption = await prisma.redemption.findUnique({
    where: { voucherId },
    include: {
      voucher: {
        include: {
          business: true,
        },
      },
    },
  })

  if (!redemption) {
    return { success: false, ...RedemptionErrors.REDEMPTION_NOT_FOUND }
  }

  // ADMIN can view any redemption
  if (identity.role === IdentityRole.ADMIN) {
    return { success: true, data: { identity, redemption } }
  }

  // VENDOR can view if they own the business
  if (identity.role === IdentityRole.VENDOR) {
    if (redemption.voucher.business.ownerUserId === identity.id) {
      return { success: true, data: { identity, redemption } }
    }
  }

  // USER can view if they own the voucher
  if (identity.role === IdentityRole.USER) {
    if (redemption.voucher.accountId === identity.id) {
      return { success: true, data: { identity, redemption } }
    }
  }

  // Not authorized
  return { success: false, ...RedemptionErrors.REDEMPTION_NOT_FOUND }
}

/**
 * Helper: Convert RedemptionResult failure to NextResponse
 */
export function redemptionFailure(result: { error: string; status: number }): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status })
}

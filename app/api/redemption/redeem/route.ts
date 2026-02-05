/**
 * MODULE 5: Redemption Enforcement
 * POST /api/redemption/redeem
 *
 * Purpose: Redeem a voucher
 * Authorization:
 *   - VENDOR only (must own the business)
 * Rules:
 *   - Vendor must own the business
 *   - Voucher must exist
 *   - Voucher must be ISSUED
 *   - Voucher must not be expired
 *   - Redemption must occur in a single ATOMIC transaction
 * Actions:
 *   - Create Redemption record
 *   - Update voucher.status = REDEEMED
 *   - Set redeemedAt timestamp
 * Output:
 *   - Redemption confirmation
 *
 * CRITICAL: This operation is IRREVERSIBLE. There is NO UNDO.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VoucherStatus } from '@prisma/client'
import {
  requireVoucherRedeemable,
  requireVendorBusinessOwnership,
  redemptionFailure,
  RedemptionErrors,
  type RedeemVoucherInput,
} from '@/lib/redemption'

export async function POST(request: NextRequest) {
  // Parse input
  let body: RedeemVoucherInput

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { voucherId, qrToken } = body

  if (!voucherId && !qrToken) {
    return redemptionFailure(RedemptionErrors.MISSING_IDENTIFIER)
  }

  // GUARD 1: Validate voucher is redeemable
  const voucherResult = await requireVoucherRedeemable(voucherId, qrToken)
  if (!voucherResult.success) {
    return redemptionFailure(voucherResult)
  }

  const voucher = voucherResult.data

  // GUARD 2: Validate vendor owns the business
  const ownershipResult = await requireVendorBusinessOwnership(request, voucher.businessId)
  if (!ownershipResult.success) {
    return redemptionFailure(ownershipResult)
  }

  const { identity } = ownershipResult.data

  // Fetch deal for value snapshot
  const deal = await prisma.deal.findUnique({
    where: { id: voucher.dealId },
  })

  if (!deal) {
    return NextResponse.json(
      { error: 'Associated deal not found' },
      { status: 404 }
    )
  }

  const now = new Date()

  // ==========================================================================
  // ATOMIC TRANSACTION: Redemption is irreversible
  // ==========================================================================
  // This transaction:
  // 1. Creates the immutable Redemption record
  // 2. Updates voucher status to REDEEMED
  // 3. Sets redeemedAt timestamp
  //
  // If any part fails, the entire transaction is rolled back.
  // ==========================================================================

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Double-check voucher status inside transaction (race condition prevention)
      const currentVoucher = await tx.voucher.findUnique({
        where: { id: voucher.id },
      })

      if (!currentVoucher) {
        throw new Error('VOUCHER_NOT_FOUND')
      }

      if (currentVoucher.status === VoucherStatus.REDEEMED) {
        throw new Error('ALREADY_REDEEMED')
      }

      if (currentVoucher.status !== VoucherStatus.ISSUED) {
        throw new Error('NOT_REDEEMABLE')
      }

      // Check expiration again inside transaction
      if (currentVoucher.expiresAt && new Date() >= currentVoucher.expiresAt) {
        throw new Error('EXPIRED')
      }

      // Create immutable Redemption record
      const redemption = await tx.redemption.create({
        data: {
          voucherId: voucher.id,
          dealId: voucher.dealId,
          businessId: voucher.businessId,
          vendorUserId: identity.id,
          redeemedAt: now,
          originalValue: deal.originalValue,
          dealPrice: deal.dealPrice,
        },
      })

      // Update voucher status to REDEEMED (irreversible)
      const updatedVoucher = await tx.voucher.update({
        where: { id: voucher.id },
        data: {
          status: VoucherStatus.REDEEMED,
          redeemedAt: now,
          redeemedByBusinessId: voucher.businessId,
          redeemedContext: {
            vendorUserId: identity.id,
            redemptionId: redemption.id,
            timestamp: now.toISOString(),
          },
        },
      })

      return { redemption, voucher: updatedVoucher }
    }, {
      // Serializable isolation for maximum consistency
      isolationLevel: 'Serializable',
    })

    return NextResponse.json({
      redemption: {
        id: result.redemption.id,
        voucherId: result.redemption.voucherId,
        dealId: result.redemption.dealId,
        businessId: result.redemption.businessId,
        redeemedAt: result.redemption.redeemedAt,
        originalValue: result.redemption.originalValue?.toString(),
        dealPrice: result.redemption.dealPrice?.toString(),
      },
      voucher: {
        id: result.voucher.id,
        status: result.voucher.status,
        qrToken: result.voucher.qrToken,
      },
      redeemedBy: identity.id,
      message: 'Voucher redeemed successfully. This action is irreversible.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message === 'ALREADY_REDEEMED') {
      return redemptionFailure(RedemptionErrors.VOUCHER_ALREADY_REDEEMED)
    }
    if (message === 'EXPIRED') {
      return redemptionFailure(RedemptionErrors.VOUCHER_EXPIRED)
    }
    if (message === 'VOUCHER_NOT_FOUND') {
      return redemptionFailure(RedemptionErrors.VOUCHER_NOT_FOUND)
    }
    if (message === 'NOT_REDEEMABLE') {
      return redemptionFailure(RedemptionErrors.VOUCHER_NOT_ISSUED)
    }

    // Check for unique constraint violation (double-spend attempt)
    if (message.includes('Unique constraint')) {
      return redemptionFailure(RedemptionErrors.VOUCHER_ALREADY_REDEEMED)
    }

    console.error('Redemption transaction failed:', error)
    return redemptionFailure(RedemptionErrors.TRANSACTION_FAILED)
  }
}

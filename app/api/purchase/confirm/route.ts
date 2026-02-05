/**
 * MODULE 6: User Purchase Flow
 * POST /api/purchase/confirm
 *
 * Purpose: Confirm payment and atomically assign voucher
 * Authorization:
 *   - USER only (must match payment initiator)
 * Rules:
 *   - Payment must be successful (verified externally)
 *   - Assigns exactly one ISSUED voucher
 *   - Updates voucher.status = ASSIGNED
 *   - Creates Purchase record
 *   - All actions are ATOMIC
 * AI Monitoring:
 *   - Runs AFTER successful purchase (never blocks)
 *   - Creates admin review tasks if thresholds crossed
 *   - Purely observational, no enforcement
 * Output:
 *   - Assigned voucher + purchase receipt
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireUserRole,
  requireActiveDealForPurchase,
  requireAvailableVoucher,
  requireUnusedPaymentIntent,
  assignVoucherToPurchase,
  purchaseFailure,
  PurchaseErrors,
} from '@/lib/purchase'
import {
  runPurchaseMonitoring,
  recordThresholdEvents,
} from '@/lib/purchase/ai-monitoring'
import { authFailure } from '@/lib/identity'

interface ConfirmInput {
  dealId: string
  paymentIntentId: string
  paymentProvider: string
  amountPaid: number
}

export async function POST(request: NextRequest) {
  // HARD ENFORCEMENT: Only USER role may confirm purchase
  const userResult = await requireUserRole(request)
  if (!userResult.success) {
    return authFailure(userResult)
  }

  const user = userResult.data

  // Parse input
  let body: ConfirmInput

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { dealId, paymentIntentId, paymentProvider, amountPaid } = body

  // Validate required fields
  if (!dealId || typeof dealId !== 'string') {
    return purchaseFailure(PurchaseErrors.MISSING_DEAL_ID)
  }

  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    return purchaseFailure(PurchaseErrors.MISSING_PAYMENT_INTENT)
  }

  if (!paymentProvider || typeof paymentProvider !== 'string') {
    return purchaseFailure(PurchaseErrors.MISSING_PAYMENT_PROVIDER)
  }

  if (typeof amountPaid !== 'number' || amountPaid <= 0) {
    return NextResponse.json(
      { error: 'Valid amountPaid is required' },
      { status: 400 }
    )
  }

  // GUARD: Deal must be ACTIVE
  const dealResult = await requireActiveDealForPurchase(dealId)
  if (!dealResult.success) {
    return purchaseFailure(dealResult)
  }

  const deal = dealResult.data

  // Validate payment amount matches deal price
  const dealPrice = deal.dealPrice ? parseFloat(deal.dealPrice) : 0
  if (Math.abs(amountPaid - dealPrice) > 0.01) {
    return purchaseFailure(PurchaseErrors.INVALID_PAYMENT_AMOUNT)
  }

  // GUARD: At least one ISSUED voucher must exist
  const voucherResult = await requireAvailableVoucher(dealId)
  if (!voucherResult.success) {
    return purchaseFailure(voucherResult)
  }

  // GUARD: Payment intent must not have been used
  const paymentResult = await requireUnusedPaymentIntent(paymentIntentId)
  if (!paymentResult.success) {
    return purchaseFailure(paymentResult)
  }

  // ATOMIC OPERATION: Assign voucher and create purchase record
  const assignResult = await assignVoucherToPurchase(
    user.id,
    dealId,
    paymentIntentId,
    paymentProvider,
    amountPaid
  )

  if (!assignResult.success) {
    return purchaseFailure(assignResult)
  }

  const { purchase, voucher } = assignResult.data

  // ==========================================================================
  // AI MONITORING (POST-PURCHASE, READ-ONLY)
  // ==========================================================================
  // This runs AFTER the purchase has successfully completed.
  // It NEVER blocks or reverses purchases.
  // If thresholds are crossed, admin review tasks are created.
  // ==========================================================================
  try {
    const thresholdEvents = await runPurchaseMonitoring(user.id, dealId)

    if (thresholdEvents.length > 0) {
      // Create admin review tasks (non-blocking)
      await recordThresholdEvents(thresholdEvents)

      // Log for observability but do NOT affect response
      console.warn(
        `[Purchase Monitoring] User ${user.id} triggered ${thresholdEvents.length} threshold(s). ` +
        `Purchase ${purchase.id} completed normally. Admin review tasks created.`
      )
    }
  } catch (monitoringError) {
    // Monitoring failures NEVER affect the purchase response
    // Just log and continue - the purchase was successful
    console.error('[Purchase Monitoring] Non-critical monitoring error:', monitoringError)
  }

  // Return purchase receipt
  return NextResponse.json({
    purchase: {
      id: purchase.id,
      userId: purchase.userId,
      dealId: purchase.dealId,
      voucherId: purchase.voucherId,
      amountPaid: purchase.amountPaid,
      paymentProvider: purchase.paymentProvider,
      paymentIntentId: purchase.paymentIntentId,
      status: purchase.status,
      createdAt: purchase.createdAt,
    },
    voucher: {
      id: voucher.id,
      qrToken: voucher.qrToken,
      status: voucher.status,
      expiresAt: voucher.expiresAt,
    },
    deal: {
      id: deal.id,
      title: deal.title,
      originalValue: deal.originalValue,
      dealPrice: deal.dealPrice,
    },
    receipt: {
      purchaseId: purchase.id,
      voucherId: voucher.id,
      qrToken: voucher.qrToken,
      dealTitle: deal.title,
      amountPaid: purchase.amountPaid,
      purchasedAt: purchase.createdAt,
      expiresAt: voucher.expiresAt,
    },
    message: 'Voucher purchased successfully. Present QR code for redemption.',
  })
}

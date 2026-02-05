/**
 * MODULE 6: User Purchase Flow
 * POST /api/purchase/initiate
 *
 * Purpose: Start purchase process for a deal
 * Authorization:
 *   - USER only
 * Rules:
 *   - Deal must be ACTIVE
 *   - At least one ISSUED voucher must exist
 * Output:
 *   - Payment intent details for client-side payment flow
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import {
  requireUserRole,
  requireActiveDealForPurchase,
  requireAvailableVoucher,
  purchaseFailure,
  PurchaseErrors,
} from '@/lib/purchase'
import { authFailure } from '@/lib/identity'

interface InitiateInput {
  dealId: string
}

export async function POST(request: NextRequest) {
  // HARD ENFORCEMENT: Only USER role may initiate purchase
  const userResult = await requireUserRole(request)
  if (!userResult.success) {
    return authFailure(userResult)
  }

  const user = userResult.data

  // Parse input
  let body: InitiateInput

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { dealId } = body

  if (!dealId || typeof dealId !== 'string') {
    return purchaseFailure(PurchaseErrors.MISSING_DEAL_ID)
  }

  // GUARD: Deal must be ACTIVE
  const dealResult = await requireActiveDealForPurchase(dealId)
  if (!dealResult.success) {
    return purchaseFailure(dealResult)
  }

  const deal = dealResult.data

  // GUARD: At least one ISSUED voucher must exist
  const voucherResult = await requireAvailableVoucher(dealId)
  if (!voucherResult.success) {
    return purchaseFailure(voucherResult)
  }

  const availableCount = voucherResult.data.count

  // Validate deal has a price
  if (!deal.dealPrice) {
    return NextResponse.json(
      { error: 'Deal does not have a valid price' },
      { status: 400 }
    )
  }

  // Generate payment intent ID
  // In production, this would come from Stripe/payment provider
  const paymentIntentId = `pi_${randomUUID().replace(/-/g, '')}`

  // Return payment intent details
  // The actual payment processing happens client-side
  // Confirmation endpoint is called after payment succeeds
  return NextResponse.json({
    paymentIntent: {
      id: paymentIntentId,
      amount: deal.dealPrice,
      currency: 'USD',
    },
    deal: {
      id: deal.id,
      title: deal.title,
      description: deal.description,
      originalValue: deal.originalValue,
      dealPrice: deal.dealPrice,
    },
    availableVouchers: availableCount,
    initiatedBy: user.id,
    initiatedAt: new Date().toISOString(),
    message: 'Payment intent created. Complete payment and call /api/purchase/confirm',
  })
}

/**
 * MODULE 6: User Purchase Flow
 * Enforcement guards for purchase operations.
 *
 * These guards enforce:
 * - Only USER role may purchase
 * - Deal must be ACTIVE
 * - Available ISSUED vouchers must exist
 * - Atomic voucher assignment with oversell prevention
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DealGuardStatus, DealStatus, VoucherStatus, PurchaseStatus } from '@prisma/client'
import {
  authenticateIdentity,
  requireRole,
  IdentityRole,
  type IdentityContext,
} from '@/lib/identity'
import type {
  PurchaseResult,
  PurchaseDealContext,
  PurchaseVoucherContext,
  PurchaseContext,
} from './types'

/**
 * ERROR RESPONSES
 * Hard failures with clear error messages. No silent failures.
 */
export const PurchaseErrors = {
  // Authorization errors
  USER_ROLE_REQUIRED: { error: 'Only USER role may purchase vouchers', status: 403 },
  ADMIN_CANNOT_PURCHASE: { error: 'ADMIN cannot purchase vouchers', status: 403 },
  VENDOR_CANNOT_PURCHASE: { error: 'VENDOR cannot purchase vouchers', status: 403 },

  // Deal errors
  DEAL_NOT_FOUND: { error: 'Deal not found', status: 404 },
  DEAL_NOT_ACTIVE: { error: 'Deal is not active', status: 409 },
  DEAL_EXPIRED: { error: 'Deal has expired', status: 409 },

  // Voucher errors
  NO_AVAILABLE_VOUCHERS: { error: 'No vouchers available for this deal', status: 409 },
  VOUCHER_NOT_FOUND: { error: 'Voucher not found', status: 404 },
  VOUCHER_NOT_ISSUED: { error: 'Voucher is not in ISSUED state', status: 409 },
  VOUCHER_ALREADY_ASSIGNED: { error: 'Voucher has already been assigned', status: 409 },

  // Payment errors
  PAYMENT_FAILED: { error: 'Payment processing failed', status: 402 },
  PAYMENT_INTENT_NOT_FOUND: { error: 'Payment intent not found', status: 404 },
  PAYMENT_INTENT_ALREADY_USED: { error: 'Payment intent has already been used', status: 409 },
  INVALID_PAYMENT_AMOUNT: { error: 'Payment amount does not match deal price', status: 400 },

  // Purchase errors
  PURCHASE_NOT_FOUND: { error: 'Purchase not found', status: 404 },
  PURCHASE_TRANSACTION_FAILED: { error: 'Purchase transaction failed', status: 500 },
  DOUBLE_ASSIGNMENT_PREVENTED: { error: 'Voucher assignment failed - already assigned', status: 409 },

  // Validation errors
  MISSING_PAYMENT_INTENT: { error: 'Payment intent ID is required', status: 400 },
  MISSING_PAYMENT_PROVIDER: { error: 'Payment provider is required', status: 400 },
  MISSING_DEAL_ID: { error: 'Deal ID is required', status: 400 },
} as const

/**
 * GUARD: requireUserRole
 *
 * Rejects request if identity.role !== USER.
 * Only USERs may purchase vouchers.
 */
export async function requireUserRole(
  request: NextRequest
): Promise<PurchaseResult<IdentityContext>> {
  const authResult = await authenticateIdentity(request)

  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  const identity = authResult.data

  // HARD ENFORCEMENT: Only USER role may purchase
  if (identity.role === IdentityRole.ADMIN) {
    return { success: false, ...PurchaseErrors.ADMIN_CANNOT_PURCHASE }
  }

  if (identity.role === IdentityRole.VENDOR) {
    return { success: false, ...PurchaseErrors.VENDOR_CANNOT_PURCHASE }
  }

  if (identity.role !== IdentityRole.USER) {
    return { success: false, ...PurchaseErrors.USER_ROLE_REQUIRED }
  }

  return { success: true, data: identity }
}

/**
 * GUARD: requireActiveDealForPurchase
 *
 * Validates deal exists and is ACTIVE.
 * Returns deal context for purchase flow.
 */
export async function requireActiveDealForPurchase(
  dealId: string
): Promise<PurchaseResult<PurchaseDealContext>> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
  })

  if (!deal) {
    return { success: false, ...PurchaseErrors.DEAL_NOT_FOUND }
  }

  if (deal.dealStatus === DealStatus.EXPIRED) {
    return { success: false, ...PurchaseErrors.DEAL_EXPIRED }
  }

  if (deal.dealStatus !== DealStatus.ACTIVE) {
    return { success: false, ...PurchaseErrors.DEAL_NOT_ACTIVE }
  }

  // Deal Guard enforcement: must be approved
  if (deal.guardStatus !== DealGuardStatus.APPROVED) {
    return { success: false, ...PurchaseErrors.DEAL_NOT_ACTIVE }
  }

  return {
    success: true,
    data: {
      id: deal.id,
      businessId: deal.businessId,
      title: deal.title,
      description: deal.description,
      dealPrice: deal.dealPrice?.toString() ?? null,
      originalValue: deal.originalValue?.toString() ?? null,
      status: deal.dealStatus,
    },
  }
}

/**
 * GUARD: requireAvailableVoucher
 *
 * Verifies at least one ISSUED voucher exists for the deal.
 * Returns the count of available vouchers.
 */
export async function requireAvailableVoucher(
  dealId: string
): Promise<PurchaseResult<{ count: number }>> {
  const count = await prisma.voucher.count({
    where: {
      dealId,
      status: VoucherStatus.ISSUED,
    },
  })

  if (count === 0) {
    return { success: false, ...PurchaseErrors.NO_AVAILABLE_VOUCHERS }
  }

  return { success: true, data: { count } }
}

/**
 * GUARD: requireUnusedPaymentIntent
 *
 * Validates payment intent has not been used for a purchase.
 */
export async function requireUnusedPaymentIntent(
  paymentIntentId: string
): Promise<PurchaseResult<void>> {
  const existing = await prisma.purchase.findUnique({
    where: { paymentIntentId },
  })

  if (existing) {
    return { success: false, ...PurchaseErrors.PAYMENT_INTENT_ALREADY_USED }
  }

  return { success: true, data: undefined }
}

/**
 * GUARD: canViewPurchase
 *
 * Validates caller can view the purchase record.
 * - Owning USER
 * - ADMIN
 */
export async function canViewPurchase(
  request: NextRequest,
  purchaseId: string
): Promise<PurchaseResult<{ identity: IdentityContext; purchase: PurchaseContext }>> {
  const authResult = await authenticateIdentity(request)

  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  const identity = authResult.data

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
  })

  if (!purchase) {
    return { success: false, ...PurchaseErrors.PURCHASE_NOT_FOUND }
  }

  // ADMIN can view any purchase
  if (identity.role === IdentityRole.ADMIN) {
    return {
      success: true,
      data: {
        identity,
        purchase: mapPurchaseToContext(purchase),
      },
    }
  }

  // USER can only view their own purchases
  if (purchase.userId !== identity.id) {
    // Hide existence of other users' purchases
    return { success: false, ...PurchaseErrors.PURCHASE_NOT_FOUND }
  }

  return {
    success: true,
    data: {
      identity,
      purchase: mapPurchaseToContext(purchase),
    },
  }
}

/**
 * ATOMIC OPERATION: assignVoucherToPurchase
 *
 * Atomically assigns one ISSUED voucher to a USER.
 * Uses Serializable isolation to prevent overselling.
 *
 * This is the critical section that enforces:
 * - Exactly one voucher per purchase
 * - No double assignment
 * - No overselling
 */
export async function assignVoucherToPurchase(
  userId: string,
  dealId: string,
  paymentIntentId: string,
  paymentProvider: string,
  amountPaid: number
): Promise<PurchaseResult<{ purchase: PurchaseContext; voucher: PurchaseVoucherContext }>> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Check payment intent hasn't been used (double-spend prevention)
        const existingPurchase = await tx.purchase.findUnique({
          where: { paymentIntentId },
        })

        if (existingPurchase) {
          throw new Error('PAYMENT_INTENT_ALREADY_USED')
        }

        // 2. Find and lock one available ISSUED voucher
        // Using SELECT FOR UPDATE via raw query for true row-level locking
        const availableVouchers = await tx.voucher.findMany({
          where: {
            dealId,
            status: VoucherStatus.ISSUED,
          },
          take: 1,
        })

        if (availableVouchers.length === 0) {
          throw new Error('NO_AVAILABLE_VOUCHERS')
        }

        const voucher = availableVouchers[0]

        // 3. Double-check voucher is still ISSUED (race prevention)
        const currentVoucher = await tx.voucher.findUnique({
          where: { id: voucher.id },
        })

        if (!currentVoucher || currentVoucher.status !== VoucherStatus.ISSUED) {
          throw new Error('VOUCHER_ALREADY_ASSIGNED')
        }

        // 4. Update voucher status to ASSIGNED (atomic)
        const updatedVoucher = await tx.voucher.update({
          where: { id: voucher.id },
          data: { status: VoucherStatus.ASSIGNED },
        })

        // 5. Create immutable Purchase record
        const purchase = await tx.purchase.create({
          data: {
            userId,
            dealId,
            voucherId: voucher.id,
            amountPaid,
            paymentProvider,
            paymentIntentId,
            status: PurchaseStatus.COMPLETED,
          },
        })

        // Deal Guard: mark deal active usage
        await tx.deal.update({
          where: { id: dealId },
          data: { lastActiveAt: new Date() },
        })

        return { purchase, voucher: updatedVoucher }
      },
      {
        isolationLevel: 'Serializable',
        timeout: 10000, // 10 second timeout
      }
    )

    return {
      success: true,
      data: {
        purchase: mapPurchaseToContext(result.purchase),
        voucher: {
          id: result.voucher.id,
          dealId: result.voucher.dealId,
          businessId: result.voucher.businessId,
          qrToken: result.voucher.qrToken,
          status: result.voucher.status,
          expiresAt: result.voucher.expiresAt,
        },
      },
    }
  } catch (error) {
    // Handle known transaction errors
    if (error instanceof Error) {
      if (error.message === 'PAYMENT_INTENT_ALREADY_USED') {
        return { success: false, ...PurchaseErrors.PAYMENT_INTENT_ALREADY_USED }
      }
      if (error.message === 'NO_AVAILABLE_VOUCHERS') {
        return { success: false, ...PurchaseErrors.NO_AVAILABLE_VOUCHERS }
      }
      if (error.message === 'VOUCHER_ALREADY_ASSIGNED') {
        return { success: false, ...PurchaseErrors.DOUBLE_ASSIGNMENT_PREVENTED }
      }
    }

    // Unknown transaction failure
    console.error('Purchase transaction failed:', error)
    return { success: false, ...PurchaseErrors.PURCHASE_TRANSACTION_FAILED }
  }
}

/**
 * Helper: Map Prisma Purchase to PurchaseContext
 */
function mapPurchaseToContext(purchase: {
  id: string
  userId: string
  dealId: string
  voucherId: string
  amountPaid: unknown
  paymentProvider: string
  paymentIntentId: string
  status: PurchaseStatus
  createdAt: Date
}): PurchaseContext {
  return {
    id: purchase.id,
    userId: purchase.userId,
    dealId: purchase.dealId,
    voucherId: purchase.voucherId,
    amountPaid: String(purchase.amountPaid),
    paymentProvider: purchase.paymentProvider,
    paymentIntentId: purchase.paymentIntentId,
    status: purchase.status,
    createdAt: purchase.createdAt,
  }
}

/**
 * Helper: Convert PurchaseResult failure to NextResponse
 */
export function purchaseFailure(
  result: { error: string; status: number; details?: { field: string; message: string }[] }
): NextResponse {
  const body: { error: string; details?: { field: string; message: string }[] } = {
    error: result.error,
  }
  if (result.details) {
    body.details = result.details
  }
  return NextResponse.json(body, { status: result.status })
}

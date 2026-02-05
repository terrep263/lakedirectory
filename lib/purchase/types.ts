/**
 * MODULE 6: User Purchase Flow
 * Core type definitions for the purchase enforcement layer.
 */

import { PurchaseStatus, VoucherStatus, DealStatus } from '@prisma/client'

export { PurchaseStatus }

/**
 * Purchase context representing a completed or failed purchase.
 */
export interface PurchaseContext {
  id: string
  userId: string
  dealId: string
  voucherId: string
  amountPaid: string // Decimal as string for safe transmission
  paymentProvider: string
  paymentIntentId: string
  status: PurchaseStatus
  createdAt: Date
}

/**
 * Deal context for purchase validation.
 */
export interface PurchaseDealContext {
  id: string
  businessId: string
  title: string
  description: string | null
  dealPrice: string | null // Decimal as string
  originalValue: string | null // Decimal as string
  status: DealStatus
}

/**
 * Voucher context for purchase assignment.
 */
export interface PurchaseVoucherContext {
  id: string
  dealId: string
  businessId: string
  qrToken: string
  status: VoucherStatus
  expiresAt: Date | null
}

/**
 * Result type for purchase operations.
 */
export type PurchaseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number; details?: { field: string; message: string }[] }

/**
 * Payment initiation response.
 */
export interface PaymentInitiation {
  paymentIntentId: string
  clientSecret?: string
  amount: string
  currency: string
  dealId: string
  dealTitle: string
  availableVouchers: number
}

/**
 * Purchase confirmation input.
 */
export interface PurchaseConfirmInput {
  paymentIntentId: string
  paymentProvider: string
}

/**
 * Purchase receipt after successful confirmation.
 */
export interface PurchaseReceipt {
  purchaseId: string
  voucherId: string
  qrToken: string
  dealId: string
  dealTitle: string
  amountPaid: string
  purchasedAt: Date
  expiresAt: Date | null
}

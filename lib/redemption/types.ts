/**
 * MODULE 5: Redemption Enforcement
 * Core type definitions for the redemption layer.
 */

import { VoucherStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export { VoucherStatus }

/**
 * Voucher context for redemption operations.
 */
export interface VoucherContext {
  id: string
  dealId: string
  businessId: string
  status: VoucherStatus
  qrToken: string
  expiresAt: Date | null
  issuedAt: Date
}

/**
 * Redemption record (immutable).
 */
export interface RedemptionRecord {
  id: string
  voucherId: string
  dealId: string
  businessId: string
  vendorUserId: string
  redeemedAt: Date
  createdAt: Date
  originalValue: Decimal | null
  dealPrice: Decimal | null
}

/**
 * Redemption input.
 */
export interface RedeemVoucherInput {
  voucherId?: string
  qrToken?: string
}

/**
 * Result type for redemption operations.
 */
export type RedemptionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number }

/**
 * Check if a voucher is expired.
 */
export function isVoucherExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false
  return new Date() >= expiresAt
}

/**
 * Check if a voucher can be redeemed.
 */
export function isVoucherRedeemable(
  status: VoucherStatus,
  expiresAt: Date | null
): { redeemable: boolean; reason?: string } {
  if (status === VoucherStatus.REDEEMED) {
    return { redeemable: false, reason: 'Voucher has already been redeemed' }
  }

  if (isVoucherExpired(expiresAt)) {
    return { redeemable: false, reason: 'Voucher has expired' }
  }

  if (status !== VoucherStatus.ISSUED) {
    return { redeemable: false, reason: `Invalid voucher status: ${status}` }
  }

  return { redeemable: true }
}

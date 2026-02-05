/**
 * MODULE 10: User Visibility (Vouchers & History)
 * Layer 3: Visibility - Read-only views of user-owned data.
 *
 * DEPENDENCIES:
 * - Module 1: Identity & Ownership
 * - Module 4: Voucher Issuance
 * - Module 5: Redemption Enforcement
 * - Module 6: User Purchase Flow
 *
 * HARD RULES:
 * - Users may only see their own data
 * - All data is read-only (no mutations)
 * - Status reflects enforcement truth exactly
 * - EXPIRED and REDEEMED vouchers must be clearly labeled
 */

import { VoucherStatus } from '@prisma/client'
import type { IdentityContext } from '@/lib/identity'

export { VoucherStatus }

/**
 * User-visible voucher status.
 * Maps from enforcement state to user-friendly display state.
 * ASSIGNED vouchers that are past expiration are shown as EXPIRED.
 */
export type UserVoucherStatus = 'ASSIGNED' | 'REDEEMED' | 'EXPIRED'

/**
 * User-visible voucher view.
 * Read-only representation of a voucher owned by the user.
 */
export interface UserVoucherView {
  voucherId: string
  dealId: string
  businessName: string
  dealTitle: string
  status: UserVoucherStatus
  expiresAt: Date | null
  redeemedAt: Date | null
}

/**
 * User-visible voucher detail view.
 * Extended information for single voucher display.
 */
export interface UserVoucherDetailView extends UserVoucherView {
  qrToken: string
  dealDescription: string | null
  originalValue: string | null
  dealPrice: string | null
  issuedAt: Date
  purchasedAt: Date
}

/**
 * User-visible purchase view.
 * Read-only representation of a completed purchase.
 */
export interface UserPurchaseView {
  purchaseId: string
  dealTitle: string
  businessName: string
  amountPaid: string
  purchaseDate: Date
  voucherId: string
}

/**
 * User-visible redemption view.
 * Read-only representation of a redemption event.
 */
export interface UserRedemptionView {
  voucherId: string
  businessName: string
  redeemedAt: Date
}

/**
 * Result type for user visibility operations.
 * Follows the pattern established by other modules.
 */
export type VisibilityResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number }

/**
 * AI assistance output for voucher summaries.
 * Non-authoritative - for display hints only.
 */
export interface AIVoucherSummary {
  totalActive: number
  totalExpired: number
  totalRedeemed: number
  expiringWithin7Days: number
  highlights: string[]
  confidence: 'high' | 'medium' | 'low'
}

/**
 * AI assistance context for generating summaries.
 */
export interface AIAssistanceContext {
  identity: IdentityContext
  vouchers: UserVoucherView[]
  purchases: UserPurchaseView[]
  redemptions: UserRedemptionView[]
}

/**
 * Determines the user-visible status from enforcement state.
 * This is the ONLY place status translation occurs.
 *
 * Rules:
 * - ISSUED vouchers should never be visible to users (not assigned to them)
 * - ASSIGNED + expired = EXPIRED (user-facing)
 * - ASSIGNED + not expired = ASSIGNED (user-facing)
 * - REDEEMED = REDEEMED (user-facing)
 */
export function deriveUserVoucherStatus(
  enforcementStatus: VoucherStatus,
  expiresAt: Date | null
): UserVoucherStatus {
  // REDEEMED is terminal - always show as redeemed
  if (enforcementStatus === VoucherStatus.REDEEMED) {
    return 'REDEEMED'
  }

  // Check expiration for ASSIGNED vouchers
  if (enforcementStatus === VoucherStatus.ASSIGNED) {
    if (expiresAt && new Date() >= expiresAt) {
      return 'EXPIRED'
    }
    return 'ASSIGNED'
  }

  // ISSUED vouchers should not be visible to users
  // If this somehow gets called, treat as expired (defensive)
  return 'EXPIRED'
}

/**
 * Type guard to check if voucher is actively usable.
 */
export function isVoucherUsable(status: UserVoucherStatus): boolean {
  return status === 'ASSIGNED'
}

/**
 * Type guard to check if voucher has been used.
 */
export function isVoucherUsed(status: UserVoucherStatus): boolean {
  return status === 'REDEEMED'
}

/**
 * Type guard to check if voucher cannot be used.
 */
export function isVoucherExpired(status: UserVoucherStatus): boolean {
  return status === 'EXPIRED'
}

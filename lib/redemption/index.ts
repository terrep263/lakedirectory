/**
 * MODULE 5: Redemption Enforcement
 *
 * This module enforces the point of truth where voucher value is consumed.
 * Once a voucher is redeemed, the action is FINAL and IRREVERSIBLE.
 *
 * HARD RULES (enforced at database and code level):
 * - A voucher may be redeemed exactly ONCE (UNIQUE constraint)
 * - Only the owning business/vendor may redeem a voucher
 * - EXPIRED vouchers may NEVER be redeemed
 * - REDEEMED vouchers may NEVER be modified
 * - Redemption MUST be atomic (transaction-based)
 * - AI may observe and flag, NEVER redeem or reverse
 * - There is NO UNDO for redemption
 *
 * VOUCHER STATUS TRANSITION:
 *   ISSUED → REDEEMED (no other transitions)
 *
 * All redemption state is trusted system-wide without additional checks.
 */

// Types
export { VoucherStatus } from './types'
export type {
  VoucherContext,
  RedemptionRecord,
  RedeemVoucherInput,
  RedemptionResult,
} from './types'
export { isVoucherExpired, isVoucherRedeemable } from './types'

// Engine (canonical execution)
export type { RedemptionRequest, RedemptionResponse } from './engine'
export { redeemVoucher, getVoucherRedemptionHistory } from './engine'

// Guards (primary API for redemption enforcement)
export {
  requireVoucherRedeemable,
  requireVendorBusinessOwnership,
  canViewRedemption,
  redemptionFailure,
  RedemptionErrors,
} from './guards'

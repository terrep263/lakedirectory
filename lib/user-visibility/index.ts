/**
 * MODULE 10: User Visibility (Vouchers & History)
 * Layer 3: Visibility - Read-only views of user-owned data.
 *
 * This module exposes read-only views of a user's:
 * - Owned vouchers
 * - Purchase history
 * - Redemption status
 *
 * DEPENDENCIES:
 * - Module 1: Identity & Ownership
 * - Module 4: Voucher Issuance
 * - Module 5: Redemption Enforcement
 * - Module 6: User Purchase Flow
 *
 * HARD RULES:
 * - Users may only see their own data
 * - Voucher and purchase data is read-only
 * - Status must reflect enforcement truth exactly
 * - EXPIRED and REDEEMED vouchers must be clearly labeled
 * - AI may summarize or explain, never alter
 *
 * NO MUTATIONS. NO ENFORCEMENT LOGIC. NO ADMIN ACTIONS.
 */

// Types
export type {
  UserVoucherView,
  UserVoucherDetailView,
  UserPurchaseView,
  UserRedemptionView,
  VisibilityResult,
  AIVoucherSummary,
  AIAssistanceContext,
  UserVoucherStatus,
} from './types'

// Type guards and helpers
export {
  VoucherStatus,
  deriveUserVoucherStatus,
  isVoucherUsable,
  isVoucherUsed,
  isVoucherExpired,
} from './types'

// Guards and queries
export {
  // Guards
  requireUserRoleForVisibility,
  requireVoucherOwnership,

  // Queries
  getUserVouchers,
  getUserPurchases,
  getUserRedemptions,

  // Helpers
  visibilityFailure,

  // Errors
  VisibilityErrors,
} from './guards'

// AI Assistance (non-authoritative)
export {
  generateVoucherSummary,
  explainVoucherStatus,
  generateExpirationReminders,
  generateAIAssistance,
} from './ai-assistance'

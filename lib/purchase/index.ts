/**
 * MODULE 6: User Purchase Flow
 * Public exports for purchase enforcement layer.
 *
 * This module provides:
 * - Guards for USER-only purchase authorization
 * - Guards for ACTIVE deal verification
 * - Guards for available voucher verification
 * - Atomic voucher assignment operation
 * - Purchase record viewing guards
 * - AI monitoring (read-only, passive observation)
 *
 * HARD RULES:
 * - Only USERs may purchase vouchers
 * - A purchase assigns exactly one voucher
 * - Vouchers must already be ISSUED before purchase
 * - A voucher may only be assigned once
 * - Overselling is technically impossible
 * - Payment success must precede voucher assignment
 * - AI may NEVER approve purchases or assign vouchers
 */

// Export enums and type guards (values)
export { PurchaseStatus } from './types'

// Export types
export type {
  PurchaseContext,
  PurchaseDealContext,
  PurchaseVoucherContext,
  PurchaseResult,
  PaymentInitiation,
  PurchaseConfirmInput,
  PurchaseReceipt,
} from './types'

// Export guards and operations
export {
  requireUserRole,
  requireActiveDealForPurchase,
  requireAvailableVoucher,
  requireUnusedPaymentIntent,
  canViewPurchase,
  assignVoucherToPurchase,
  purchaseFailure,
  PurchaseErrors,
} from './guards'

// Export AI monitoring (read-only, passive)
export {
  runPurchaseMonitoring,
  recordThresholdEvents,
  checkUserPurchaseVelocity,
  checkDealPurchaseVelocity,
  checkFailedPaymentAttempts,
  getPendingReviewTasks,
  getReviewTask,
  resolveReviewTask,
  getMonitoringStats,
  cleanupOldTasks,
  DEFAULT_THRESHOLDS,
} from './ai-monitoring'

export type {
  PurchaseThresholdConfig,
  ThresholdEvent,
  AdminReviewTask,
} from './ai-monitoring'

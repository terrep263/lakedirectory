/**
 * MODULE 7: Vendor Operations
 * Public exports for vendor operational layer.
 *
 * This module provides:
 * - Guards for vendor authorization
 * - Types for vendor operations
 * - AI assistance (read-only, advisory)
 *
 * HARD RULES:
 * - Vendors may only access data for their owned business
 * - Vendors may not activate deals (admin only)
 * - Vendors may not issue vouchers (system only)
 * - Vendors may not alter voucher limits or lifecycle states
 * - Vendors may redeem vouchers only for their business
 * - Vendors may never override enforcement rules
 * - AI may assist vendors but may not act on their behalf
 */

// Types
export { BusinessStatus, DealStatus, VoucherStatus } from './types'
export type {
  VendorOperationalContext,
  VendorBusinessProfile,
  VendorDealSummary,
  CreateDealDraftInput,
  EditDealDraftInput,
  VoucherInventorySummary,
  VendorRedemptionRecord,
  VendorResult,
  VendorAISuggestion,
  VendorAIThresholds,
  VendorAlert,
} from './types'
export { DEFAULT_VENDOR_AI_THRESHOLDS } from './types'

// Guards
export {
  requireVendorWithBusiness,
  requireActiveBusinessForVendor,
  requireVendorDealOwnership,
  requireInactiveDealForEdit,
  validateDealDraftInput,
  vendorFailure,
  VendorErrors,
} from './guards'

// AI Assistance (read-only, advisory)
export {
  analyzeDealPerformance,
  checkRedemptionAnomalies,
  generateDealSuggestions,
  createVendorAlert,
  getVendorAlerts,
  acknowledgeAlert,
  getVendorPerformanceSummary,
  cleanupOldAlerts,
} from './ai-assistance'

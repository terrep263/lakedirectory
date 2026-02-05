/**
 * MODULE 3: Deal Definition
 *
 * This module defines promotional offers tied to business listings.
 * Deals define rules but do NOT issue value - that is Module 4's responsibility.
 *
 * HARD RULES (enforced at database and code level):
 * - Every deal belongs to exactly one business
 * - Only the owning vendor or ADMIN may create/modify a deal
 * - Deals are created as INACTIVE by default
 * - INACTIVE deals NEVER appear in the public directory
 * - A deal may NOT be modified after activation, except by ADMIN
 * - A business must be ACTIVE to create or activate deals
 *
 * LIFECYCLE (strict, no exceptions):
 *   INACTIVE → ACTIVE → EXPIRED
 *   No reactivation. No deletion.
 *
 * All downstream modules (Voucher) MUST use these exports for deal authorization.
 */

// Types
export { DealStatus } from './types'
export type {
  DealContext,
  CreateDealInput,
  UpdateDealInput,
  DealResult,
  DealValidationError,
} from './types'
export {
  ALLOWED_DEAL_TRANSITIONS,
  isValidDealTransition,
  validateDealFields,
} from './types'

// Guards (primary API for downstream modules)
export {
  requireDealOwnership,
  requireInactiveDeal,
  requireActiveDeal,
  requireActiveDealById,
  canCreateDealForBusiness,
  canActivateDeal,
  dealFailure,
  DealErrors,
} from './guards'

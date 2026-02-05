/**
 * MODULE 2: Business Record (Source of Truth)
 *
 * This module defines the canonical business entity for the platform.
 * It is the ONLY valid representation of a business in the system.
 *
 * HARD RULES (enforced at database and code level):
 * - Every business has exactly one owner (VENDOR identity)
 * - A VENDOR may own only one business (UNIQUE constraint)
 * - VENDORS cannot create businesses - they claim existing ones
 * - USERS may never create or own businesses
 * - ADMINS may create businesses without ownership (manual edge cases)
 * - Businesses are created via bulk import (automatic) or ADMIN (manual)
 * - Ownership, once assigned, is IMMUTABLE
 * - Business records may be deactivated but NEVER deleted
 *
 * VENDOR ACCESS MODEL:
 * - Vendors are CLAIMANTS, not creators
 * - Businesses exist independently before vendor binding
 * - Claiming grants control access, not ownership creation
 * - Vendor dashboard is a view layer, not a creation mechanism
 *
 * All downstream modules (Deal, Voucher, Visibility) MUST use these
 * exports for business-related authorization.
 */

// Types
export { BusinessStatus } from './types'
export type {
  BusinessContext,
  OwnedBusinessContext,
  CreateBusinessInput,
  BusinessResult,
} from './types'
export { ALLOWED_STATUS_TRANSITIONS, isValidStatusTransition } from './types'

// Guards (primary API for downstream modules)
export {
  requireBusinessOwnership,
  requireActiveBusiness,
  requireActiveBusinessById,
  canVendorCreateBusiness,
  canClaimBusiness,
  businessFailure,
  BusinessErrors,
} from './guards'

// Core business data module (ingestion, lifecycle, soft delete)
export {
  createBusinessManual,
  ingestBusinessesFromGoogle,
  ingestPlacesArray,
  updateBusiness,
  softDeleteBusiness,
  restoreBusiness,
  finalDeleteBusiness,
  setPrimaryImage,
  PLACEHOLDER_IMAGE,
} from './core'

export type {
  BusinessCreateInput,
  BusinessUpdateInput,
  GoogleIngestParams,
  GoogleIngestResult,
} from './core'

// Bulk import orchestration
export {
  LAKE_COUNTY_CITIES,
  DEAL_CATEGORIES,
  bulkImportFromGooglePlaces,
} from './bulk-import'

export type { BulkImportStats } from './bulk-import'

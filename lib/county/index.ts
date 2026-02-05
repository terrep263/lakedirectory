/**
 * COUNTY SYSTEM BOUNDARY MODULE (Foundational)
 *
 * County is the HARD SYSTEM BOUNDARY for the platform.
 * All data, operations, and visibility are scoped to a single County.
 *
 * DEPENDENCIES: None (this module is foundational)
 *
 * HARD RULES:
 * - Every request MUST have an active County context
 * - County context is immutable for the duration of a request
 * - No cross-county data access without SUPER_ADMIN override
 * - All entities MUST include countyId
 *
 * This module is implicitly required by ALL other modules.
 */

// Types (values and type guards)
export {
  IdentityRole,
  IdentityStatus,
  isSuperAdmin,
  isAdmin,
  isVendor,
  isUser,
  hasCountyAccess,
  isSuperAdminContext,
  isValidCountySlug,
  isValidStateAbbreviation,
} from './types'

// Type-only exports
export type {
  CountyContext,
  CountyDetailContext,
  CountyScopedIdentityContext,
  AdminCountyContext,
  SuperAdminContext,
  CountyResolutionSource,
  CountyResolutionResult,
  CountyResult,
  CreateCountyInput,
  UpdateCountyInput,
  GrantCountyAccessInput,
} from './types'

// Guards (primary API for county enforcement)
export {
  // Resolution
  extractCountySlugFromPath,
  resolveCountyContext,
  resolveCountyById,

  // Authorization guards
  requireCountyContext,
  requireAdminCountyAccess,
  requireSuperAdmin,
  requireVendorCountyMatch,

  // Validation
  validateEntityCounty,

  // Query helpers
  withCountyScope,

  // Public queries
  listActiveCounties,

  // Helpers
  countyFailure,

  // Errors
  CountyErrors,
} from './guards'

// Middleware utilities
export {
  isCountyExemptRoute,
  isSelfValidatingApiRoute,
  validateCountyMiddleware,
  createCountyValidationResponse,
  buildCountyUrl,
  buildCountyApiUrl,
  extractCountyRelativePath,
  getCountyCookie,
  setCountyCookie,
  clearCountyCookie,
} from './middleware'

export type {
  CountyMiddlewareResult,
} from './middleware'

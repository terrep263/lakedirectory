/**
 * MODULE 1: Identity & Ownership
 *
 * This module is the root enforcement layer for the multi-tenant platform.
 * It enforces WHO is allowed to act, WHAT role they hold, and WHAT business
 * (if any) they are bound to.
 *
 * HARD RULES (enforced at database and code level):
 * - Roles are IMMUTABLE after creation
 * - A VENDOR may be bound to exactly ONE business record
 * - A USER may NOT mutate into a VENDOR or ADMIN
 * - An ADMIN is global and NOT bound to a business
 * - Cross-role access is TECHNICALLY IMPOSSIBLE, not UI-restricted
 *
 * All other modules MUST use these exports for authorization.
 */

// Types (values and type guards)
export {
  IdentityRole,
  IdentityStatus,
  isVendorContext,
  isSuperAdmin,
  isAdmin,
  isVendor,
  isUser,
} from './types'

// Types (type-only exports)
export type {
  IdentityContext,
  VendorContext,
  IdentityTokenPayload,
  AuthResult,
} from './types'

// Token utilities
export {
  signIdentityToken,
  verifyIdentityToken,
  extractBearerToken,
} from './token'

// Guards (primary API for other modules)
export {
  authenticateIdentity,
  requireRole,
  requireVendorOwnership,
  requireAdmin,
  requireActiveIdentity,
  authFailure,
  IdentityErrors,
} from './guards'

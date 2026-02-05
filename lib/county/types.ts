/**
 * COUNTY SYSTEM BOUNDARY MODULE (Foundational)
 * Type definitions for county-scoped operations.
 *
 * County is the HARD SYSTEM BOUNDARY. All data, operations, and visibility
 * are scoped to a single County. No cross-county data access is permitted.
 *
 * HARD RULES:
 * - Every request MUST have an active County context
 * - County context is immutable for the duration of a request
 * - No silent fallback is permitted
 * - Cross-county access requires explicit SUPER_ADMIN override
 */

import { IdentityRole, IdentityStatus } from '@prisma/client'

export { IdentityRole, IdentityStatus }

/**
 * County entity representation.
 * Immutable once created.
 */
export interface CountyContext {
  id: string
  name: string
  state: string
  slug: string
  isActive: boolean
}

/**
 * Extended county context with configuration.
 */
export interface CountyDetailContext extends CountyContext {
  googlePlacesConfig: unknown | null
  boundaryGeometry: unknown | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Identity context with county scope.
 */
export interface CountyScopedIdentityContext {
  id: string
  email: string
  role: IdentityRole
  status: IdentityStatus
  activeCounty: CountyContext
}

/**
 * Admin identity with county access list.
 */
export interface AdminCountyContext extends CountyScopedIdentityContext {
  role: typeof IdentityRole.ADMIN
  accessibleCounties: CountyContext[]
}

/**
 * Super admin identity with global access.
 */
export interface SuperAdminContext {
  id: string
  email: string
  role: typeof IdentityRole.SUPER_ADMIN
  status: IdentityStatus
  // SUPER_ADMIN has implicit access to all counties
  globalAccess: true
}

/**
 * County resolution source.
 * Ordered by priority (URL takes precedence).
 */
export type CountyResolutionSource =
  | 'URL_PREFIX'      // /lake-county/...
  | 'SESSION'         // Session-stored county context
  | 'REQUEST_HEADER'  // X-County-Id header

/**
 * Result of county resolution.
 */
export interface CountyResolutionResult {
  county: CountyContext
  source: CountyResolutionSource
}

/**
 * Result type for county operations.
 */
export type CountyResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number }

/**
 * Input for creating a new county (SUPER_ADMIN only).
 */
export interface CreateCountyInput {
  name: string
  state: string
  slug: string
  googlePlacesConfig?: unknown
  boundaryGeometry?: unknown
}

/**
 * Input for updating county configuration (SUPER_ADMIN only).
 */
export interface UpdateCountyInput {
  name?: string
  isActive?: boolean
  googlePlacesConfig?: unknown
  boundaryGeometry?: unknown
}

/**
 * Input for granting admin county access.
 */
export interface GrantCountyAccessInput {
  adminId: string
  countyId: string
}

/**
 * Type guard: Check if identity has SUPER_ADMIN role.
 */
export function isSuperAdmin(
  ctx: { role: IdentityRole }
): ctx is { role: typeof IdentityRole.SUPER_ADMIN } {
  return ctx.role === IdentityRole.SUPER_ADMIN
}

/**
 * Type guard: Check if identity has ADMIN role.
 */
export function isAdmin(
  ctx: { role: IdentityRole }
): ctx is { role: typeof IdentityRole.ADMIN } {
  return ctx.role === IdentityRole.ADMIN
}

/**
 * Type guard: Check if identity has VENDOR role.
 */
export function isVendor(
  ctx: { role: IdentityRole }
): ctx is { role: typeof IdentityRole.VENDOR } {
  return ctx.role === IdentityRole.VENDOR
}

/**
 * Type guard: Check if identity has USER role.
 */
export function isUser(
  ctx: { role: IdentityRole }
): ctx is { role: typeof IdentityRole.USER } {
  return ctx.role === IdentityRole.USER
}

/**
 * Type guard: Check if admin context has county access (vs global SUPER_ADMIN).
 * Use this to safely extract activeCounty from AdminCountyContext | SuperAdminContext.
 */
export function hasCountyAccess(
  ctx: AdminCountyContext | SuperAdminContext
): ctx is AdminCountyContext {
  return 'activeCounty' in ctx
}

/**
 * Type guard: Check if context is SuperAdminContext.
 */
export function isSuperAdminContext(
  ctx: AdminCountyContext | SuperAdminContext
): ctx is SuperAdminContext {
  return 'globalAccess' in ctx && ctx.globalAccess === true
}

/**
 * Validates a county slug format.
 * Must be lowercase, alphanumeric with hyphens only.
 */
export function isValidCountySlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
}

/**
 * Validates a US state abbreviation.
 */
export function isValidStateAbbreviation(state: string): boolean {
  const validStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
  ]
  return validStates.includes(state.toUpperCase())
}

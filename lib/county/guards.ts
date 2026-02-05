/**
 * COUNTY SYSTEM BOUNDARY MODULE (Foundational)
 * Enforcement guards for county-scoped operations.
 *
 * These guards are the SOLE mechanism for county enforcement.
 * All county validation flows through these functions.
 *
 * HARD RULES:
 * - Missing county context → 400 (Bad Request)
 * - Cross-county access attempt → 403 (Forbidden)
 * - Entity county mismatch → 403 (Forbidden)
 * - Query without county filter → reject
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  authenticateIdentity,
  type IdentityContext,
  IdentityRole,
} from '@/lib/identity'
import type {
  CountyContext,
  CountyResult,
  CountyScopedIdentityContext,
  AdminCountyContext,
  SuperAdminContext,
  CountyResolutionResult,
  CountyResolutionSource,
} from './types'

/**
 * ERROR RESPONSES
 * Hard failures with clear error messages. No silent failures.
 */
export const CountyErrors = {
  // Resolution errors
  COUNTY_CONTEXT_REQUIRED: { error: 'County context is required', status: 400 },
  COUNTY_NOT_FOUND: { error: 'County not found', status: 404 },
  COUNTY_INACTIVE: { error: 'County is not active', status: 403 },
  INVALID_COUNTY_SLUG: { error: 'Invalid county slug format', status: 400 },

  // Access errors
  COUNTY_ACCESS_DENIED: { error: 'Access denied to this county', status: 403 },
  CROSS_COUNTY_ACCESS_DENIED: { error: 'Cross-county access is forbidden', status: 403 },
  ENTITY_COUNTY_MISMATCH: { error: 'Entity does not belong to active county', status: 403 },

  // Role errors
  SUPER_ADMIN_REQUIRED: { error: 'SUPER_ADMIN role required', status: 403 },
  ADMIN_REQUIRED: { error: 'ADMIN role required', status: 403 },

  // Binding errors
  ADMIN_ALREADY_HAS_COUNTY_ACCESS: { error: 'Admin already has access to this county', status: 409 },
  VENDOR_COUNTY_MISMATCH: { error: 'Vendor business is in a different county', status: 403 },
} as const

/**
 * Extract county slug from URL path.
 * Expected format: /{county-slug}/...
 */
export function extractCountySlugFromPath(pathname: string): string | null {
  // Match first path segment after leading slash
  const match = pathname.match(/^\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/)
  if (!match) return null

  // Exclude known non-county routes
  const excludedPrefixes = [
    'api', 'admin', 'vendor', 'login', 'register', 'scanner',
    '_next', 'static', 'favicon', 'debug', 'businesses', 'verify-email',
    'super-admin'
  ]
  if (excludedPrefixes.includes(match[1])) return null

  return match[1]
}

/**
 * GUARD: resolveCountyContext
 *
 * Resolves the active County from the request.
 * Resolution order: URL prefix → Session → Request header
 *
 * HARD RULE: No county context = reject request
 */
export async function resolveCountyContext(
  request: NextRequest
): Promise<CountyResult<CountyResolutionResult>> {
  let countySlug: string | null = null
  let source: CountyResolutionSource = 'URL_PREFIX'

  // 1. Try URL prefix first (highest priority)
  const url = new URL(request.url)
  countySlug = extractCountySlugFromPath(url.pathname)

  // 2. Try session cookie if URL didn't have county
  if (!countySlug) {
    const sessionCounty = request.cookies.get('county_context')?.value
    if (sessionCounty) {
      countySlug = sessionCounty
      source = 'SESSION'
    }
  }

  // 3. Try request header as fallback
  if (!countySlug) {
    const headerCounty = request.headers.get('x-county-id') ||
                         request.headers.get('x-county-slug')
    if (headerCounty) {
      countySlug = headerCounty
      source = 'REQUEST_HEADER'
    }
  }

  // HARD FAILURE: No county context
  if (!countySlug) {
    return { success: false, ...CountyErrors.COUNTY_CONTEXT_REQUIRED }
  }

  // Fetch county from database
  const county = await prisma.county.findUnique({
    where: { slug: countySlug },
    select: {
      id: true,
      name: true,
      state: true,
      slug: true,
      isActive: true,
    },
  })

  if (!county) {
    return { success: false, ...CountyErrors.COUNTY_NOT_FOUND }
  }

  if (!county.isActive) {
    return { success: false, ...CountyErrors.COUNTY_INACTIVE }
  }

  return {
    success: true,
    data: {
      county: {
        id: county.id,
        name: county.name,
        state: county.state,
        slug: county.slug,
        isActive: county.isActive,
      },
      source,
    },
  }
}

/**
 * GUARD: resolveCountyById
 *
 * Resolves a County by its ID.
 * Used for API endpoints that receive countyId directly.
 */
export async function resolveCountyById(
  countyId: string
): Promise<CountyResult<CountyContext>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    select: {
      id: true,
      name: true,
      state: true,
      slug: true,
      isActive: true,
    },
  })

  if (!county) {
    return { success: false, ...CountyErrors.COUNTY_NOT_FOUND }
  }

  if (!county.isActive) {
    return { success: false, ...CountyErrors.COUNTY_INACTIVE }
  }

  return {
    success: true,
    data: {
      id: county.id,
      name: county.name,
      state: county.state,
      slug: county.slug,
      isActive: county.isActive,
    },
  }
}

/**
 * GUARD: requireCountyContext
 *
 * Requires an active county context for the request.
 * Returns the authenticated identity with county scope.
 */
export async function requireCountyContext(
  request: NextRequest
): Promise<CountyResult<CountyScopedIdentityContext>> {
  // Authenticate identity first
  const authResult = await authenticateIdentity(request)
  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  const identity = authResult.data

  // Resolve county context
  const countyResult = await resolveCountyContext(request)
  if (!countyResult.success) {
    return countyResult
  }

  const { county } = countyResult.data

  return {
    success: true,
    data: {
      id: identity.id,
      email: identity.email,
      role: identity.role,
      status: identity.status,
      activeCounty: county,
    },
  }
}

/**
 * GUARD: requireAdminCountyAccess
 *
 * Requires ADMIN role with access to the active county.
 * SUPER_ADMIN has implicit access to all counties.
 */
export async function requireAdminCountyAccess(
  request: NextRequest
): Promise<CountyResult<AdminCountyContext | SuperAdminContext>> {
  // Get identity with county context
  const ctxResult = await requireCountyContext(request)
  if (!ctxResult.success) {
    return ctxResult
  }

  const ctx = ctxResult.data

  // SUPER_ADMIN has global access
  if (ctx.role === IdentityRole.SUPER_ADMIN) {
    return {
      success: true,
      data: {
        id: ctx.id,
        email: ctx.email,
        role: IdentityRole.SUPER_ADMIN,
        status: ctx.status,
        globalAccess: true,
      },
    }
  }

  // Must be ADMIN
  if (ctx.role !== IdentityRole.ADMIN) {
    return { success: false, ...CountyErrors.ADMIN_REQUIRED }
  }

  // Check admin has access to the active county
  const access = await prisma.adminCountyAccess.findUnique({
    where: {
      adminId_countyId: {
        adminId: ctx.id,
        countyId: ctx.activeCounty.id,
      },
    },
  })

  if (!access) {
    return { success: false, ...CountyErrors.COUNTY_ACCESS_DENIED }
  }

  // Get all accessible counties for the admin
  const allAccess = await prisma.adminCountyAccess.findMany({
    where: { adminId: ctx.id },
    include: {
      county: {
        select: {
          id: true,
          name: true,
          state: true,
          slug: true,
          isActive: true,
        },
      },
    },
  })

  return {
    success: true,
    data: {
      id: ctx.id,
      email: ctx.email,
      role: IdentityRole.ADMIN,
      status: ctx.status,
      activeCounty: ctx.activeCounty,
      accessibleCounties: allAccess.map((a) => a.county),
    },
  }
}

/**
 * GUARD: requireSuperAdmin
 *
 * Requires SUPER_ADMIN role.
 * No county context needed (global operations).
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<CountyResult<SuperAdminContext>> {
  const authResult = await authenticateIdentity(request)
  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  const identity = authResult.data

  if (identity.role !== IdentityRole.SUPER_ADMIN) {
    return { success: false, ...CountyErrors.SUPER_ADMIN_REQUIRED }
  }

  return {
    success: true,
    data: {
      id: identity.id,
      email: identity.email,
      role: IdentityRole.SUPER_ADMIN,
      status: identity.status,
      globalAccess: true,
    },
  }
}

/**
 * GUARD: requireVendorCountyMatch
 *
 * Validates that a vendor's business is in the active county.
 * Vendors cannot operate outside their business's county.
 */
export async function requireVendorCountyMatch(
  request: NextRequest
): Promise<CountyResult<CountyScopedIdentityContext & { businessId: string }>> {
  // Get identity with county context
  const ctxResult = await requireCountyContext(request)
  if (!ctxResult.success) {
    return ctxResult
  }

  const ctx = ctxResult.data

  // Must be VENDOR
  if (ctx.role !== IdentityRole.VENDOR) {
    return { success: false, error: 'VENDOR role required', status: 403 }
  }

  // Get vendor's business
  const ownership = await prisma.vendorOwnership.findUnique({
    where: { userId: ctx.id },
    include: {
      business: {
        select: {
          id: true,
          countyId: true,
        },
      },
    },
  })

  if (!ownership) {
    return { success: false, error: 'Vendor ownership binding required', status: 403 }
  }

  // HARD CHECK: Business county must match active county
  if (ownership.business.countyId !== ctx.activeCounty.id) {
    return { success: false, ...CountyErrors.VENDOR_COUNTY_MISMATCH }
  }

  return {
    success: true,
    data: {
      ...ctx,
      businessId: ownership.business.id,
    },
  }
}

/**
 * GUARD: validateEntityCounty
 *
 * Validates that an entity belongs to the specified county.
 * Use this to enforce county boundaries on entity operations.
 */
export function validateEntityCounty(
  entityCountyId: string,
  activeCountyId: string
): CountyResult<void> {
  if (entityCountyId !== activeCountyId) {
    return { success: false, ...CountyErrors.ENTITY_COUNTY_MISMATCH }
  }
  return { success: true, data: undefined }
}

/**
 * Helper: Convert CountyResult failure to NextResponse
 */
export function countyFailure(
  result: { error: string; status: number }
): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status })
}

/**
 * QUERY HELPER: Get county-scoped where clause.
 *
 * Use this to ensure all queries include county scope.
 */
export function withCountyScope<T extends Record<string, unknown>>(
  countyId: string,
  where: T
): T & { countyId: string } {
  return { ...where, countyId }
}

/**
 * List all active counties.
 * For public display / selection.
 */
export async function listActiveCounties(): Promise<CountyResult<CountyContext[]>> {
  const counties = await prisma.county.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      state: true,
      slug: true,
      isActive: true,
    },
    orderBy: [
      { state: 'asc' },
      { name: 'asc' },
    ],
  })

  return { success: true, data: counties }
}

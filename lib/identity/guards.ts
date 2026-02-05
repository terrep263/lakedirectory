/**
 * MODULE 1: Identity & Ownership
 * Enforcement guards for role-based and ownership-based access control.
 *
 * These guards are the SOLE mechanism for cross-module authorization.
 * All access control flows through these functions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { IdentityRole, IdentityStatus, IdentityContext, VendorContext, AuthResult } from './types'
import { verifyIdentityToken, extractBearerToken } from './token'

/**
 * ERROR RESPONSES
 * Hard failures with clear error messages. No silent failures.
 */
const ERRORS = {
  NO_AUTH_HEADER: { error: 'Authorization header required', status: 401 },
  INVALID_TOKEN: { error: 'Invalid or expired token', status: 401 },
  IDENTITY_NOT_FOUND: { error: 'Identity not found', status: 401 },
  IDENTITY_SUSPENDED: { error: 'Identity is suspended', status: 403 },
  ROLE_MISMATCH: (required: IdentityRole) => ({
    error: `Access denied: ${required} role required`,
    status: 403,
  }),
  VENDOR_OWNERSHIP_REQUIRED: { error: 'Vendor ownership binding required', status: 403 },
  ROLE_MUTATION_FORBIDDEN: { error: 'Role mutation is forbidden', status: 403 },
  VENDOR_ALREADY_BOUND: { error: 'Vendor is already bound to a business', status: 409 },
  USER_CANNOT_BIND: { error: 'USER role cannot bind to a business', status: 403 },
  ADMIN_CANNOT_BIND: { error: 'ADMIN role cannot bind to a business', status: 403 },
} as const

/**
 * Authenticate the request and return the identity context.
 * This is the foundation layer - all guards build on this.
 */
export async function authenticateIdentity(
  request: NextRequest
): Promise<AuthResult<IdentityContext>> {
  // Extract token
  const authHeader = request.headers.get('authorization')
  const token = extractBearerToken(authHeader)

  if (!token) {
    return { success: false, ...ERRORS.NO_AUTH_HEADER }
  }

  // Verify token
  const payload = verifyIdentityToken(token)
  if (!payload) {
    return { success: false, ...ERRORS.INVALID_TOKEN }
  }

  // Fetch identity from database (single source of truth)
  const identity = await prisma.userIdentity.findUnique({
    where: { id: payload.sub },
  })

  if (!identity) {
    return { success: false, ...ERRORS.IDENTITY_NOT_FOUND }
  }

  // Check status
  if (identity.status === IdentityStatus.SUSPENDED) {
    return { success: false, ...ERRORS.IDENTITY_SUSPENDED }
  }

  return {
    success: true,
    data: {
      id: identity.id,
      email: identity.email,
      role: identity.role,
      status: identity.status,
    },
  }
}

/**
 * GUARD: requireRole
 * Rejects request if identity.role !== required role.
 *
 * Usage:
 *   const result = await requireRole(request, IdentityRole.ADMIN)
 *   if (!result.success) return NextResponse.json(...)
 *   const identity = result.data
 */
export async function requireRole(
  request: NextRequest,
  role: IdentityRole
): Promise<AuthResult<IdentityContext>> {
  const authResult = await authenticateIdentity(request)

  if (!authResult.success) {
    return authResult
  }

  const identity = authResult.data

  // HARD ENFORCEMENT: Role must match exactly
  if (identity.role !== role) {
    return { success: false, ...ERRORS.ROLE_MISMATCH(role) }
  }

  return { success: true, data: identity }
}

/**
 * GUARD: requireVendorOwnership
 * Rejects request if:
 *   - User is not authenticated
 *   - User role is not VENDOR
 *   - No VendorOwnership record exists
 *
 * Injects businessId into the returned context.
 *
 * Usage:
 *   const result = await requireVendorOwnership(request)
 *   if (!result.success) return NextResponse.json(...)
 *   const { businessId } = result.data
 */
export async function requireVendorOwnership(
  request: NextRequest
): Promise<AuthResult<VendorContext>> {
  const authResult = await authenticateIdentity(request)

  if (!authResult.success) {
    return authResult
  }

  const identity = authResult.data

  // HARD ENFORCEMENT: Must be VENDOR role
  if (identity.role !== IdentityRole.VENDOR) {
    return { success: false, ...ERRORS.ROLE_MISMATCH(IdentityRole.VENDOR) }
  }

  // Fetch ownership binding
  const ownership = await prisma.vendorOwnership.findUnique({
    where: { userId: identity.id },
  })

  if (!ownership) {
    return { success: false, ...ERRORS.VENDOR_OWNERSHIP_REQUIRED }
  }

  return {
    success: true,
    data: {
      ...identity,
      role: IdentityRole.VENDOR,
      businessId: ownership.businessId,
    },
  }
}

/**
 * GUARD: requireAdmin
 * Allows ADMIN or SUPER_ADMIN.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AuthResult<IdentityContext>> {
  const authResult = await authenticateIdentity(request)
  if (!authResult.success) return authResult

  const identity = authResult.data
  if (identity.role !== IdentityRole.ADMIN && identity.role !== IdentityRole.SUPER_ADMIN) {
    return { success: false, ...ERRORS.ROLE_MISMATCH(IdentityRole.ADMIN) }
  }

  return { success: true, data: identity }
}

/**
 * GUARD: requireActiveIdentity
 * Only checks that identity exists and is active, regardless of role.
 * Use for endpoints accessible to all authenticated users.
 */
export async function requireActiveIdentity(
  request: NextRequest
): Promise<AuthResult<IdentityContext>> {
  return authenticateIdentity(request)
}

/**
 * Helper: Convert AuthResult failure to NextResponse
 */
export function authFailure(result: { error: string; status: number }): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status })
}

/**
 * ENFORCEMENT ERRORS (exported for use in endpoints)
 */
export const IdentityErrors = ERRORS

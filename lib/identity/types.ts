/**
 * MODULE 1: Identity & Ownership
 * Core type definitions for the identity enforcement layer.
 */

import { IdentityRole, IdentityStatus } from '@prisma/client'

export { IdentityRole, IdentityStatus }

/**
 * Authenticated identity context injected into requests.
 * This is the canonical identity representation used by all modules.
 */
export interface IdentityContext {
  id: string
  email: string
  role: IdentityRole
  status: IdentityStatus
}

/**
 * Extended context for vendors with ownership binding.
 * Only available when requireVendorOwnership guard passes.
 */
export interface VendorContext extends IdentityContext {
  role: typeof IdentityRole.VENDOR
  businessId: string
}

/**
 * JWT payload structure for identity tokens.
 */
export interface IdentityTokenPayload {
  sub: string        // UserIdentity.id
  email: string
  role: IdentityRole
  iat?: number
  exp?: number
}

/**
 * Result type for identity authentication.
 */
export type AuthResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number }

/**
 * Type guard to check if context is a VendorContext.
 */
export function isVendorContext(ctx: IdentityContext): ctx is VendorContext {
  return ctx.role === IdentityRole.VENDOR && 'businessId' in ctx
}

/**
 * Type guard to check if identity has SUPER_ADMIN role.
 * SUPER_ADMIN has global access to all counties.
 */
export function isSuperAdmin(ctx: IdentityContext): boolean {
  return ctx.role === IdentityRole.SUPER_ADMIN
}

/**
 * Type guard to check if identity has ADMIN role.
 */
export function isAdmin(ctx: IdentityContext): boolean {
  return ctx.role === IdentityRole.ADMIN
}

/**
 * Type guard to check if identity has VENDOR role.
 */
export function isVendor(ctx: IdentityContext): boolean {
  return ctx.role === IdentityRole.VENDOR
}

/**
 * Type guard to check if identity has USER role.
 */
export function isUser(ctx: IdentityContext): boolean {
  return ctx.role === IdentityRole.USER
}

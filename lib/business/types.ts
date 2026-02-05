/**
 * MODULE 2: Business Record (Source of Truth)
 * Core type definitions for the business entity layer.
 */

import { BusinessStatus } from '@prisma/client'

export { BusinessStatus }

/**
 * Business context for authenticated requests.
 * Includes ownership and status information.
 */
export interface BusinessContext {
  id: string
  name: string
  status: BusinessStatus
  ownerUserId: string | null
  category: string | null
}

/**
 * Extended context for business owner operations.
 * Confirms the caller owns this specific business.
 */
export interface OwnedBusinessContext extends BusinessContext {
  ownerUserId: string // Non-null, confirmed owner
}

/**
 * Business creation input (validated).
 */
export interface CreateBusinessInput {
  name: string
  description?: string
  category: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  latitude?: number
  longitude?: number
  phone?: string
  website?: string
}

/**
 * Allowed status transitions.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<BusinessStatus, BusinessStatus[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['SUSPENDED'],
  SUSPENDED: ['ACTIVE'],
} as const

/**
 * Check if a status transition is allowed.
 */
export function isValidStatusTransition(
  from: BusinessStatus,
  to: BusinessStatus
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Result type for business operations.
 */
export type BusinessResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number }

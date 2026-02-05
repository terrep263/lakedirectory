/**
 * MODULE 2: Business Record (Source of Truth)
 * Enforcement guards for business ownership and status.
 *
 * These guards extend Module 1 identity guards and provide
 * business-specific authorization for downstream modules.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BusinessStatus } from '@prisma/client'
import {
  authenticateIdentity,
  requireRole,
  IdentityRole,
  type IdentityContext,
  type AuthResult,
} from '@/lib/identity'
import type { BusinessContext, OwnedBusinessContext, BusinessResult } from './types'

/**
 * ERROR RESPONSES
 * Hard failures with clear error messages. No silent failures.
 */
export const BusinessErrors = {
  BUSINESS_NOT_FOUND: { error: 'Business not found', status: 404 },
  NOT_BUSINESS_OWNER: { error: 'You do not own this business', status: 403 },
  BUSINESS_NOT_ACTIVE: { error: 'Business is not active', status: 403 },
  VENDOR_ALREADY_OWNS_BUSINESS: { error: 'Vendor already owns a business', status: 409 },
  BUSINESS_ALREADY_OWNED: { error: 'Business already has an owner', status: 409 },
  USER_CANNOT_CREATE_BUSINESS: { error: 'USER role cannot create businesses', status: 403 },
  USER_CANNOT_CLAIM_BUSINESS: { error: 'USER role cannot claim businesses', status: 403 },
  OWNERSHIP_IMMUTABLE: { error: 'Business ownership cannot be changed', status: 403 },
  DELETE_NOT_ALLOWED: { error: 'Business deletion is not allowed', status: 405 },
  INVALID_STATUS_TRANSITION: { error: 'Invalid status transition', status: 400 },
  MISSING_REQUIRED_FIELDS: { error: 'Missing required fields for activation', status: 400 },
} as const

/**
 * GUARD: requireBusinessOwnership
 *
 * Confirms the requesting vendor owns the specified business.
 * Injects business context into the result.
 *
 * Usage:
 *   const result = await requireBusinessOwnership(request, businessId)
 *   if (!result.success) return businessFailure(result)
 *   const { business, identity } = result.data
 */
export async function requireBusinessOwnership(
  request: NextRequest,
  businessId: string
): Promise<BusinessResult<{ identity: IdentityContext; business: OwnedBusinessContext }>> {
  // First authenticate and require VENDOR role
  const authResult = await requireRole(request, IdentityRole.VENDOR)
  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  const identity = authResult.data

  // Fetch the business
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  })

  if (!business) {
    return { success: false, ...BusinessErrors.BUSINESS_NOT_FOUND }
  }

  // HARD ENFORCEMENT: Caller must be the owner
  if (business.ownerUserId !== identity.id) {
    return { success: false, ...BusinessErrors.NOT_BUSINESS_OWNER }
  }

  return {
    success: true,
    data: {
      identity,
      business: {
        id: business.id,
        name: business.name,
        status: business.businessStatus,
        ownerUserId: business.ownerUserId,
        category: business.category,
      },
    },
  }
}

/**
 * GUARD: requireActiveBusiness
 *
 * Rejects if business.status !== ACTIVE.
 * Used by Deal and Voucher modules to ensure only active businesses
 * can issue deals/vouchers.
 *
 * Usage:
 *   const result = await requireActiveBusiness(request, businessId)
 *   if (!result.success) return businessFailure(result)
 */
export async function requireActiveBusiness(
  request: NextRequest,
  businessId: string
): Promise<BusinessResult<{ identity: IdentityContext; business: BusinessContext }>> {
  // First require ownership
  const ownershipResult = await requireBusinessOwnership(request, businessId)
  if (!ownershipResult.success) {
    return ownershipResult
  }

  const { identity, business } = ownershipResult.data

  // HARD ENFORCEMENT: Business must be ACTIVE
  if (business.status !== BusinessStatus.ACTIVE) {
    return { success: false, ...BusinessErrors.BUSINESS_NOT_ACTIVE }
  }

  return {
    success: true,
    data: { identity, business },
  }
}

/**
 * GUARD: requireActiveBusinessById
 *
 * Public guard that checks if a business is active by ID only.
 * Does not require authentication - used for public business views.
 */
export async function requireActiveBusinessById(
  businessId: string
): Promise<BusinessResult<BusinessContext>> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  })

  if (!business) {
    return { success: false, ...BusinessErrors.BUSINESS_NOT_FOUND }
  }

  if (business.businessStatus !== BusinessStatus.ACTIVE) {
    return { success: false, ...BusinessErrors.BUSINESS_NOT_ACTIVE }
  }

  return {
    success: true,
    data: {
      id: business.id,
      name: business.name,
      status: business.businessStatus,
      ownerUserId: business.ownerUserId,
      category: business.category,
    },
  }
}

/**
 * GUARD: canVendorCreateBusiness (DEPRECATED)
 *
 * ENFORCEMENT RULE: Vendors CANNOT create businesses.
 * 
 * This guard is deprecated and should not be used.
 * Vendors are claimants only - they must claim existing businesses via /api/business/claim
 * 
 * All businesses are created through:
 * - Bulk import system (automatic)
 * - ADMIN manual creation (edge cases only)
 * 
 * @deprecated Vendors cannot create businesses. Use canClaimBusiness instead.
 */
export async function canVendorCreateBusiness(
  userId: string
): Promise<BusinessResult<{ canCreate: true }>> {
  // INVARIANT: Vendors cannot create businesses
  return { 
    success: false, 
    error: 'Vendors cannot create businesses. Use claim flow instead.',
    status: 403
  }
}

/**
 * GUARD: canClaimBusiness
 *
 * Checks if a business can be claimed by a vendor.
 * 
 * ENFORCEMENT RULES:
 * - Business must exist before claim (created by bulk import or ADMIN)
 * - Business must be unclaimed (ownerUserId = null)
 * - Vendor must not already own a business (one-business rule)
 * 
 * This is the ONLY way vendors gain access to businesses.
 * Claiming grants control access, not ownership creation.
 */
export async function canClaimBusiness(
  businessId: string,
  userId: string
): Promise<BusinessResult<{ business: BusinessContext }>> {
  // INVARIANT: Business must exist before claim
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  })

  if (!business) {
    return { success: false, ...BusinessErrors.BUSINESS_NOT_FOUND }
  }

  // Check if business already has an owner
  if (business.ownerUserId) {
    return { success: false, ...BusinessErrors.BUSINESS_ALREADY_OWNED }
  }

  // Check if vendor already owns a business
  const existingOwnership = await prisma.business.findUnique({
    where: { ownerUserId: userId },
  })

  if (existingOwnership) {
    return { success: false, ...BusinessErrors.VENDOR_ALREADY_OWNS_BUSINESS }
  }

  return {
    success: true,
    data: {
      business: {
        id: business.id,
        name: business.name,
        status: business.businessStatus,
        ownerUserId: business.ownerUserId,
        category: business.category,
      },
    },
  }
}

/**
 * Helper: Convert BusinessResult failure to NextResponse
 */
export function businessFailure(result: { error: string; status: number }): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status })
}

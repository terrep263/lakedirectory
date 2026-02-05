/**
 * MODULE 3: Deal Definition
 * Enforcement guards for deal ownership and lifecycle.
 *
 * These guards extend Module 1 and Module 2 guards and provide
 * deal-specific authorization for voucher issuance (Module 4).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DealStatus, BusinessStatus, DealGuardStatus } from '@prisma/client'
import {
  authenticateIdentity,
  requireRole,
  IdentityRole,
  type IdentityContext,
} from '@/lib/identity'
import type { DealContext, DealResult } from './types'

/**
 * ERROR RESPONSES
 * Hard failures with clear error messages. No silent failures.
 */
export const DealErrors = {
  DEAL_NOT_FOUND: { error: 'Deal not found', status: 404 },
  NOT_DEAL_OWNER: { error: 'You do not own the business associated with this deal', status: 403 },
  DEAL_NOT_INACTIVE: { error: 'Deal can only be modified while INACTIVE', status: 409 },
  DEAL_NOT_ACTIVE: { error: 'Deal is not active', status: 409 },
  DEAL_EXPIRED: { error: 'Deal has expired', status: 409 },
  BUSINESS_NOT_FOUND: { error: 'Business not found', status: 404 },
  BUSINESS_NOT_ACTIVE: { error: 'Business must be ACTIVE to create or activate deals', status: 403 },
  USER_CANNOT_CREATE_DEAL: { error: 'USER role cannot create deals', status: 403 },
  VENDOR_NOT_BUSINESS_OWNER: { error: 'Vendor does not own this business', status: 403 },
  ONLY_ADMIN_CAN_ACTIVATE: { error: 'Only ADMIN can activate deals', status: 403 },
  INVALID_DEAL_TRANSITION: { error: 'Invalid deal status transition', status: 400 },
  DELETE_NOT_ALLOWED: { error: 'Deal deletion is not allowed', status: 405 },
  CANNOT_MODIFY_BUSINESSID: { error: 'Cannot modify businessId', status: 400 },
  CANNOT_MODIFY_CREATOR: { error: 'Cannot modify creator', status: 400 },
  MISSING_REQUIRED_FIELDS: { error: 'Missing required fields for activation', status: 400 },
  VALIDATION_FAILED: { error: 'Deal validation failed', status: 400 },
} as const

/**
 * GUARD: requireDealOwnership
 *
 * Confirms the requesting vendor owns the business tied to the deal.
 * ADMIN bypasses ownership check.
 *
 * Usage:
 *   const result = await requireDealOwnership(request, dealId)
 *   if (!result.success) return dealFailure(result)
 */
export async function requireDealOwnership(
  request: NextRequest,
  dealId: string
): Promise<DealResult<{ identity: IdentityContext; deal: DealContext }>> {
  // Authenticate
  const authResult = await authenticateIdentity(request)
  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  const identity = authResult.data

  // USER cannot access deals for modification
  if (identity.role === IdentityRole.USER) {
    return { success: false, ...DealErrors.USER_CANNOT_CREATE_DEAL }
  }

  // Fetch the deal with business
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { business: true },
  })

  if (!deal) {
    return { success: false, ...DealErrors.DEAL_NOT_FOUND }
  }

  // ADMIN bypasses ownership check
  if (identity.role === IdentityRole.ADMIN) {
    return {
      success: true,
      data: {
        identity,
        deal: mapDealToContext(deal),
      },
    }
  }

  // VENDOR must own the business
  if (deal.business.ownerUserId !== identity.id) {
    return { success: false, ...DealErrors.NOT_DEAL_OWNER }
  }

  return {
    success: true,
    data: {
      identity,
      deal: mapDealToContext(deal),
    },
  }
}

/**
 * GUARD: requireInactiveDeal
 *
 * Rejects mutation if deal.status !== INACTIVE.
 * Used for editing deals before activation.
 */
export async function requireInactiveDeal(
  request: NextRequest,
  dealId: string
): Promise<DealResult<{ identity: IdentityContext; deal: DealContext }>> {
  const ownershipResult = await requireDealOwnership(request, dealId)
  if (!ownershipResult.success) {
    return ownershipResult
  }

  const { identity, deal } = ownershipResult.data

  // HARD ENFORCEMENT: Deal must be INACTIVE
  if (deal.status !== DealStatus.INACTIVE) {
    return { success: false, ...DealErrors.DEAL_NOT_INACTIVE }
  }

  return { success: true, data: { identity, deal } }
}

/**
 * GUARD: requireActiveDeal
 *
 * Rejects if deal.status !== ACTIVE.
 * Used by voucher issuance (Module 4).
 */
export async function requireActiveDeal(
  request: NextRequest,
  dealId: string
): Promise<DealResult<{ identity: IdentityContext; deal: DealContext }>> {
  const ownershipResult = await requireDealOwnership(request, dealId)
  if (!ownershipResult.success) {
    return ownershipResult
  }

  const { identity, deal } = ownershipResult.data

  // HARD ENFORCEMENT: Deal must be ACTIVE
  if (deal.status === DealStatus.EXPIRED) {
    return { success: false, ...DealErrors.DEAL_EXPIRED }
  }

  if (deal.status !== DealStatus.ACTIVE) {
    return { success: false, ...DealErrors.DEAL_NOT_ACTIVE }
  }

  return { success: true, data: { identity, deal } }
}

/**
 * GUARD: requireActiveDealById
 *
 * Public guard - checks if deal is ACTIVE without authentication.
 * Used for public directory views.
 */
export async function requireActiveDealById(
  dealId: string
): Promise<DealResult<DealContext>> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
  })

  if (!deal) {
    return { success: false, ...DealErrors.DEAL_NOT_FOUND }
  }

  if (deal.dealStatus !== DealStatus.ACTIVE) {
    // Hide existence of non-active deals from public
    return { success: false, ...DealErrors.DEAL_NOT_FOUND }
  }

  if (deal.guardStatus !== DealGuardStatus.APPROVED) {
    // Hide existence of non-approved deals from public
    return { success: false, ...DealErrors.DEAL_NOT_FOUND }
  }

  return {
    success: true,
    data: mapDealToContext(deal),
  }
}

/**
 * GUARD: canCreateDealForBusiness
 *
 * Validates that the user can create a deal for the specified business.
 */
export async function canCreateDealForBusiness(
  identity: IdentityContext,
  businessId: string
): Promise<DealResult<{ businessId: string }>> {
  // Fetch the business
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  })

  if (!business) {
    return { success: false, ...DealErrors.BUSINESS_NOT_FOUND }
  }

  // ADMIN can create deals for any business
  if (identity.role === IdentityRole.ADMIN) {
    return { success: true, data: { businessId } }
  }

  // VENDOR must own the business
  if (business.ownerUserId !== identity.id) {
    return { success: false, ...DealErrors.VENDOR_NOT_BUSINESS_OWNER }
  }

  return { success: true, data: { businessId } }
}

/**
 * GUARD: canActivateDeal
 *
 * Validates that a deal can be activated.
 * - Caller must be ADMIN
 * - Business must be ACTIVE
 * - Deal must have all required fields
 */
export async function canActivateDeal(
  identity: IdentityContext,
  dealId: string
): Promise<DealResult<{ deal: DealContext }>> {
  // Only ADMIN can activate
  if (identity.role !== IdentityRole.ADMIN) {
    return { success: false, ...DealErrors.ONLY_ADMIN_CAN_ACTIVATE }
  }

  // Fetch deal with business
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { business: true },
  })

  if (!deal) {
    return { success: false, ...DealErrors.DEAL_NOT_FOUND }
  }

  // Deal must be INACTIVE
  if (deal.dealStatus !== DealStatus.INACTIVE) {
    return { success: false, ...DealErrors.DEAL_NOT_INACTIVE }
  }

  // Business must be ACTIVE
  if (deal.business.businessStatus !== BusinessStatus.ACTIVE) {
    return { success: false, ...DealErrors.BUSINESS_NOT_ACTIVE }
  }

  // Validate required fields for activation
  const missingFields: string[] = []

  if (!deal.title?.trim()) missingFields.push('title')
  if (!deal.description?.trim()) missingFields.push('description')
  if (!deal.dealCategory?.trim()) missingFields.push('category')
  if (deal.originalValue === null) missingFields.push('originalValue')
  if (deal.dealPrice === null) missingFields.push('dealPrice')
  if (!deal.redemptionWindowStart) missingFields.push('redemptionWindowStart')
  if (!deal.redemptionWindowEnd) missingFields.push('redemptionWindowEnd')
  if (deal.voucherQuantityLimit === null) missingFields.push('voucherQuantityLimit')

  if (missingFields.length > 0) {
    return {
      success: false,
      error: DealErrors.MISSING_REQUIRED_FIELDS.error,
      status: DealErrors.MISSING_REQUIRED_FIELDS.status,
      details: missingFields.map((f) => ({ field: f, message: 'Required for activation' })),
    }
  }

  return {
    success: true,
    data: { deal: mapDealToContext(deal) },
  }
}

/**
 * Helper: Map Prisma Deal to DealContext
 */
function mapDealToContext(deal: {
  id: string
  businessId: string
  title: string
  description: string | null
  dealCategory: string | null
  originalValue: unknown
  dealPrice: unknown
  redemptionWindowStart: Date | null
  redemptionWindowEnd: Date | null
  voucherQuantityLimit: number | null
  dealStatus: DealStatus
  createdByUserId: string | null
}): DealContext {
  return {
    id: deal.id,
    businessId: deal.businessId,
    title: deal.title,
    description: deal.description,
    dealCategory: deal.dealCategory,
    originalValue: deal.originalValue as DealContext['originalValue'],
    dealPrice: deal.dealPrice as DealContext['dealPrice'],
    redemptionWindowStart: deal.redemptionWindowStart,
    redemptionWindowEnd: deal.redemptionWindowEnd,
    voucherQuantityLimit: deal.voucherQuantityLimit,
    status: deal.dealStatus,
    createdByUserId: deal.createdByUserId,
  }
}

/**
 * Helper: Convert DealResult failure to NextResponse
 */
export function dealFailure(
  result: { error: string; status: number; details?: { field: string; message: string }[] }
): NextResponse {
  const body: { error: string; details?: { field: string; message: string }[] } = {
    error: result.error,
  }
  if (result.details) {
    body.details = result.details
  }
  return NextResponse.json(body, { status: result.status })
}

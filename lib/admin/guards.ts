/**
 * MODULE 8: Admin Operations
 * Enforcement guards for admin governance.
 *
 * These guards extend Module 1 identity guards.
 * Admins decide; enforcement executes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BusinessStatus, DealStatus, FeaturedType, Prisma } from '@prisma/client'
import { requireAdmin, authFailure, type IdentityContext } from '@/lib/identity'
import {
  ALLOWED_BUSINESS_TRANSITIONS,
  ALLOWED_DEAL_TRANSITIONS,
  type AdminResult,
  type AdminContext,
} from './types'
import { logAdminActionInTransaction } from './audit'

/**
 * ERROR RESPONSES
 * Hard failures with clear error messages. No silent actions.
 */
export const AdminErrors = {
  // Authorization
  ADMIN_REQUIRED: { error: 'Admin access required', status: 403 },

  // Business errors
  BUSINESS_NOT_FOUND: { error: 'Business not found', status: 404 },
  INVALID_BUSINESS_TRANSITION: { error: 'Invalid business status transition', status: 409 },
  BUSINESS_ALREADY_STATUS: (status: BusinessStatus) => ({
    error: `Business is already ${status}`,
    status: 409,
  }),

  // Deal errors
  DEAL_NOT_FOUND: { error: 'Deal not found', status: 404 },
  DEAL_NOT_INACTIVE: { error: 'Deal must be INACTIVE to activate', status: 409 },
  DEAL_BUSINESS_NOT_ACTIVE: { error: 'Business must be ACTIVE to activate deal', status: 403 },
  INVALID_DEAL_TRANSITION: { error: 'Invalid deal status transition', status: 409 },
  DEAL_MISSING_FIELDS: { error: 'Deal is missing required fields for activation', status: 400 },

  // Voucher errors
  DEAL_NOT_ACTIVE_FOR_ISSUANCE: { error: 'Deal must be ACTIVE to issue vouchers', status: 409 },
  VOUCHER_LIMIT_EXCEEDED: { error: 'Voucher quantity limit exceeded', status: 409 },
  INVALID_QUANTITY: { error: 'Quantity must be a positive integer', status: 400 },

  // Founder errors
  FOUNDER_ALREADY_ASSIGNED: { error: 'Business already has founder status', status: 409 },
  FOUNDER_NOT_FOUND: { error: 'Founder status not found for this business', status: 404 },
  FOUNDER_ALREADY_REMOVED: { error: 'Founder status already removed', status: 409 },

  // Featured errors
  ENTITY_NOT_FOUND: { error: 'Entity not found', status: 404 },
  ENTITY_NOT_ACTIVE: { error: 'Only ACTIVE entities can be featured', status: 409 },
  ALREADY_FEATURED: { error: 'Entity is already featured', status: 409 },
  INVALID_DATE_RANGE: { error: 'End date must be after start date', status: 400 },
  FEATURED_NOT_FOUND: { error: 'Featured content not found', status: 404 },

  // Escalation errors
  ESCALATION_NOT_FOUND: { error: 'Escalation not found', status: 404 },
  ESCALATION_ALREADY_RESOLVED: { error: 'Escalation already resolved', status: 409 },

  // Audit errors
  AUDIT_LOG_FAILED: { error: 'Failed to create audit log', status: 500 },
} as const

/**
 * GUARD: requireAdminContext
 *
 * Validates admin authentication and returns admin context.
 * All admin endpoints MUST use this guard.
 */
export async function requireAdminContext(
  request: NextRequest
): Promise<AdminResult<AdminContext>> {
  const authResult = await requireAdmin(request)

  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  const identity = authResult.data

  return {
    success: true,
    data: {
      id: identity.id,
      email: identity.email,
      role: identity.role,
    } as AdminContext,
  }
}

/**
 * GUARD: canActivateDeal
 *
 * Validates that a deal can be activated.
 * - Deal must be INACTIVE
 * - Business must be ACTIVE
 * - All required fields must be present
 */
export async function canActivateDeal(
  dealId: string
): Promise<AdminResult<{ deal: { id: string; businessId: string; title: string } }>> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { business: true },
  })

  if (!deal) {
    return { success: false, ...AdminErrors.DEAL_NOT_FOUND }
  }

  if (deal.dealStatus !== DealStatus.INACTIVE) {
    return { success: false, ...AdminErrors.DEAL_NOT_INACTIVE }
  }

  if (deal.business.businessStatus !== BusinessStatus.ACTIVE) {
    return { success: false, ...AdminErrors.DEAL_BUSINESS_NOT_ACTIVE }
  }

  // Validate required fields
  const missingFields: string[] = []
  if (!deal.title?.trim()) missingFields.push('title')
  if (!deal.description?.trim()) missingFields.push('description')
  if (!deal.dealCategory?.trim()) missingFields.push('dealCategory')
  if (deal.originalValue === null) missingFields.push('originalValue')
  if (deal.dealPrice === null) missingFields.push('dealPrice')
  if (!deal.redemptionWindowStart) missingFields.push('redemptionWindowStart')
  if (!deal.redemptionWindowEnd) missingFields.push('redemptionWindowEnd')
  if (deal.voucherQuantityLimit === null) missingFields.push('voucherQuantityLimit')

  if (missingFields.length > 0) {
    return {
      success: false,
      error: AdminErrors.DEAL_MISSING_FIELDS.error,
      status: AdminErrors.DEAL_MISSING_FIELDS.status,
      details: missingFields.map((f) => ({ field: f, message: 'Required for activation' })),
    }
  }

  return {
    success: true,
    data: {
      deal: {
        id: deal.id,
        businessId: deal.businessId,
        title: deal.title,
      },
    },
  }
}

/**
 * GUARD: canChangeBusinessStatus
 *
 * Validates that a business status transition is allowed.
 */
export async function canChangeBusinessStatus(
  businessId: string,
  newStatus: BusinessStatus
): Promise<AdminResult<{ business: { id: string; name: string; currentStatus: BusinessStatus } }>> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  })

  if (!business) {
    return { success: false, ...AdminErrors.BUSINESS_NOT_FOUND }
  }

  if (business.businessStatus === newStatus) {
    return { success: false, ...AdminErrors.BUSINESS_ALREADY_STATUS(newStatus) }
  }

  const allowedTransitions = ALLOWED_BUSINESS_TRANSITIONS[business.businessStatus]
  if (!allowedTransitions.includes(newStatus)) {
    return { success: false, ...AdminErrors.INVALID_BUSINESS_TRANSITION }
  }

  return {
    success: true,
    data: {
      business: {
        id: business.id,
        name: business.name,
        currentStatus: business.businessStatus,
      },
    },
  }
}

/**
 * GUARD: canIssueDealVouchers
 *
 * Validates that vouchers can be issued for a deal.
 * - Deal must be ACTIVE
 * - Quantity must not exceed limit
 */
export async function canIssueDealVouchers(
  dealId: string,
  quantity: number
): Promise<AdminResult<{ deal: { id: string; title: string; businessId: string; remainingCapacity: number } }>> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { success: false, ...AdminErrors.INVALID_QUANTITY }
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      _count: {
        select: { vouchers: true },
      },
    },
  })

  if (!deal) {
    return { success: false, ...AdminErrors.DEAL_NOT_FOUND }
  }

  if (deal.dealStatus !== DealStatus.ACTIVE) {
    return { success: false, ...AdminErrors.DEAL_NOT_ACTIVE_FOR_ISSUANCE }
  }

  const currentVouchers = deal._count.vouchers
  const limit = deal.voucherQuantityLimit || Infinity
  const remainingCapacity = limit - currentVouchers

  if (quantity > remainingCapacity) {
    return {
      success: false,
      error: `Cannot issue ${quantity} vouchers. Remaining capacity: ${remainingCapacity}`,
      status: 409,
    }
  }

  return {
    success: true,
    data: {
      deal: {
        id: deal.id,
        title: deal.title,
        businessId: deal.businessId,
        remainingCapacity,
      },
    },
  }
}

/**
 * GUARD: canAssignFounder
 *
 * Validates that founder status can be assigned to a business.
 */
export async function canAssignFounder(
  businessId: string
): Promise<AdminResult<{ business: { id: string; name: string } }>> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      founderStatus: true,
    },
  })

  if (!business) {
    return { success: false, ...AdminErrors.BUSINESS_NOT_FOUND }
  }

  if (business.founderStatus && business.founderStatus.isActive) {
    return { success: false, ...AdminErrors.FOUNDER_ALREADY_ASSIGNED }
  }

  return {
    success: true,
    data: {
      business: {
        id: business.id,
        name: business.name,
      },
    },
  }
}

/**
 * GUARD: canRemoveFounder
 *
 * Validates that founder status can be removed from a business.
 */
export async function canRemoveFounder(
  businessId: string
): Promise<AdminResult<{ founderStatus: { id: string; grantedAt: Date } }>> {
  const founderStatus = await prisma.founderStatus.findUnique({
    where: { businessId },
  })

  if (!founderStatus) {
    return { success: false, ...AdminErrors.FOUNDER_NOT_FOUND }
  }

  if (!founderStatus.isActive) {
    return { success: false, ...AdminErrors.FOUNDER_ALREADY_REMOVED }
  }

  return {
    success: true,
    data: {
      founderStatus: {
        id: founderStatus.id,
        grantedAt: founderStatus.grantedAt,
      },
    },
  }
}

/**
 * GUARD: canFeatureEntity
 *
 * Validates that an entity can be featured.
 * - Entity must exist and be ACTIVE
 * - Date range must be valid
 */
export async function canFeatureEntity(
  entityType: FeaturedType,
  entityId: string,
  startAt: Date,
  endAt: Date
): Promise<AdminResult<{ entity: { id: string; name: string } }>> {
  // Validate date range
  if (endAt <= startAt) {
    return { success: false, ...AdminErrors.INVALID_DATE_RANGE }
  }

  // Check entity exists and is active
  if (entityType === FeaturedType.BUSINESS) {
    const business = await prisma.business.findUnique({
      where: { id: entityId },
    })

    if (!business) {
      return { success: false, ...AdminErrors.ENTITY_NOT_FOUND }
    }

    if (business.businessStatus !== BusinessStatus.ACTIVE) {
      return { success: false, ...AdminErrors.ENTITY_NOT_ACTIVE }
    }

    // Check if already featured
    const existingFeatured = await prisma.featuredContent.findFirst({
      where: {
        entityType: FeaturedType.BUSINESS,
        entityId,
        isActive: true,
      },
    })

    if (existingFeatured) {
      return { success: false, ...AdminErrors.ALREADY_FEATURED }
    }

    return {
      success: true,
      data: {
        entity: {
          id: business.id,
          name: business.name,
        },
      },
    }
  } else {
    // DEAL
    const deal = await prisma.deal.findUnique({
      where: { id: entityId },
    })

    if (!deal) {
      return { success: false, ...AdminErrors.ENTITY_NOT_FOUND }
    }

    if (deal.dealStatus !== DealStatus.ACTIVE) {
      return { success: false, ...AdminErrors.ENTITY_NOT_ACTIVE }
    }

    // Check if already featured
    const existingFeatured = await prisma.featuredContent.findFirst({
      where: {
        entityType: FeaturedType.DEAL,
        entityId,
        isActive: true,
      },
    })

    if (existingFeatured) {
      return { success: false, ...AdminErrors.ALREADY_FEATURED }
    }

    return {
      success: true,
      data: {
        entity: {
          id: deal.id,
          name: deal.title,
        },
      },
    }
  }
}

/**
 * GUARD: canResolveEscalation
 *
 * Validates that an escalation can be resolved.
 */
export async function canResolveEscalation(
  escalationId: string
): Promise<AdminResult<{ escalation: { id: string; escalationType: string; entityType: string; entityId: string } }>> {
  const escalation = await prisma.adminEscalation.findUnique({
    where: { id: escalationId },
  })

  if (!escalation) {
    return { success: false, ...AdminErrors.ESCALATION_NOT_FOUND }
  }

  if (escalation.resolved) {
    return { success: false, ...AdminErrors.ESCALATION_ALREADY_RESOLVED }
  }

  return {
    success: true,
    data: {
      escalation: {
        id: escalation.id,
        escalationType: escalation.escalationType,
        entityType: escalation.entityType,
        entityId: escalation.entityId,
      },
    },
  }
}

/**
 * Helper: Convert AdminResult failure to NextResponse
 */
export function adminFailure(
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

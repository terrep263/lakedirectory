/**
 * MODULE 7: Vendor Operations
 * Enforcement guards for vendor operational access control.
 *
 * These guards extend Module 1 identity guards and provide vendor-specific
 * authorization. They NEVER replace or weaken enforcement from earlier modules.
 *
 * Vendors operate WITHIN enforcement. They never define it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DealStatus, BusinessStatus, VoucherStatus } from '@prisma/client'
import {
  requireVendorOwnership,
  authFailure,
  type VendorContext,
  type AuthResult,
} from '@/lib/identity'
import type { VendorResult, VendorBusinessProfile, VendorDealSummary } from './types'

/**
 * ERROR RESPONSES
 * Hard failures with clear error messages. No silent failures.
 */
export const VendorErrors = {
  // Business errors
  BUSINESS_NOT_FOUND: { error: 'Business not found', status: 404 },
  BUSINESS_NOT_ACTIVE: { error: 'Business must be ACTIVE to perform this action', status: 403 },

  // Deal errors
  DEAL_NOT_FOUND: { error: 'Deal not found', status: 404 },
  DEAL_NOT_OWNED: { error: 'Deal not found', status: 404 }, // Hide ownership info
  DEAL_NOT_INACTIVE: { error: 'Deal can only be edited while INACTIVE', status: 409 },
  DEAL_ALREADY_ACTIVE: { error: 'Deal is already active or expired', status: 409 },

  // Validation errors
  MISSING_REQUIRED_FIELD: (field: string) => ({
    error: `Missing required field: ${field}`,
    status: 400,
  }),
  INVALID_PRICE: { error: 'Deal price must be less than original value and greater than 0', status: 400 },
  INVALID_DATES: { error: 'Redemption window end must be after start', status: 400 },
  INVALID_QUANTITY: { error: 'Voucher quantity limit must be a positive integer', status: 400 },

  // Operation errors
  CANNOT_DELETE_WITH_VOUCHERS: { error: 'Cannot delete deal with issued vouchers', status: 409 },
  VENDOR_CANNOT_ACTIVATE: { error: 'Vendors cannot activate deals. Submit for admin review.', status: 403 },
  VENDOR_CANNOT_ISSUE: { error: 'Vendors cannot issue vouchers directly', status: 403 },
} as const

/**
 * GUARD: requireVendorWithBusiness
 *
 * Extends Module 1 requireVendorOwnership and fetches the full business record.
 * Returns vendor context with business profile.
 */
export async function requireVendorWithBusiness(
  request: NextRequest
): Promise<VendorResult<{ vendor: VendorContext; business: VendorBusinessProfile }>> {
  // Use Module 1 guard
  const vendorResult = await requireVendorOwnership(request)
  if (!vendorResult.success) {
    return { success: false, error: vendorResult.error, status: vendorResult.status }
  }

  const vendor = vendorResult.data

  // Fetch business details
  const business = await prisma.business.findUnique({
    where: { id: vendor.businessId },
  })

  if (!business) {
    return { success: false, ...VendorErrors.BUSINESS_NOT_FOUND }
  }

  return {
    success: true,
    data: {
      vendor,
      business: {
        id: business.id,
        name: business.name,
        status: business.businessStatus,
        category: business.category,
        description: business.description,
        addressLine1: business.addressLine1,
        addressLine2: business.addressLine2,
        city: business.city,
        state: business.state,
        postalCode: business.postalCode,
        phone: business.phone,
        website: business.website,
        logoUrl: business.logoUrl,
        coverUrl: business.coverUrl,
        photos: business.photos,
        hours: business.hours as Record<string, unknown> | null,
        isVerified: business.isVerified,
        createdAt: business.createdAt,
        ownerUserId: business.ownerUserId!,
        monthlyVoucherAllowance: business.monthlyVoucherAllowance,
      },
    },
  }
}

/**
 * GUARD: requireActiveBusinessForVendor
 *
 * Requires vendor's business to be ACTIVE for deal creation and other operations.
 */
export async function requireActiveBusinessForVendor(
  request: NextRequest
): Promise<VendorResult<{ vendor: VendorContext; business: VendorBusinessProfile }>> {
  const result = await requireVendorWithBusiness(request)
  if (!result.success) {
    return result
  }

  const { vendor, business } = result.data

  // HARD ENFORCEMENT: Business must be ACTIVE
  if (business.status !== BusinessStatus.ACTIVE) {
    return { success: false, ...VendorErrors.BUSINESS_NOT_ACTIVE }
  }

  return { success: true, data: { vendor, business } }
}

/**
 * GUARD: requireVendorDealOwnership
 *
 * Verifies the vendor owns the deal (via business ownership).
 * Returns 404 instead of 403 to hide ownership information.
 */
export async function requireVendorDealOwnership(
  request: NextRequest,
  dealId: string
): Promise<VendorResult<{ vendor: VendorContext; deal: VendorDealSummary }>> {
  // Use Module 1 guard
  const vendorResult = await requireVendorOwnership(request)
  if (!vendorResult.success) {
    return { success: false, error: vendorResult.error, status: vendorResult.status }
  }

  const vendor = vendorResult.data

  // Fetch deal with voucher counts
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      vouchers: {
        select: { status: true, expiresAt: true },
      },
    },
  })

  if (!deal) {
    return { success: false, ...VendorErrors.DEAL_NOT_FOUND }
  }

  // HARD ENFORCEMENT: Deal must belong to vendor's business
  // Return 404 to hide ownership info
  if (deal.businessId !== vendor.businessId) {
    return { success: false, ...VendorErrors.DEAL_NOT_OWNED }
  }

  // Calculate voucher metrics
  const now = new Date()
  const vouchersIssued = deal.vouchers.filter((v) => v.status === VoucherStatus.ISSUED).length
  const vouchersAssigned = deal.vouchers.filter((v) => v.status === VoucherStatus.ASSIGNED).length
  const vouchersRedeemed = deal.vouchers.filter((v) => v.status === VoucherStatus.REDEEMED).length
  const vouchersExpired = deal.vouchers.filter(
    (v) => v.expiresAt && v.expiresAt < now && v.status !== VoucherStatus.REDEEMED
  ).length

  return {
    success: true,
    data: {
      vendor,
      deal: {
        id: deal.id,
        title: deal.title,
        status: deal.dealStatus,
        dealPrice: deal.dealPrice?.toString() ?? null,
        originalValue: deal.originalValue?.toString() ?? null,
        voucherQuantityLimit: deal.voucherQuantityLimit,
        redemptionWindowStart: deal.redemptionWindowStart,
        redemptionWindowEnd: deal.redemptionWindowEnd,
        createdAt: deal.createdAt,
        vouchersIssued,
        vouchersAssigned,
        vouchersRedeemed,
        vouchersExpired,
      },
    },
  }
}

/**
 * GUARD: requireInactiveDealForEdit
 *
 * Ensures deal is INACTIVE before allowing edits.
 * Vendors may ONLY edit deals that have not been activated.
 */
export async function requireInactiveDealForEdit(
  request: NextRequest,
  dealId: string
): Promise<VendorResult<{ vendor: VendorContext; deal: VendorDealSummary }>> {
  const result = await requireVendorDealOwnership(request, dealId)
  if (!result.success) {
    return result
  }

  const { vendor, deal } = result.data

  // HARD ENFORCEMENT: Deal must be INACTIVE for editing
  if (deal.status !== DealStatus.INACTIVE) {
    return { success: false, ...VendorErrors.DEAL_NOT_INACTIVE }
  }

  return { success: true, data: { vendor, deal } }
}

/**
 * Validate deal draft input fields.
 */
export function validateDealDraftInput(input: {
  title?: string
  description?: string
  dealCategory?: string
  originalValue?: number
  dealPrice?: number
  redemptionWindowStart?: string
  redemptionWindowEnd?: string
  voucherQuantityLimit?: number
}): { valid: boolean; errors: { field: string; message: string }[] } {
  const errors: { field: string; message: string }[] = []

  // Price validation
  if (input.originalValue !== undefined && input.dealPrice !== undefined) {
    if (input.dealPrice >= input.originalValue) {
      errors.push({ field: 'dealPrice', message: 'Deal price must be less than original value' })
    }
    if (input.dealPrice <= 0) {
      errors.push({ field: 'dealPrice', message: 'Deal price must be greater than 0' })
    }
    if (input.originalValue <= 0) {
      errors.push({ field: 'originalValue', message: 'Original value must be greater than 0' })
    }
  }

  // Date validation
  if (input.redemptionWindowStart && input.redemptionWindowEnd) {
    const start = new Date(input.redemptionWindowStart)
    const end = new Date(input.redemptionWindowEnd)

    if (isNaN(start.getTime())) {
      errors.push({ field: 'redemptionWindowStart', message: 'Invalid start date format' })
    }
    if (isNaN(end.getTime())) {
      errors.push({ field: 'redemptionWindowEnd', message: 'Invalid end date format' })
    }
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
      errors.push({ field: 'redemptionWindowEnd', message: 'End date must be after start date' })
    }
  }

  // Quantity validation
  if (input.voucherQuantityLimit !== undefined) {
    if (
      !Number.isFinite(input.voucherQuantityLimit) ||
      input.voucherQuantityLimit <= 0 ||
      !Number.isInteger(input.voucherQuantityLimit)
    ) {
      errors.push({ field: 'voucherQuantityLimit', message: 'Must be a positive integer' })
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Helper: Convert VendorResult failure to NextResponse
 */
export function vendorFailure(
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

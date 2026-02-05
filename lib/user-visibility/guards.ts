/**
 * MODULE 10: User Visibility (Vouchers & History)
 * Enforcement guards for user visibility operations.
 *
 * HARD RULES:
 * - Users may only see their own data
 * - No cross-user access under any circumstances
 * - All guards are read-only (no mutations)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VoucherStatus } from '@prisma/client'
import {
  authenticateIdentity,
  IdentityRole,
  type IdentityContext,
} from '@/lib/identity'
import type {
  VisibilityResult,
  UserVoucherView,
  UserVoucherDetailView,
  UserPurchaseView,
  UserRedemptionView,
} from './types'
import { deriveUserVoucherStatus } from './types'

/**
 * ERROR RESPONSES
 * Hard failures with clear error messages. No silent failures.
 */
export const VisibilityErrors = {
  // Authorization errors
  USER_ROLE_REQUIRED: { error: 'Only USER role may access this resource', status: 403 },
  ADMIN_CANNOT_ACCESS_USER_DATA: { error: 'ADMIN must use admin endpoints', status: 403 },
  VENDOR_CANNOT_ACCESS_USER_DATA: { error: 'VENDOR cannot access user visibility data', status: 403 },

  // Ownership errors
  VOUCHER_NOT_FOUND: { error: 'Voucher not found', status: 404 },
  VOUCHER_NOT_OWNED: { error: 'Voucher not found', status: 404 }, // Same message to hide existence

  // Data errors
  NO_VOUCHERS: { error: 'No vouchers found', status: 404 },
  NO_PURCHASES: { error: 'No purchases found', status: 404 },
  NO_REDEMPTIONS: { error: 'No redemptions found', status: 404 },
} as const

/**
 * GUARD: requireUserRoleForVisibility
 *
 * Rejects request if identity.role !== USER.
 * Only USERs may access user visibility endpoints.
 */
export async function requireUserRoleForVisibility(
  request: NextRequest
): Promise<VisibilityResult<IdentityContext>> {
  const authResult = await authenticateIdentity(request)

  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  const identity = authResult.data

  // HARD ENFORCEMENT: Only USER role may access visibility data
  if (identity.role === IdentityRole.ADMIN) {
    return { success: false, ...VisibilityErrors.ADMIN_CANNOT_ACCESS_USER_DATA }
  }

  if (identity.role === IdentityRole.VENDOR) {
    return { success: false, ...VisibilityErrors.VENDOR_CANNOT_ACCESS_USER_DATA }
  }

  if (identity.role !== IdentityRole.USER) {
    return { success: false, ...VisibilityErrors.USER_ROLE_REQUIRED }
  }

  return { success: true, data: identity }
}

/**
 * GUARD: requireVoucherOwnership
 *
 * Validates that the voucher exists and is owned by the requesting user.
 * Returns 404 for both non-existent and non-owned vouchers (hide existence).
 */
export async function requireVoucherOwnership(
  request: NextRequest,
  voucherId: string
): Promise<VisibilityResult<{ identity: IdentityContext; voucher: UserVoucherDetailView }>> {
  // First check user role
  const userResult = await requireUserRoleForVisibility(request)
  if (!userResult.success) {
    return userResult
  }

  const identity = userResult.data

  // Fetch voucher with all required relations
  const voucher = await prisma.voucher.findUnique({
    where: { id: voucherId },
    include: {
      deal: {
        select: {
          id: true,
          title: true,
          description: true,
          originalValue: true,
          dealPrice: true,
        },
      },
      business: {
        select: {
          id: true,
          name: true,
        },
      },
      purchase: {
        select: {
          createdAt: true,
        },
      },
      redemption: {
        select: {
          redeemedAt: true,
        },
      },
    },
  })

  // Voucher doesn't exist
  if (!voucher) {
    return { success: false, ...VisibilityErrors.VOUCHER_NOT_FOUND }
  }

  // HARD ENFORCEMENT: Voucher must be owned by the requesting user
  // Check via Purchase record (which links user to voucher)
  const purchase = await prisma.purchase.findUnique({
    where: { voucherId: voucher.id },
  })

  if (!purchase || purchase.userId !== identity.id) {
    // Return same error to hide existence
    return { success: false, ...VisibilityErrors.VOUCHER_NOT_FOUND }
  }

  // Map to user-visible detail view
  const voucherView: UserVoucherDetailView = {
    voucherId: voucher.id,
    dealId: voucher.deal.id,
    businessName: voucher.business.name,
    dealTitle: voucher.deal.title,
    status: deriveUserVoucherStatus(voucher.status, voucher.expiresAt),
    expiresAt: voucher.expiresAt,
    redeemedAt: voucher.redemption?.redeemedAt ?? null,
    qrToken: voucher.qrToken,
    dealDescription: voucher.deal.description,
    originalValue: voucher.deal.originalValue?.toString() ?? null,
    dealPrice: voucher.deal.dealPrice?.toString() ?? null,
    issuedAt: voucher.issuedAt,
    purchasedAt: purchase.createdAt,
  }

  return {
    success: true,
    data: { identity, voucher: voucherView },
  }
}

/**
 * QUERY: getUserVouchers
 *
 * Fetches all vouchers owned by the user.
 * Only returns ASSIGNED (not ISSUED) vouchers.
 */
export async function getUserVouchers(
  userId: string
): Promise<VisibilityResult<UserVoucherView[]>> {
  // Find all purchases by this user (which establishes ownership)
  const purchases = await prisma.purchase.findMany({
    where: { userId },
    include: {
      voucher: {
        include: {
          deal: {
            select: {
              id: true,
              title: true,
            },
          },
          business: {
            select: {
              name: true,
            },
          },
          redemption: {
            select: {
              redeemedAt: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Map to user-visible views
  const vouchers: UserVoucherView[] = purchases.map((purchase) => ({
    voucherId: purchase.voucher.id,
    dealId: purchase.voucher.deal.id,
    businessName: purchase.voucher.business.name,
    dealTitle: purchase.voucher.deal.title,
    status: deriveUserVoucherStatus(purchase.voucher.status, purchase.voucher.expiresAt),
    expiresAt: purchase.voucher.expiresAt,
    redeemedAt: purchase.voucher.redemption?.redeemedAt ?? null,
  }))

  return { success: true, data: vouchers }
}

/**
 * QUERY: getUserPurchases
 *
 * Fetches all purchases made by the user.
 */
export async function getUserPurchases(
  userId: string
): Promise<VisibilityResult<UserPurchaseView[]>> {
  const purchases = await prisma.purchase.findMany({
    where: { userId },
    include: {
      deal: {
        select: {
          title: true,
        },
      },
      voucher: {
        include: {
          business: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Map to user-visible views
  const purchaseViews: UserPurchaseView[] = purchases.map((purchase) => ({
    purchaseId: purchase.id,
    dealTitle: purchase.deal.title,
    businessName: purchase.voucher.business.name,
    amountPaid: purchase.amountPaid.toString(),
    purchaseDate: purchase.createdAt,
    voucherId: purchase.voucherId,
  }))

  return { success: true, data: purchaseViews }
}

/**
 * QUERY: getUserRedemptions
 *
 * Fetches all redemptions for vouchers owned by the user.
 */
export async function getUserRedemptions(
  userId: string
): Promise<VisibilityResult<UserRedemptionView[]>> {
  // Find redemptions via the user's purchases
  const redemptions = await prisma.redemption.findMany({
    where: {
      voucher: {
        purchase: {
          userId,
        },
      },
    },
    include: {
      voucher: {
        include: {
          business: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { redeemedAt: 'desc' },
  })

  // Map to user-visible views
  const redemptionViews: UserRedemptionView[] = redemptions.map((redemption) => ({
    voucherId: redemption.voucherId,
    businessName: redemption.voucher.business.name,
    redeemedAt: redemption.redeemedAt,
  }))

  return { success: true, data: redemptionViews }
}

/**
 * Helper: Convert VisibilityResult failure to NextResponse
 */
export function visibilityFailure(
  result: { error: string; status: number }
): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status })
}

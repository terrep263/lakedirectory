/**
 * MODULE 7: Vendor Operations
 * /api/vendor/deals/:id
 *
 * GET: Retrieve a specific deal
 * PATCH: Edit a deal draft (INACTIVE only)
 * DELETE: Delete a deal (INACTIVE only, no vouchers)
 *
 * Authorization:
 *   - VENDOR only
 * Rules:
 *   - Deal must belong to vendor's business
 *   - PATCH/DELETE only allowed when deal.status = INACTIVE
 *   - Vendors cannot change deal status to ACTIVE (admin only)
 *   - Vendors cannot delete deals with vouchers
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DealStatus, VoucherStatus } from '@prisma/client'
import {
  requireVendorDealOwnership,
  requireInactiveDealForEdit,
  validateDealDraftInput,
  vendorFailure,
  VendorErrors,
} from '@/lib/vendor'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/vendor/deals/:id
 * Retrieve a specific deal with metrics
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: dealId } = await params

  // GUARD: Vendor owns this deal
  const result = await requireVendorDealOwnership(request, dealId)
  if (!result.success) {
    return vendorFailure(result)
  }

  const { deal } = result.data

  // Fetch full deal data
  const fullDeal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      vouchers: {
        select: {
          status: true,
          expiresAt: true,
          issuedAt: true,
          redeemedAt: true,
        },
      },
    },
  })

  if (!fullDeal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  const now = new Date()

  return NextResponse.json({
    success: true,
    data: {
      id: fullDeal.id,
      title: fullDeal.title,
      description: fullDeal.description,
      dealCategory: fullDeal.dealCategory,
      status: fullDeal.dealStatus,
      originalValue: fullDeal.originalValue?.toString() ?? null,
      dealPrice: fullDeal.dealPrice?.toString() ?? null,
      voucherQuantityLimit: fullDeal.voucherQuantityLimit,
      redemptionWindowStart: fullDeal.redemptionWindowStart,
      redemptionWindowEnd: fullDeal.redemptionWindowEnd,
      createdAt: fullDeal.createdAt,
      updatedAt: fullDeal.updatedAt,
      // Metrics
      metrics: {
        totalVouchers: fullDeal.vouchers.length,
        issued: fullDeal.vouchers.filter((v) => v.status === VoucherStatus.ISSUED).length,
        assigned: fullDeal.vouchers.filter((v) => v.status === VoucherStatus.ASSIGNED).length,
        redeemed: fullDeal.vouchers.filter((v) => v.status === VoucherStatus.REDEEMED).length,
        expired: fullDeal.vouchers.filter(
          (v) => v.expiresAt && v.expiresAt < now && v.status !== VoucherStatus.REDEEMED
        ).length,
      },
      // Edit status
      canEdit: fullDeal.dealStatus === DealStatus.INACTIVE,
      canDelete: fullDeal.dealStatus === DealStatus.INACTIVE && fullDeal.vouchers.length === 0,
    },
  })
}

/**
 * PATCH /api/vendor/deals/:id
 * Edit a deal draft (INACTIVE only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: dealId } = await params

  // GUARD: Deal must be INACTIVE for editing
  const result = await requireInactiveDealForEdit(request, dealId)
  if (!result.success) {
    return vendorFailure(result)
  }

  // Parse input
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // HARD RULE: Vendors cannot change deal status
  // This is enforced by simply ignoring dealStatus in the update
  if ('dealStatus' in body || 'status' in body) {
    return vendorFailure(VendorErrors.VENDOR_CANNOT_ACTIVATE)
  }

  // Validate input fields if provided
  const validation = validateDealDraftInput({
    title: body.title as string | undefined,
    description: body.description as string | undefined,
    dealCategory: body.dealCategory as string | undefined,
    originalValue: body.originalValue as number | undefined,
    dealPrice: body.dealPrice as number | undefined,
    redemptionWindowStart: body.redemptionWindowStart as string | undefined,
    redemptionWindowEnd: body.redemptionWindowEnd as string | undefined,
    voucherQuantityLimit: body.voucherQuantityLimit as number | undefined,
  })

  if (!validation.valid) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.errors,
      },
      { status: 400 }
    )
  }

  // Build update data (only allowed fields)
  const updateData: Record<string, unknown> = {}

  if (body.title !== undefined) updateData.title = (body.title as string).trim()
  if (body.description !== undefined) updateData.description = (body.description as string).trim()
  if (body.dealCategory !== undefined) updateData.dealCategory = (body.dealCategory as string).trim()
  if (body.originalValue !== undefined) updateData.originalValue = body.originalValue
  if (body.dealPrice !== undefined) updateData.dealPrice = body.dealPrice
  if (body.voucherQuantityLimit !== undefined) updateData.voucherQuantityLimit = body.voucherQuantityLimit
  if (body.redemptionWindowStart !== undefined) {
    updateData.redemptionWindowStart = new Date(body.redemptionWindowStart as string)
  }
  if (body.redemptionWindowEnd !== undefined) {
    updateData.redemptionWindowEnd = new Date(body.redemptionWindowEnd as string)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Update the deal
  const updatedDeal = await prisma.deal.update({
    where: { id: dealId },
    data: updateData,
  })

  return NextResponse.json({
    success: true,
    data: {
      id: updatedDeal.id,
      title: updatedDeal.title,
      description: updatedDeal.description,
      dealCategory: updatedDeal.dealCategory,
      status: updatedDeal.dealStatus,
      originalValue: updatedDeal.originalValue?.toString() ?? null,
      dealPrice: updatedDeal.dealPrice?.toString() ?? null,
      voucherQuantityLimit: updatedDeal.voucherQuantityLimit,
      redemptionWindowStart: updatedDeal.redemptionWindowStart,
      redemptionWindowEnd: updatedDeal.redemptionWindowEnd,
      updatedAt: updatedDeal.updatedAt,
    },
    message: 'Deal draft updated. Submit for admin review to activate.',
  })
}

/**
 * DELETE /api/vendor/deals/:id
 * Delete a deal draft (INACTIVE only, no vouchers)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: dealId } = await params

  // GUARD: Deal must be INACTIVE for deletion
  const result = await requireInactiveDealForEdit(request, dealId)
  if (!result.success) {
    return vendorFailure(result)
  }

  // Check for vouchers
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      _count: {
        select: { vouchers: true },
      },
    },
  })

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  // HARD RULE: Cannot delete deal with vouchers
  if (deal._count.vouchers > 0) {
    return vendorFailure(VendorErrors.CANNOT_DELETE_WITH_VOUCHERS)
  }

  // Delete the deal
  await prisma.deal.delete({
    where: { id: dealId },
  })

  return NextResponse.json({
    success: true,
    message: 'Deal deleted successfully',
  })
}

/**
 * MODULE 3: Deal Definition
 * GET /api/deals/:id - Retrieve deal
 * PATCH /api/deals/:id - Edit deal before activation
 * DELETE /api/deals/:id - BLOCKED
 *
 * Authorization:
 *   GET: Public only if ACTIVE, Owner or ADMIN otherwise
 *   PATCH: Owner VENDOR or ADMIN, only if INACTIVE
 *   DELETE: Always 405
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DealStatus, DealGuardStatus } from '@prisma/client'
import { authenticateIdentity, IdentityRole } from '@/lib/identity'
import {
  requireInactiveDeal,
  dealFailure,
  DealErrors,
  validateDealFields,
  type UpdateDealInput,
} from '@/lib/deal'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/deals/:id
 * Retrieve a deal record
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params

  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { error: 'Deal ID is required' },
      { status: 400 }
    )
  }

  // Fetch the deal
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          category: true,
          city: true,
          state: true,
          ownerUserId: true,
        },
      },
    },
  })

  if (!deal) {
    return dealFailure(DealErrors.DEAL_NOT_FOUND)
  }

  // If ACTIVE, allow public access
  if (deal.dealStatus === DealStatus.ACTIVE && deal.guardStatus === DealGuardStatus.APPROVED) {
    return NextResponse.json({
      deal: formatDealResponse(deal),
    })
  }

  // For INACTIVE or EXPIRED, require authentication
  const authResult = await authenticateIdentity(request)

  if (!authResult.success) {
    // Not authenticated and deal is not active - hide existence
    return dealFailure(DealErrors.DEAL_NOT_FOUND)
  }

  const identity = authResult.data

  // Allow access if ADMIN or owner of the business
  const isAdmin = identity.role === IdentityRole.ADMIN
  const isOwner = deal.business.ownerUserId === identity.id

  if (!isAdmin && !isOwner) {
    // Not authorized to view non-active deal - hide existence
    return dealFailure(DealErrors.DEAL_NOT_FOUND)
  }

  return NextResponse.json({
    deal: formatDealResponse(deal),
  })
}

/**
 * PATCH /api/deals/:id
 * Edit a deal before activation
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params

  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { error: 'Deal ID is required' },
      { status: 400 }
    )
  }

  // GUARD: Require ownership and INACTIVE status
  const guardResult = await requireInactiveDeal(request, id)
  if (!guardResult.success) {
    return dealFailure(guardResult)
  }

  const { identity, deal } = guardResult.data

  // Parse update input
  let body: UpdateDealInput & { businessId?: string; createdByUserId?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  // HARD ENFORCEMENT: Cannot modify businessId or creator
  if (body.businessId !== undefined) {
    return NextResponse.json(
      { error: DealErrors.CANNOT_MODIFY_BUSINESSID.error },
      { status: DealErrors.CANNOT_MODIFY_BUSINESSID.status }
    )
  }
  if (body.createdByUserId !== undefined) {
    return NextResponse.json(
      { error: DealErrors.CANNOT_MODIFY_CREATOR.error },
      { status: DealErrors.CANNOT_MODIFY_CREATOR.status }
    )
  }

  // Build update data
  const updateData: {
    title?: string
    description?: string
    dealCategory?: string
    originalValue?: number
    dealPrice?: number
    redemptionWindowStart?: Date
    redemptionWindowEnd?: Date
    voucherQuantityLimit?: number
  } = {}

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 })
    }
    updateData.title = body.title.trim()
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.trim().length === 0) {
      return NextResponse.json({ error: 'description cannot be empty' }, { status: 400 })
    }
    updateData.description = body.description.trim()
  }

  if (body.category !== undefined) {
    if (typeof body.category !== 'string' || body.category.trim().length === 0) {
      return NextResponse.json({ error: 'category cannot be empty' }, { status: 400 })
    }
    updateData.dealCategory = body.category.trim()
  }

  if (body.originalValue !== undefined) {
    updateData.originalValue = body.originalValue
  }

  if (body.dealPrice !== undefined) {
    updateData.dealPrice = body.dealPrice
  }

  if (body.redemptionWindowStart !== undefined) {
    updateData.redemptionWindowStart = new Date(body.redemptionWindowStart)
  }

  if (body.redemptionWindowEnd !== undefined) {
    updateData.redemptionWindowEnd = new Date(body.redemptionWindowEnd)
  }

  if (body.voucherQuantityLimit !== undefined) {
    updateData.voucherQuantityLimit = body.voucherQuantityLimit
  }

  // Validate updated fields
  const validationErrors = validateDealFields({
    originalValue: updateData.originalValue ?? Number(deal.originalValue),
    dealPrice: updateData.dealPrice ?? Number(deal.dealPrice),
    redemptionWindowStart: updateData.redemptionWindowStart?.toISOString() ?? deal.redemptionWindowStart?.toISOString(),
    redemptionWindowEnd: updateData.redemptionWindowEnd?.toISOString() ?? deal.redemptionWindowEnd?.toISOString(),
    voucherQuantityLimit: updateData.voucherQuantityLimit ?? deal.voucherQuantityLimit ?? undefined,
  })

  if (validationErrors.length > 0) {
    return NextResponse.json(
      {
        error: DealErrors.VALIDATION_FAILED.error,
        details: validationErrors,
      },
      { status: DealErrors.VALIDATION_FAILED.status }
    )
  }

  // Update the deal
  const updatedDeal = await prisma.deal.update({
    where: { id },
    data: updateData,
    include: {
      business: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return NextResponse.json({
    deal: formatDealResponse(updatedDeal),
    updatedBy: identity.id,
  })
}

/**
 * DELETE /api/deals/:id
 * BLOCKED - deals cannot be deleted
 */
export async function DELETE() {
  return NextResponse.json(
    { error: DealErrors.DELETE_NOT_ALLOWED.error },
    { status: DealErrors.DELETE_NOT_ALLOWED.status }
  )
}

/**
 * Format deal for API response
 */
function formatDealResponse(deal: {
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
  createdAt: Date
  updatedAt: Date
  business?: {
    id: string
    name: string
    category?: string | null
    city?: string | null
    state?: string | null
  }
}) {
  return {
    id: deal.id,
    businessId: deal.businessId,
    title: deal.title,
    description: deal.description,
    category: deal.dealCategory,
    originalValue: deal.originalValue?.toString() ?? null,
    dealPrice: deal.dealPrice?.toString() ?? null,
    redemptionWindowStart: deal.redemptionWindowStart,
    redemptionWindowEnd: deal.redemptionWindowEnd,
    voucherQuantityLimit: deal.voucherQuantityLimit,
    status: deal.dealStatus,
    createdByUserId: deal.createdByUserId,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    business: deal.business
      ? {
          id: deal.business.id,
          name: deal.business.name,
          category: deal.business.category,
          city: deal.business.city,
          state: deal.business.state,
        }
      : undefined,
  }
}

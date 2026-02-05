/**
 * MODULE 3: Deal Definition
 * POST /api/deals/create
 *
 * Purpose: Create a new deal
 * Authorization:
 *   - VENDOR (owner of business) or ADMIN
 * Rules:
 *   - Business must exist
 *   - Vendor must own the business
 *   - Deal is created with status = INACTIVE
 * Output: Deal record
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateIdentity, authFailure, IdentityRole } from '@/lib/identity'
import {
  canCreateDealForBusiness,
  dealFailure,
  DealErrors,
  validateDealFields,
  type CreateDealInput,
} from '@/lib/deal'

export async function POST(request: NextRequest) {
  // Authenticate the caller
  const authResult = await authenticateIdentity(request)
  if (!authResult.success) {
    return authFailure(authResult)
  }

  const identity = authResult.data

  // HARD ENFORCEMENT: USER cannot create deals
  if (identity.role === IdentityRole.USER) {
    return NextResponse.json(
      { error: DealErrors.USER_CANNOT_CREATE_DEAL.error },
      { status: DealErrors.USER_CANNOT_CREATE_DEAL.status }
    )
  }

  // Parse and validate input
  let body: CreateDealInput

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const {
    businessId,
    title,
    description,
    category,
    originalValue,
    dealPrice,
    redemptionWindowStart,
    redemptionWindowEnd,
    voucherQuantityLimit,
  } = body

  // Validate required fields
  if (!businessId || typeof businessId !== 'string') {
    return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }
  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 })
  }
  if (typeof originalValue !== 'number') {
    return NextResponse.json({ error: 'originalValue is required' }, { status: 400 })
  }
  if (typeof dealPrice !== 'number') {
    return NextResponse.json({ error: 'dealPrice is required' }, { status: 400 })
  }
  if (!redemptionWindowStart || typeof redemptionWindowStart !== 'string') {
    return NextResponse.json({ error: 'redemptionWindowStart is required' }, { status: 400 })
  }
  if (!redemptionWindowEnd || typeof redemptionWindowEnd !== 'string') {
    return NextResponse.json({ error: 'redemptionWindowEnd is required' }, { status: 400 })
  }
  if (typeof voucherQuantityLimit !== 'number') {
    return NextResponse.json({ error: 'voucherQuantityLimit is required' }, { status: 400 })
  }

  // Validate deal field constraints
  const validationErrors = validateDealFields({
    originalValue,
    dealPrice,
    redemptionWindowStart,
    redemptionWindowEnd,
    voucherQuantityLimit,
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

  // Check if user can create deal for this business
  const canCreate = await canCreateDealForBusiness(identity, businessId)
  if (!canCreate.success) {
    return dealFailure(canCreate)
  }

  // Create the deal with INACTIVE status
  const deal = await prisma.deal.create({
    data: {
      businessId,
      title: title.trim(),
      description: description.trim(),
      dealCategory: category.trim(),
      originalValue,
      dealPrice,
      redemptionWindowStart: new Date(redemptionWindowStart),
      redemptionWindowEnd: new Date(redemptionWindowEnd),
      voucherQuantityLimit,
      dealStatus: 'INACTIVE',
      createdByUserId: identity.id,
      isActive: false, // Legacy field sync
    },
  })

  return NextResponse.json(
    {
      deal: {
        id: deal.id,
        businessId: deal.businessId,
        title: deal.title,
        description: deal.description,
        category: deal.dealCategory,
        originalValue: deal.originalValue?.toString(),
        dealPrice: deal.dealPrice?.toString(),
        redemptionWindowStart: deal.redemptionWindowStart,
        redemptionWindowEnd: deal.redemptionWindowEnd,
        voucherQuantityLimit: deal.voucherQuantityLimit,
        status: deal.dealStatus,
        createdAt: deal.createdAt,
      },
      createdBy: identity.id,
    },
    { status: 201 }
  )
}

/**
 * MODULE 7: Vendor Operations
 * POST /api/vendor/deals/create
 *
 * Purpose: Create a deal draft
 * Authorization:
 *   - VENDOR only
 * Rules:
 *   - Business must be ACTIVE
 *   - Deal is created with status = INACTIVE (always)
 *   - Vendors cannot activate deals (admin only)
 *   - All deal fields are validated
 * Output:
 *   - Created deal draft ready for admin activation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DealStatus, DealGuardStatus } from '@prisma/client'
import {
  requireActiveBusinessForVendor,
  validateDealDraftInput,
  vendorFailure,
  VendorErrors,
} from '@/lib/vendor'
import {
  checkVendorCompliance,
  logGuardDecision,
  mapDealFieldsToSubmission,
  generateSeoDealFromBrief,
  validateBriefText,
} from '@/lib/deal-guard'

function roundCurrency(n: number): number {
  return Math.round(n * 100) / 100
}

function getMarketplacePriceGuidance(params: {
  category: string
  regularPrice: number
  dealPrice: number
}): { recommendedDealPrice: number; targetDiscountPercentRange: [number, number]; notes: string[] } {
  const category = (params.category || 'other').trim().toLowerCase()

  // Guidance, not enforcement. Ranges are conservative marketplace norms.
  const ranges: Record<string, [number, number]> = {
    restaurant: [30, 45],
    beauty: [25, 40],
    auto: [15, 30],
    fitness: [20, 35],
    entertainment: [25, 45],
    retail: [20, 35],
    services: [20, 35],
    other: [20, 35],
  }

  const range = ranges[category] || ranges.other
  const mid = (range[0] + range[1]) / 2
  const recommendedDealPrice = roundCurrency(params.regularPrice * (1 - mid / 100))

  const actualDiscount = (1 - params.dealPrice / params.regularPrice) * 100
  const notes: string[] = []
  if (Number.isFinite(actualDiscount)) {
    if (actualDiscount < range[0]) {
      notes.push(
        `Your discount is ${Math.round(actualDiscount)}%. Similar offers often land around ${range[0]}–${range[1]}% for better conversion.`
      )
    } else if (actualDiscount > range[1]) {
      notes.push(
        `Your discount is ${Math.round(actualDiscount)}%. That’s deeper than typical ${range[0]}–${range[1]}% and may reduce your return or raise trust questions.`
      )
    } else {
      notes.push(
        `Your discount is ${Math.round(actualDiscount)}%, which is within a common ${range[0]}–${range[1]}% band.`
      )
    }
  }

  notes.push(
    'Guidance only: you control your offer. Aim for a price that feels “easy to buy” while protecting margins.'
  )

  return { recommendedDealPrice, targetDiscountPercentRange: range, notes }
}

interface CreateDealInput {
  dealCategory: string
  redemptionWindowStart: string
  redemptionWindowEnd: string
  voucherQuantityLimit: number
  terms?: string
  brief?: string
}

export async function POST(request: NextRequest) {
  // GUARD: Vendor with ACTIVE business
  const businessResult = await requireActiveBusinessForVendor(request)
  if (!businessResult.success) {
    return vendorFailure(businessResult)
  }

  const { vendor, business } = businessResult.data

  // Deal Guard: vendor compliance
  const compliance = await checkVendorCompliance(vendor.id)
  if (!compliance.isCompliant) {
    return NextResponse.json(
      { error: 'Account suspended', reason: compliance.reason || 'Vendor not compliant' },
      { status: 403 }
    )
  }

  // Parse input
  let body: CreateDealInput

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Deal Guard v2: brief-only (transparent pricing deals only)
  const brief = typeof (body as any).brief === 'string' ? (body as any).brief.trim() : ''
  if (!brief) {
    return NextResponse.json(
      { error: 'Deal brief is required (example: “3 tacos for $3, regular $9.”)' },
      { status: 400 }
    )
  }

  for (const field of ['dealCategory', 'redemptionWindowStart', 'redemptionWindowEnd', 'voucherQuantityLimit'] as const) {
    if ((body as any)[field] === undefined || (body as any)[field] === null || (body as any)[field] === '') {
      return vendorFailure(VendorErrors.MISSING_REQUIRED_FIELD(field))
    }
  }

  const briefViolation = validateBriefText(brief)
  if (briefViolation) {
    return NextResponse.json({ error: briefViolation }, { status: 400 })
  }

  // Generate SEO deal from brief
  const firstDraft = await generateSeoDealFromBrief({
    brief,
    businessName: business.name,
    businessCity: business.city,
    businessState: business.state,
    dealCategory: (body as any).dealCategory,
  })

  let effective = {
    ...body,
    title: firstDraft.draft.title,
    description: firstDraft.draft.description,
    terms: firstDraft.draft.terms,
    dealPrice: firstDraft.draft.dealPrice,
    originalValue: firstDraft.draft.originalValue,
    dealCategory: firstDraft.draft.dealCategory,
  }

  // Validate field values
  const validation = validateDealDraftInput({
    title: effective.title,
    description: effective.description,
    dealCategory: effective.dealCategory,
    originalValue: Number(effective.originalValue),
    dealPrice: Number(effective.dealPrice),
    redemptionWindowStart: effective.redemptionWindowStart,
    redemptionWindowEnd: effective.redemptionWindowEnd,
    voucherQuantityLimit: Number(effective.voucherQuantityLimit),
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

  // Deal Guard: deterministic submission (AI only generates copy)
  const submission = mapDealFieldsToSubmission({
    title: effective.title.trim(),
    description: effective.description.trim(),
    dealPrice: Number(effective.dealPrice),
    dealCategory: effective.dealCategory.trim(),
    redemptionTerms: (effective as any).terms || effective.description, // brief-only: generated terms
    redemptionWindowEnd: new Date(effective.redemptionWindowEnd),
    voucherQuantityLimit: Number(effective.voucherQuantityLimit),
  })

  // Prefer explicit vendor terms when present
  ;(submission as any).redemptionTerms = (effective as any).terms || submission.redemptionTerms

  // Deal Guard: pricing guidance (non-blocking)
  const pricingGuidance = getMarketplacePriceGuidance({
    category: submission.category,
    regularPrice: Number(effective.originalValue),
    dealPrice: Number(effective.dealPrice),
  })

  const duplicate = await prisma.deal.findFirst({
    where: {
      createdByUserId: vendor.id,
      title: effective.title.trim(),
      guardStatus: DealGuardStatus.APPROVED,
      dealStatus: DealStatus.ACTIVE,
    },
    select: { id: true },
  })
  if (duplicate) {
    return NextResponse.json(
      { error: 'Duplicate deal title', message: 'You already have an active deal with this title.' },
      { status: 400 }
    )
  }

  // If we got here, the deal is compliant-by-construction.
  const guardResult = {
    status: 'approved' as const,
    guardStatus: DealGuardStatus.APPROVED,
    qualityScore: 0,
    feedback: 'Generated and approved',
    violations: [],
  }

  // Persist deal + guard decision
  const deal = await prisma.deal.create({
    data: {
      businessId: business.id,
      title: effective.title.trim(),
      description: effective.description.trim(),
      dealCategory: effective.dealCategory.trim(),
      originalValue: Number(effective.originalValue),
      dealPrice: Number(effective.dealPrice),
      redemptionWindowStart: new Date(effective.redemptionWindowStart),
      redemptionWindowEnd: new Date(effective.redemptionWindowEnd),
      voucherQuantityLimit: Number(effective.voucherQuantityLimit),
      // Brief-only Deal Guard: publish instantly when generated
      dealStatus: DealStatus.ACTIVE,
      createdByUserId: vendor.id,
      // Guard fields
      guardStatus: guardResult.guardStatus,
      qualityScore: guardResult.qualityScore,
      guardFeedback: guardResult.feedback,
      aiRewriteVersion: undefined,
      priceCategory: submission.category,
      lastActiveAt: new Date(),
      // County (best effort)
      countyId: (await prisma.business.findUnique({ where: { id: business.id }, select: { countyId: true } }))?.countyId ?? undefined,
    },
  })

  await logGuardDecision({
    dealId: deal.id,
    vendorIdentityId: vendor.id,
    result: guardResult,
  })

  return NextResponse.json(
    {
      success: true,
      dealId: deal.id,
      message: 'Deal generated and published',
      guidance: {
        recommendedDealPrice: pricingGuidance.recommendedDealPrice,
        targetDiscountPercentRange: pricingGuidance.targetDiscountPercentRange,
        notes: pricingGuidance.notes,
      },
      summary: {
        title: deal.title,
        dealPrice: Number(deal.dealPrice),
        originalValue: Number(deal.originalValue),
        dealCategory: deal.dealCategory,
      },
    },
    { status: 201 }
  )
}

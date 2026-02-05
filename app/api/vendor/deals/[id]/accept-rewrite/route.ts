import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DealGuardStatus, DealStatus } from '@prisma/client'
import { requireVendorDealOwnership, vendorFailure } from '@/lib/vendor'
import { evaluateDeal, logGuardDecision, mapDealFieldsToSubmission } from '@/lib/deal-guard'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: dealId } = await params

  const ownerResult = await requireVendorDealOwnership(request, dealId)
  if (!ownerResult.success) return vendorFailure(ownerResult)

  const vendorIdentityId = ownerResult.data.vendor.id

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      title: true,
      description: true,
      dealCategory: true,
      dealPrice: true,
      redemptionWindowEnd: true,
      voucherQuantityLimit: true,
      guardStatus: true,
      aiRewriteVersion: true,
      dealStatus: true,
    },
  })

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  if (deal.guardStatus !== DealGuardStatus.REWRITE_REQUIRED || !deal.aiRewriteVersion) {
    return NextResponse.json({ error: 'No AI rewrite available' }, { status: 404 })
  }

  const rewrite = deal.aiRewriteVersion as any
  const rewriteTitle = typeof rewrite?.title === 'string' ? rewrite.title.trim() : ''
  const rewriteDescription = typeof rewrite?.description === 'string' ? rewrite.description.trim() : ''

  if (!rewriteTitle || !rewriteDescription) {
    return NextResponse.json({ error: 'Invalid AI rewrite payload' }, { status: 400 })
  }

  const price = Number(deal.dealPrice ?? 0)
  const submission = mapDealFieldsToSubmission({
    title: rewriteTitle,
    description: rewriteDescription,
    dealPrice: Number.isFinite(price) ? price : 0,
    dealCategory: deal.dealCategory || 'other',
    redemptionTerms: rewriteDescription,
    redemptionWindowEnd: deal.redemptionWindowEnd,
    voucherQuantityLimit: deal.voucherQuantityLimit,
  })

  const guardResult = await evaluateDeal(submission, vendorIdentityId, dealId)

  const updated = await prisma.deal.update({
    where: { id: dealId },
    data: {
      title: rewriteTitle,
      description: rewriteDescription,
      guardStatus: guardResult.guardStatus,
      qualityScore: guardResult.qualityScore,
      guardFeedback: guardResult.feedback,
      dealStatus: guardResult.guardStatus === DealGuardStatus.APPROVED ? DealStatus.ACTIVE : deal.dealStatus,
      lastActiveAt: new Date(),
    },
    select: { id: true, guardStatus: true, qualityScore: true, dealStatus: true },
  })

  await logGuardDecision({
    dealId,
    vendorIdentityId,
    result: guardResult,
  })

  return NextResponse.json({
    success: updated.guardStatus === DealGuardStatus.APPROVED,
    status: guardResult.status,
    guardStatus: updated.guardStatus,
    qualityScore: updated.qualityScore,
    dealStatus: updated.dealStatus,
    message:
      updated.guardStatus === DealGuardStatus.APPROVED
        ? 'Deal approved with AI improvements'
        : 'Still needs work after rewrite',
  })
}


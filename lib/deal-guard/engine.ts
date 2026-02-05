import { prisma } from '@/lib/prisma'
import { DealGuardStatus, IdentityStatus } from '@prisma/client'
import type { DealGuardResult, DealSubmission } from './types'
import { validateEligibility, normalizePriceCategory } from './rules'
import { validatePriceCap } from './price-caps'
import { generateRewrite, scoreQuality } from './ai'

async function checkDuplicates(vendorIdentityId: string, title: string, dealId?: string): Promise<boolean> {
  const existing = await prisma.deal.findFirst({
    where: {
      createdByUserId: vendorIdentityId,
      title,
      guardStatus: DealGuardStatus.APPROVED,
      dealStatus: 'ACTIVE',
      ...(dealId ? { NOT: { id: dealId } } : {}),
    },
    select: { id: true },
  })
  return Boolean(existing)
}

export async function checkVendorCompliance(
  vendorIdentityId: string
): Promise<{ isCompliant: boolean; reason?: string }> {
  const vendor = await prisma.userIdentity.findUnique({
    where: { id: vendorIdentityId },
    select: { status: true, dealViolationCount: true },
  })

  if (!vendor) return { isCompliant: false, reason: 'Vendor not found' }
  if (vendor.status === IdentityStatus.SUSPENDED) return { isCompliant: false, reason: 'Account suspended' }
  if ((vendor.dealViolationCount ?? 0) >= 5) return { isCompliant: false, reason: 'Exceeded violation limit (5)' }

  // Warning-only: 3+ rejections in last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentRejections = await prisma.dealGuardAuditLog.count({
    where: {
      vendorIdentityId,
      guardStatus: DealGuardStatus.REJECTED,
      createdAt: { gt: thirtyDaysAgo },
    },
  })

  if (recentRejections >= 3) {
    return { isCompliant: true, reason: 'Warning: Multiple recent rejections' }
  }

  return { isCompliant: true }
}

export async function evaluateDeal(
  deal: DealSubmission,
  vendorIdentityId: string,
  dealId?: string
): Promise<DealGuardResult> {
  const violations: string[] = []

  // Step 1: Eligibility
  violations.push(...validateEligibility(deal))

  // Step 2: Price cap
  const priceViolation = await validatePriceCap(deal.price, deal.category)
  if (priceViolation) violations.push(priceViolation)

  // Step 3: Duplicates
  if (await checkDuplicates(vendorIdentityId, deal.title, dealId)) {
    violations.push('Active deal with this title already exists')
  }

  // Hard reject if rule violations
  if (violations.length > 0) {
    return {
      status: 'rejected',
      guardStatus: DealGuardStatus.REJECTED,
      qualityScore: 0,
      feedback: violations.join('; '),
      violations,
    }
  }

  // Step 4: AI scoring
  const scored = await scoreQuality(deal)
  const score = scored.score
  const feedback = scored.feedback

  // Step 5: Decision logic
  if (score >= 70) {
    return {
      status: 'approved',
      guardStatus: DealGuardStatus.APPROVED,
      qualityScore: score,
      feedback: 'Approved - meets quality standards',
      violations: [],
      aiRaw: scored.raw,
    }
  }

  if (score >= 50) {
    const rewrite = await generateRewrite(deal, feedback)
    return {
      status: 'rewrite_required',
      guardStatus: DealGuardStatus.REWRITE_REQUIRED,
      qualityScore: score,
      feedback: `Score ${score}/100 - improvements suggested: ${feedback}`,
      aiRewrite: rewrite ? { title: rewrite.title, description: rewrite.description, valueStatement: rewrite.valueStatement } : undefined,
      violations: [],
      aiRaw: scored.raw,
    }
  }

  return {
    status: 'rejected',
    guardStatus: DealGuardStatus.REJECTED,
    qualityScore: score,
    feedback: `Score ${score}/100 below minimum (50). ${feedback}`,
    violations: [`Quality too low: ${score}/100`],
    aiRaw: scored.raw,
  }
}

export async function logGuardDecision(params: {
  dealId: string
  vendorIdentityId: string
  result: DealGuardResult
}) {
  const { dealId, vendorIdentityId, result } = params

  await prisma.dealGuardAuditLog.create({
    data: {
      dealId,
      vendorIdentityId,
      action: result.status,
      qualityScore: result.qualityScore,
      guardStatus: result.guardStatus,
      feedback: result.feedback,
      aiResponse: (result.aiRewrite || result.aiRaw ? { aiRewrite: result.aiRewrite, aiRaw: result.aiRaw } : undefined) as any,
    },
  })
}

export function mapDealFieldsToSubmission(input: {
  title: string
  description: string
  dealPrice: number
  dealCategory: string
  redemptionTerms?: string | null
  redemptionWindowEnd?: Date | null
  voucherQuantityLimit?: number | null
}): DealSubmission {
  const category = normalizePriceCategory(input.dealCategory)
  return {
    title: input.title,
    description: input.description,
    price: input.dealPrice,
    category,
    redemptionTerms: input.redemptionTerms ?? undefined,
    expirationDate: input.redemptionWindowEnd ? input.redemptionWindowEnd.toISOString() : undefined,
    voucherLimit: input.voucherQuantityLimit ?? undefined,
  }
}


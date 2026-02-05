/**
 * MODULE 8: Admin Operations
 * AI Escalation System
 *
 * AI may:
 * - Score deals and vendors
 * - Detect abuse and anomalies
 * - Recommend featured entities
 * - Prioritize admin queue
 *
 * AI may NOT:
 * - Activate deals
 * - Suspend businesses
 * - Issue vouchers
 * - Remove founder status
 *
 * When threshold crossed:
 * - AI halts automated progression
 * - Admin review task is created
 * - Admin decision is required to proceed
 */

import { prisma } from '@/lib/prisma'
import { EscalationSeverity, Prisma } from '@prisma/client'
import type { EscalationInput, EscalationResolutionInput, AdminQueueItem } from './types'

/**
 * Create an AI escalation for admin review.
 * AI systems call this when thresholds are crossed.
 *
 * CRITICAL: This does NOT take any enforcement action.
 * It only creates a task for admin review.
 */
export async function createEscalation(input: EscalationInput): Promise<{
  id: string
  escalationType: string
  severity: EscalationSeverity
  createdAt: Date
}> {
  const escalation = await prisma.adminEscalation.create({
    data: {
      escalationType: input.escalationType,
      severity: input.severity,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      metadata: input.metadata ? (input.metadata as Prisma.JsonObject) : Prisma.DbNull,
    },
  })

  // Log for observability
  console.warn(
    `[AI Escalation] Created: ${input.escalationType} (${input.severity}) ` +
    `for ${input.entityType}:${input.entityId} - ${input.description}`
  )

  return {
    id: escalation.id,
    escalationType: escalation.escalationType,
    severity: escalation.severity,
    createdAt: escalation.createdAt,
  }
}

/**
 * Escalation types for common scenarios.
 */
export const EscalationTypes = {
  // DealGuard escalations
  DEAL_LOW_TRUST_SCORE: 'DEAL_LOW_TRUST_SCORE',
  DEAL_SUSPICIOUS_PRICING: 'DEAL_SUSPICIOUS_PRICING',
  DEAL_CONTENT_FLAGGED: 'DEAL_CONTENT_FLAGGED',

  // Redemption anomalies
  REDEMPTION_VELOCITY_ANOMALY: 'REDEMPTION_VELOCITY_ANOMALY',
  REDEMPTION_PATTERN_ANOMALY: 'REDEMPTION_PATTERN_ANOMALY',

  // Purchase anomalies
  PURCHASE_VELOCITY_THRESHOLD: 'PURCHASE_VELOCITY_THRESHOLD',
  FAILED_PAYMENT_THRESHOLD: 'FAILED_PAYMENT_THRESHOLD',

  // Vendor anomalies
  VENDOR_PERFORMANCE_ISSUE: 'VENDOR_PERFORMANCE_ISSUE',
  VENDOR_ABUSE_SUSPECTED: 'VENDOR_ABUSE_SUSPECTED',

  // Business anomalies
  BUSINESS_VERIFICATION_ISSUE: 'BUSINESS_VERIFICATION_ISSUE',
  BUSINESS_POLICY_VIOLATION: 'BUSINESS_POLICY_VIOLATION',
} as const

/**
 * Create a DealGuard escalation when trust score is below threshold.
 */
export async function escalateDealGuardIssue(
  dealId: string,
  trustScore: number,
  threshold: number,
  reasons: string[]
): Promise<{ id: string }> {
  return createEscalation({
    escalationType: EscalationTypes.DEAL_LOW_TRUST_SCORE,
    severity: trustScore < threshold * 0.5 ? EscalationSeverity.HIGH : EscalationSeverity.MEDIUM,
    entityType: 'DEAL',
    entityId: dealId,
    description: `Deal trust score (${trustScore.toFixed(2)}) below threshold (${threshold})`,
    metadata: {
      trustScore,
      threshold,
      reasons,
    },
  })
}

/**
 * Create a redemption anomaly escalation.
 */
export async function escalateRedemptionAnomaly(
  businessId: string,
  anomalyType: string,
  details: {
    count: number
    threshold: number
    timeWindow: string
  }
): Promise<{ id: string }> {
  return createEscalation({
    escalationType: EscalationTypes.REDEMPTION_VELOCITY_ANOMALY,
    severity: details.count > details.threshold * 2 ? EscalationSeverity.HIGH : EscalationSeverity.MEDIUM,
    entityType: 'BUSINESS',
    entityId: businessId,
    description: `Redemption anomaly: ${anomalyType}. Count: ${details.count}, Threshold: ${details.threshold}`,
    metadata: details,
  })
}

/**
 * Create a purchase velocity escalation.
 * Integrates with Module 6 AI monitoring.
 */
export async function escalatePurchaseVelocity(
  userId: string,
  dealId: string | undefined,
  velocity: number,
  threshold: number
): Promise<{ id: string }> {
  return createEscalation({
    escalationType: EscalationTypes.PURCHASE_VELOCITY_THRESHOLD,
    severity: velocity > threshold * 2 ? EscalationSeverity.HIGH : EscalationSeverity.MEDIUM,
    entityType: dealId ? 'DEAL' : 'USER',
    entityId: dealId || userId,
    description: `Purchase velocity (${velocity}) exceeded threshold (${threshold})`,
    metadata: {
      userId,
      dealId,
      velocity,
      threshold,
    },
  })
}

/**
 * Get pending escalations for admin review.
 */
export async function getPendingEscalations(options?: {
  severity?: EscalationSeverity
  escalationType?: string
  limit?: number
}): Promise<{
  id: string
  escalationType: string
  severity: EscalationSeverity
  entityType: string
  entityId: string
  description: string
  metadata: Record<string, unknown> | null
  createdAt: Date
}[]> {
  const limit = Math.min(100, Math.max(1, options?.limit || 50))

  const where: Prisma.AdminEscalationWhereInput = {
    resolved: false,
  }

  if (options?.severity) {
    where.severity = options.severity
  }

  if (options?.escalationType) {
    where.escalationType = options.escalationType
  }

  const escalations = await prisma.adminEscalation.findMany({
    where,
    orderBy: [
      { severity: 'desc' }, // CRITICAL first
      { createdAt: 'asc' },  // Oldest first within severity
    ],
    take: limit,
  })

  return escalations.map((e) => ({
    id: e.id,
    escalationType: e.escalationType,
    severity: e.severity,
    entityType: e.entityType,
    entityId: e.entityId,
    description: e.description,
    metadata: e.metadata as Record<string, unknown> | null,
    createdAt: e.createdAt,
  }))
}

/**
 * Resolve an escalation with admin decision.
 * Called after admin reviews and decides on action.
 */
export async function resolveEscalation(
  input: EscalationResolutionInput,
  adminUserId: string
): Promise<{
  id: string
  resolvedAt: Date
  resolution: string
}> {
  const escalation = await prisma.adminEscalation.update({
    where: { id: input.escalationId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: adminUserId,
      resolution: input.dismiss ? `DISMISSED: ${input.resolution}` : input.resolution,
    },
  })

  console.info(
    `[AI Escalation] Resolved: ${escalation.id} by admin ${adminUserId}. ` +
    `Resolution: ${input.dismiss ? 'DISMISSED' : 'ACTIONED'} - ${input.resolution}`
  )

  return {
    id: escalation.id,
    resolvedAt: escalation.resolvedAt!,
    resolution: escalation.resolution!,
  }
}

/**
 * Get escalation statistics for admin dashboard.
 */
export async function getEscalationStats(): Promise<{
  total: number
  pending: number
  resolved: number
  bySeverity: Record<EscalationSeverity, number>
  byType: Record<string, number>
  last24Hours: number
}> {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [total, pending, last24Hours, bySeverity, byType] = await Promise.all([
    prisma.adminEscalation.count(),
    prisma.adminEscalation.count({ where: { resolved: false } }),
    prisma.adminEscalation.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.adminEscalation.groupBy({
      by: ['severity'],
      where: { resolved: false },
      _count: true,
    }),
    prisma.adminEscalation.groupBy({
      by: ['escalationType'],
      where: { resolved: false },
      _count: true,
    }),
  ])

  const severityCounts: Record<EscalationSeverity, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  }

  for (const item of bySeverity) {
    severityCounts[item.severity] = item._count
  }

  const typeCounts: Record<string, number> = {}
  for (const item of byType) {
    typeCounts[item.escalationType] = item._count
  }

  return {
    total,
    pending,
    resolved: total - pending,
    bySeverity: severityCounts,
    byType: typeCounts,
    last24Hours,
  }
}

/**
 * Build the admin queue from multiple sources.
 * This aggregates pending items for admin review.
 */
export async function buildAdminQueue(): Promise<AdminQueueItem[]> {
  const queue: AdminQueueItem[] = []

  // Get pending escalations (highest priority)
  const escalations = await prisma.adminEscalation.findMany({
    where: { resolved: false },
    orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
    take: 50,
  })

  for (const e of escalations) {
    queue.push({
      id: e.id,
      type: 'ESCALATION',
      entityType: e.entityType,
      entityId: e.entityId,
      title: e.escalationType,
      description: e.description,
      priority: mapSeverityToPriority(e.severity),
      createdAt: e.createdAt,
      metadata: e.metadata as Record<string, unknown> | undefined,
    })
  }

  // Get INACTIVE deals pending review
  const inactiveDeals = await prisma.deal.findMany({
    where: {
      dealStatus: 'INACTIVE',
      // Only deals with all required fields for activation
      NOT: [
        { description: null },
        { dealCategory: null },
        { originalValue: null },
        { dealPrice: null },
        { redemptionWindowStart: null },
        { redemptionWindowEnd: null },
        { voucherQuantityLimit: null },
      ],
      business: {
        businessStatus: 'ACTIVE',
      },
    },
    include: {
      business: {
        select: { name: true, businessStatus: true },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  for (const deal of inactiveDeals) {
    queue.push({
      id: `deal_review_${deal.id}`,
      type: 'DEAL_REVIEW',
      entityType: 'DEAL',
      entityId: deal.id,
      title: `Review: ${deal.title}`,
      description: `Deal from ${deal.business.name} pending activation review`,
      priority: 'MEDIUM',
      createdAt: deal.createdAt,
      metadata: {
        businessName: deal.business.name,
        dealCategory: deal.dealCategory,
      },
    })
  }

  // Get DRAFT businesses pending activation
  const draftBusinesses = await prisma.business.findMany({
    where: {
      businessStatus: 'DRAFT',
      // Only businesses with required fields
      NOT: [
        { ownerUserId: null },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  for (const business of draftBusinesses) {
    queue.push({
      id: `business_review_${business.id}`,
      type: 'BUSINESS_REVIEW',
      entityType: 'BUSINESS',
      entityId: business.id,
      title: `Review: ${business.name}`,
      description: `Business pending activation review`,
      priority: 'MEDIUM',
      createdAt: business.createdAt,
      metadata: {
        category: business.category,
        city: business.city,
      },
    })
  }

  // Sort by priority and date
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  queue.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  return queue
}

/**
 * Map escalation severity to queue priority.
 */
function mapSeverityToPriority(severity: EscalationSeverity): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  switch (severity) {
    case EscalationSeverity.CRITICAL:
      return 'CRITICAL'
    case EscalationSeverity.HIGH:
      return 'HIGH'
    case EscalationSeverity.MEDIUM:
      return 'MEDIUM'
    case EscalationSeverity.LOW:
    default:
      return 'LOW'
  }
}

/**
 * Clean up old resolved escalations (older than 90 days).
 */
export async function cleanupOldEscalations(): Promise<number> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const result = await prisma.adminEscalation.deleteMany({
    where: {
      resolved: true,
      resolvedAt: { lt: ninetyDaysAgo },
    },
  })

  console.info(`[AI Escalation] Cleaned up ${result.count} old resolved escalations`)

  return result.count
}

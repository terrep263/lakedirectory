/**
 * MODULE 6: User Purchase Flow
 * AI Observation & Threshold Monitoring
 *
 * CRITICAL: AI monitoring is READ-ONLY and PASSIVE.
 * AI may NEVER approve purchases or assign vouchers.
 * AI may NEVER block or reject transactions.
 *
 * When thresholds are crossed:
 * - Purchase completes normally
 * - Admin review task is created
 * - No automated enforcement occurs
 */

import { prisma } from '@/lib/prisma'
import { PurchaseStatus } from '@prisma/client'

/**
 * Threshold configuration for purchase monitoring.
 * These are observation thresholds, NOT enforcement limits.
 */
export interface PurchaseThresholdConfig {
  // Maximum purchases per user per hour before flagging
  maxPurchasesPerUserPerHour: number
  // Maximum failed payment attempts per user per hour before flagging
  maxFailedPaymentsPerUserPerHour: number
  // Maximum purchases per deal per minute (velocity) before flagging
  maxPurchasesPerDealPerMinute: number
}

/**
 * Default threshold configuration.
 */
export const DEFAULT_THRESHOLDS: PurchaseThresholdConfig = {
  maxPurchasesPerUserPerHour: 10,
  maxFailedPaymentsPerUserPerHour: 5,
  maxPurchasesPerDealPerMinute: 50,
}

/**
 * Threshold crossing event.
 */
export interface ThresholdEvent {
  type: 'USER_VELOCITY' | 'DEAL_VELOCITY' | 'FAILED_PAYMENTS'
  userId: string
  dealId?: string
  threshold: number
  actualValue: number
  timestamp: Date
}

/**
 * Admin review task for threshold violations.
 * These are stored in-memory for now but could be persisted.
 */
export interface AdminReviewTask {
  id: string
  type: 'PURCHASE_THRESHOLD_CROSSED'
  event: ThresholdEvent
  createdAt: Date
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
  notes?: string
}

// In-memory storage for admin review tasks
// In production, this should be persisted to database
const adminReviewTasks: Map<string, AdminReviewTask> = new Map()

/**
 * Generate unique task ID
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Check purchase velocity for a user.
 * Returns threshold event if limit exceeded.
 *
 * AI OBSERVATION ONLY - Does not block purchases.
 */
export async function checkUserPurchaseVelocity(
  userId: string,
  thresholds: PurchaseThresholdConfig = DEFAULT_THRESHOLDS
): Promise<ThresholdEvent | null> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const purchaseCount = await prisma.purchase.count({
    where: {
      userId,
      status: PurchaseStatus.COMPLETED,
      createdAt: { gte: oneHourAgo },
    },
  })

  if (purchaseCount >= thresholds.maxPurchasesPerUserPerHour) {
    return {
      type: 'USER_VELOCITY',
      userId,
      threshold: thresholds.maxPurchasesPerUserPerHour,
      actualValue: purchaseCount,
      timestamp: new Date(),
    }
  }

  return null
}

/**
 * Check purchase velocity for a deal.
 * Returns threshold event if limit exceeded.
 *
 * AI OBSERVATION ONLY - Does not block purchases.
 */
export async function checkDealPurchaseVelocity(
  dealId: string,
  thresholds: PurchaseThresholdConfig = DEFAULT_THRESHOLDS
): Promise<ThresholdEvent | null> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000)

  const purchaseCount = await prisma.purchase.count({
    where: {
      dealId,
      status: PurchaseStatus.COMPLETED,
      createdAt: { gte: oneMinuteAgo },
    },
  })

  if (purchaseCount >= thresholds.maxPurchasesPerDealPerMinute) {
    return {
      type: 'DEAL_VELOCITY',
      userId: '', // Not user-specific
      dealId,
      threshold: thresholds.maxPurchasesPerDealPerMinute,
      actualValue: purchaseCount,
      timestamp: new Date(),
    }
  }

  return null
}

/**
 * Check failed payment attempts for a user.
 * Returns threshold event if limit exceeded.
 *
 * AI OBSERVATION ONLY - Does not block purchases.
 */
export async function checkFailedPaymentAttempts(
  userId: string,
  thresholds: PurchaseThresholdConfig = DEFAULT_THRESHOLDS
): Promise<ThresholdEvent | null> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const failedCount = await prisma.purchase.count({
    where: {
      userId,
      status: PurchaseStatus.FAILED,
      createdAt: { gte: oneHourAgo },
    },
  })

  if (failedCount >= thresholds.maxFailedPaymentsPerUserPerHour) {
    return {
      type: 'FAILED_PAYMENTS',
      userId,
      threshold: thresholds.maxFailedPaymentsPerUserPerHour,
      actualValue: failedCount,
      timestamp: new Date(),
    }
  }

  return null
}

/**
 * Run all threshold checks for a purchase.
 * Returns all threshold events that were triggered.
 *
 * AI OBSERVATION ONLY - Does not block purchases.
 */
export async function runPurchaseMonitoring(
  userId: string,
  dealId: string,
  thresholds: PurchaseThresholdConfig = DEFAULT_THRESHOLDS
): Promise<ThresholdEvent[]> {
  const events: ThresholdEvent[] = []

  // Check user purchase velocity
  const userVelocity = await checkUserPurchaseVelocity(userId, thresholds)
  if (userVelocity) {
    events.push(userVelocity)
  }

  // Check deal purchase velocity
  const dealVelocity = await checkDealPurchaseVelocity(dealId, thresholds)
  if (dealVelocity) {
    events.push(dealVelocity)
  }

  // Check failed payment attempts
  const failedPayments = await checkFailedPaymentAttempts(userId, thresholds)
  if (failedPayments) {
    events.push(failedPayments)
  }

  return events
}

/**
 * Create admin review task for threshold violation.
 * Called AFTER purchase completes successfully.
 *
 * IMPORTANT: This does NOT block the purchase.
 * The purchase has already completed by the time this is called.
 */
export function createAdminReviewTask(event: ThresholdEvent): AdminReviewTask {
  const task: AdminReviewTask = {
    id: generateTaskId(),
    type: 'PURCHASE_THRESHOLD_CROSSED',
    event,
    createdAt: new Date(),
    resolved: false,
  }

  adminReviewTasks.set(task.id, task)

  // Log for observability
  console.warn(
    `[AI Monitoring] Threshold crossed: ${event.type} for user ${event.userId}. ` +
    `Value: ${event.actualValue}, Threshold: ${event.threshold}. ` +
    `Admin review task created: ${task.id}`
  )

  return task
}

/**
 * Record threshold events and create admin review tasks.
 * Called AFTER purchase completes, NOT before.
 *
 * CRITICAL: Purchases are NEVER blocked by this function.
 */
export async function recordThresholdEvents(events: ThresholdEvent[]): Promise<AdminReviewTask[]> {
  const tasks: AdminReviewTask[] = []

  for (const event of events) {
    const task = createAdminReviewTask(event)
    tasks.push(task)
  }

  return tasks
}

/**
 * Get all pending admin review tasks.
 */
export function getPendingReviewTasks(): AdminReviewTask[] {
  return Array.from(adminReviewTasks.values()).filter((task) => !task.resolved)
}

/**
 * Get admin review task by ID.
 */
export function getReviewTask(taskId: string): AdminReviewTask | undefined {
  return adminReviewTasks.get(taskId)
}

/**
 * Resolve admin review task.
 * Only ADMIN can resolve tasks.
 */
export function resolveReviewTask(
  taskId: string,
  resolvedBy: string,
  notes?: string
): AdminReviewTask | undefined {
  const task = adminReviewTasks.get(taskId)

  if (!task) {
    return undefined
  }

  task.resolved = true
  task.resolvedAt = new Date()
  task.resolvedBy = resolvedBy
  task.notes = notes

  adminReviewTasks.set(taskId, task)

  console.info(
    `[AI Monitoring] Admin review task ${taskId} resolved by ${resolvedBy}. ` +
    `Notes: ${notes || 'None'}`
  )

  return task
}

/**
 * Clear old resolved tasks (cleanup).
 * Tasks older than 30 days are removed.
 */
export function cleanupOldTasks(): number {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  let cleaned = 0

  for (const [id, task] of adminReviewTasks) {
    if (task.resolved && task.resolvedAt && task.resolvedAt < thirtyDaysAgo) {
      adminReviewTasks.delete(id)
      cleaned++
    }
  }

  return cleaned
}

/**
 * Get monitoring statistics for admin dashboard.
 */
export function getMonitoringStats(): {
  totalTasks: number
  pendingTasks: number
  resolvedTasks: number
  byType: Record<string, number>
} {
  const tasks = Array.from(adminReviewTasks.values())
  const pending = tasks.filter((t) => !t.resolved)
  const resolved = tasks.filter((t) => t.resolved)

  const byType: Record<string, number> = {}
  for (const task of tasks) {
    const type = task.event.type
    byType[type] = (byType[type] || 0) + 1
  }

  return {
    totalTasks: tasks.length,
    pendingTasks: pending.length,
    resolvedTasks: resolved.length,
    byType,
  }
}

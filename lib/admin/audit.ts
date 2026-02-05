/**
 * MODULE 8: Admin Operations
 * Audit logging for all admin actions.
 *
 * CRITICAL: Every admin action MUST be logged.
 * No silent actions. No side effects without logs.
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type {
  AdminActionType,
  TargetEntityType,
  AdminActionLogEntry,
  AuditLogQuery,
  AuditLogResponse,
} from './types'

/**
 * Log an admin action to the audit trail.
 * This MUST be called for every admin operation.
 *
 * @param adminUserId - The admin performing the action
 * @param actionType - The type of action performed
 * @param targetEntityType - The type of entity affected
 * @param targetEntityId - The ID of the entity affected
 * @param metadata - Optional additional context
 * @param tx - Optional transaction context
 */
export async function logAdminAction(
  adminUserId: string,
  actionType: AdminActionType,
  targetEntityType: TargetEntityType,
  targetEntityId: string,
  metadata?: Record<string, unknown>,
  tx?: Prisma.TransactionClient
): Promise<AdminActionLogEntry> {
  const client = tx || prisma

  const log = await client.adminActionLog.create({
    data: {
      adminUserId,
      actionType,
      targetEntityType,
      targetEntityId,
      metadata: metadata ? (metadata as Prisma.JsonObject) : Prisma.DbNull,
    },
  })

  // Console log for observability
  console.info(
    `[Admin Audit] ${actionType} on ${targetEntityType}:${targetEntityId} by admin ${adminUserId}`
  )

  return {
    id: log.id,
    adminUserId: log.adminUserId,
    actionType: log.actionType as AdminActionType,
    targetEntityType: log.targetEntityType as TargetEntityType,
    targetEntityId: log.targetEntityId,
    metadata: log.metadata as Record<string, unknown> | undefined,
    createdAt: log.createdAt,
  }
}

/**
 * Log an admin action within a transaction.
 * Use this when the action is part of a larger atomic operation.
 */
export function logAdminActionInTransaction(
  tx: Prisma.TransactionClient,
  adminUserId: string,
  actionType: AdminActionType,
  targetEntityType: TargetEntityType,
  targetEntityId: string,
  metadata?: Record<string, unknown>
): Promise<AdminActionLogEntry> {
  return logAdminAction(adminUserId, actionType, targetEntityType, targetEntityId, metadata, tx)
}

/**
 * Query audit logs with filtering and pagination.
 */
export async function queryAuditLogs(query: AuditLogQuery): Promise<AuditLogResponse> {
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 50))
  const skip = (page - 1) * limit

  // Build where clause
  const where: Prisma.AdminActionLogWhereInput = {}

  if (query.adminUserId) {
    where.adminUserId = query.adminUserId
  }

  if (query.actionType) {
    where.actionType = query.actionType
  }

  if (query.targetEntityType) {
    where.targetEntityType = query.targetEntityType
  }

  if (query.targetEntityId) {
    where.targetEntityId = query.targetEntityId
  }

  if (query.startDate || query.endDate) {
    where.createdAt = {}
    if (query.startDate) {
      where.createdAt.gte = query.startDate
    }
    if (query.endDate) {
      where.createdAt.lte = query.endDate
    }
  }

  // Execute query with count
  const [logs, totalCount] = await Promise.all([
    prisma.adminActionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        admin: {
          select: { email: true },
        },
      },
    }),
    prisma.adminActionLog.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / limit)

  return {
    logs: logs.map((log) => ({
      id: log.id,
      adminUserId: log.adminUserId,
      actionType: log.actionType as AdminActionType,
      targetEntityType: log.targetEntityType as TargetEntityType,
      targetEntityId: log.targetEntityId,
      metadata: log.metadata as Record<string, unknown> | undefined,
      createdAt: log.createdAt,
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }
}

/**
 * Get audit logs for a specific entity.
 */
export async function getEntityAuditTrail(
  entityType: TargetEntityType,
  entityId: string
): Promise<AdminActionLogEntry[]> {
  const logs = await prisma.adminActionLog.findMany({
    where: {
      targetEntityType: entityType,
      targetEntityId: entityId,
    },
    orderBy: { createdAt: 'desc' },
  })

  return logs.map((log) => ({
    id: log.id,
    adminUserId: log.adminUserId,
    actionType: log.actionType as AdminActionType,
    targetEntityType: log.targetEntityType as TargetEntityType,
    targetEntityId: log.targetEntityId,
    metadata: log.metadata as Record<string, unknown> | undefined,
    createdAt: log.createdAt,
  }))
}

/**
 * Get recent admin actions for dashboard.
 */
export async function getRecentAdminActions(limit: number = 20): Promise<AdminActionLogEntry[]> {
  const logs = await prisma.adminActionLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(100, Math.max(1, limit)),
    include: {
      admin: {
        select: { email: true },
      },
    },
  })

  return logs.map((log) => ({
    id: log.id,
    adminUserId: log.adminUserId,
    actionType: log.actionType as AdminActionType,
    targetEntityType: log.targetEntityType as TargetEntityType,
    targetEntityId: log.targetEntityId,
    metadata: log.metadata as Record<string, unknown> | undefined,
    createdAt: log.createdAt,
  }))
}

/**
 * Get audit statistics for admin dashboard.
 */
export async function getAuditStats(): Promise<{
  totalActions: number
  actionsByType: Record<string, number>
  actionsByAdmin: { adminId: string; count: number }[]
  last24Hours: number
  last7Days: number
}> {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [totalActions, last24Hours, last7Days, byType, byAdmin] = await Promise.all([
    prisma.adminActionLog.count(),
    prisma.adminActionLog.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.adminActionLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.adminActionLog.groupBy({
      by: ['actionType'],
      _count: true,
    }),
    prisma.adminActionLog.groupBy({
      by: ['adminUserId'],
      _count: true,
      orderBy: { _count: { adminUserId: 'desc' } },
      take: 10,
    }),
  ])

  const actionsByType: Record<string, number> = {}
  for (const item of byType) {
    actionsByType[item.actionType] = item._count
  }

  return {
    totalActions,
    actionsByType,
    actionsByAdmin: byAdmin.map((item) => ({
      adminId: item.adminUserId,
      count: item._count,
    })),
    last24Hours,
    last7Days,
  }
}

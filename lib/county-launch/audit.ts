/**
 * NEW COUNTY LAUNCH PLAYBOOK
 * Launch Audit & Tracking
 *
 * All phase completions and status transitions are logged.
 * This log is immutable - entries are never deleted or modified.
 */

import { prisma } from '@/lib/prisma'
import type {
  LaunchPhase,
  LaunchAction,
  LaunchLogStatus,
  LaunchResult,
} from './types'

/**
 * Input for logging a launch action.
 */
export interface LogLaunchActionInput {
  countyId: string
  phase: LaunchPhase
  action: LaunchAction
  status: LaunchLogStatus
  adminId?: string
  metadata?: unknown
}

/**
 * Launch log entry from database.
 */
export interface LaunchLogEntry {
  id: string
  countyId: string
  phase: string
  action: string
  status: string
  metadata: unknown
  adminId: string | null
  createdAt: Date
}

/**
 * Log a launch action.
 * This creates an immutable audit record.
 */
export async function logLaunchAction(
  input: LogLaunchActionInput
): Promise<void> {
  await prisma.countyLaunchLog.create({
    data: {
      countyId: input.countyId,
      phase: input.phase,
      action: input.action,
      status: input.status,
      adminId: input.adminId || null,
      metadata: input.metadata || {},
    },
  })
}

/**
 * Get all launch logs for a county.
 */
export async function getLaunchLogs(
  countyId: string
): Promise<LaunchResult<LaunchLogEntry[]>> {
  const logs = await prisma.countyLaunchLog.findMany({
    where: { countyId },
    orderBy: { createdAt: 'asc' },
  })

  return {
    success: true,
    data: logs.map(log => ({
      id: log.id,
      countyId: log.countyId,
      phase: log.phase,
      action: log.action,
      status: log.status,
      metadata: log.metadata,
      adminId: log.adminId,
      createdAt: log.createdAt,
    })),
  }
}

/**
 * Get launch logs for a specific phase.
 */
export async function getLaunchLogsByPhase(
  countyId: string,
  phase: LaunchPhase
): Promise<LaunchResult<LaunchLogEntry[]>> {
  const logs = await prisma.countyLaunchLog.findMany({
    where: {
      countyId,
      phase,
    },
    orderBy: { createdAt: 'asc' },
  })

  return {
    success: true,
    data: logs.map(log => ({
      id: log.id,
      countyId: log.countyId,
      phase: log.phase,
      action: log.action,
      status: log.status,
      metadata: log.metadata,
      adminId: log.adminId,
      createdAt: log.createdAt,
    })),
  }
}

/**
 * Check if a specific action has been completed for a county.
 */
export async function hasCompletedAction(
  countyId: string,
  action: LaunchAction
): Promise<boolean> {
  const log = await prisma.countyLaunchLog.findFirst({
    where: {
      countyId,
      action,
      status: 'SUCCESS',
    },
  })

  return log !== null
}

/**
 * Get the most recent log entry for a county.
 */
export async function getMostRecentLog(
  countyId: string
): Promise<LaunchResult<LaunchLogEntry | null>> {
  const log = await prisma.countyLaunchLog.findFirst({
    where: { countyId },
    orderBy: { createdAt: 'desc' },
  })

  if (!log) {
    return { success: true, data: null }
  }

  return {
    success: true,
    data: {
      id: log.id,
      countyId: log.countyId,
      phase: log.phase,
      action: log.action,
      status: log.status,
      metadata: log.metadata,
      adminId: log.adminId,
      createdAt: log.createdAt,
    },
  }
}

/**
 * Get a summary of completed phases for a county.
 */
export async function getCompletedPhasesSummary(
  countyId: string
): Promise<LaunchResult<Record<string, boolean>>> {
  const logs = await prisma.countyLaunchLog.findMany({
    where: {
      countyId,
      status: 'SUCCESS',
    },
    select: {
      phase: true,
    },
    distinct: ['phase'],
  })

  const completedPhases: Record<string, boolean> = {}
  for (const log of logs) {
    completedPhases[log.phase] = true
  }

  return {
    success: true,
    data: completedPhases,
  }
}

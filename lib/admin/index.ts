/**
 * MODULE 8: Admin Operations
 * Public exports for admin governance layer.
 *
 * Admins decide; enforcement executes.
 * All admin actions are explicit and auditable.
 */

// Types
export * from './types'

// Guards
export {
  requireAdminContext,
  canActivateDeal,
  canChangeBusinessStatus,
  canIssueDealVouchers,
  canAssignFounder,
  canRemoveFounder,
  canFeatureEntity,
  canResolveEscalation,
  adminFailure,
  AdminErrors,
} from './guards'

// Audit logging
export {
  logAdminAction,
  logAdminActionInTransaction,
  queryAuditLogs,
  getEntityAuditTrail,
  getRecentAdminActions,
  getAuditStats,
} from './audit'

// AI Escalation
export {
  createEscalation,
  escalateDealGuardIssue,
  escalateRedemptionAnomaly,
  escalatePurchaseVelocity,
  getPendingEscalations,
  resolveEscalation,
  getEscalationStats,
  buildAdminQueue,
  cleanupOldEscalations,
  EscalationTypes,
} from './ai-escalation'

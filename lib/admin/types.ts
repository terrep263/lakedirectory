/**
 * MODULE 8: Admin Operations
 * Core type definitions for admin governance layer.
 *
 * Admins decide; enforcement executes.
 * All admin actions are explicit and auditable.
 */

import {
  BusinessStatus,
  DealStatus,
  IdentityRole,
  EscalationSeverity,
  FeaturedType,
} from '@prisma/client'

export { BusinessStatus, DealStatus, IdentityRole, EscalationSeverity, FeaturedType }

/**
 * Admin context (extends IdentityContext).
 */
export interface AdminContext {
  id: string
  email: string
  role: typeof IdentityRole.ADMIN
}

/**
 * Admin action types for audit logging.
 */
export type AdminActionType =
  // Deal governance
  | 'DEAL_ACTIVATED'
  | 'DEAL_EXPIRED'
  // Support (non-money)
  | 'ADMIN_ASSIST_VENDOR_BINDING_FIXED'
  | 'ADMIN_ASSIST_VENDOR_BUSINESS_UPDATED'
  | 'ADMIN_ASSIST_USER_VIEWED'
  | 'ADMIN_ASSIST_IDENTITY_STATUS_CHANGED'
  // Business governance
  | 'BUSINESS_ACTIVATED'
  | 'BUSINESS_SUSPENDED'
  | 'BUSINESS_REINSTATED'
  | 'BUSINESS_DEACTIVATED'
  | 'BUSINESS_DELETED'
  | 'BUSINESS_FEATURED'
  | 'BUSINESS_UNFEATURED'
  | 'BUSINESS_ENRICHMENT_RUN'
  // Voucher governance
  | 'VOUCHERS_ISSUED'
  | 'VOUCHER_VOIDED'
  // Founder governance
  | 'FOUNDER_ASSIGNED'
  | 'FOUNDER_REMOVED'
  // Featured governance
  | 'FEATURED_ADDED'
  | 'FEATURED_REMOVED'
  // Escalation governance
  | 'ESCALATION_RESOLVED'
  | 'ESCALATION_DISMISSED'
  // Claim governance (legacy Account-based claims bridged into Identity system)
  | 'CLAIM_APPROVED'
  | 'CLAIM_REJECTED'

/**
 * Target entity types for audit logging.
 */
export type TargetEntityType =
  | 'DEAL'
  | 'BUSINESS'
  | 'VOUCHER'
  | 'USER'
  | 'IDENTITY'
  | 'FOUNDER_STATUS'
  | 'FEATURED_CONTENT'
  | 'ESCALATION'
  | 'CLAIM'

/**
 * Admin action log entry.
 */
export interface AdminActionLogEntry {
  id: string
  adminUserId: string
  actionType: AdminActionType
  targetEntityType: TargetEntityType
  targetEntityId: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

/**
 * Business status transition rules.
 * Only these transitions are allowed.
 */
export const ALLOWED_BUSINESS_TRANSITIONS: Record<BusinessStatus, BusinessStatus[]> = {
  DRAFT: [BusinessStatus.ACTIVE],
  ACTIVE: [BusinessStatus.SUSPENDED],
  SUSPENDED: [BusinessStatus.ACTIVE], // Reinstatement allowed
} as const

/**
 * Deal status transition rules (from Module 3).
 */
export const ALLOWED_DEAL_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  INACTIVE: [DealStatus.ACTIVE],
  ACTIVE: [DealStatus.EXPIRED],
  EXPIRED: [], // Terminal state
} as const

/**
 * Result type for admin operations.
 */
export type AdminResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number; details?: { field: string; message: string }[] }

/**
 * Admin queue item (pending action).
 */
export interface AdminQueueItem {
  id: string
  type: 'DEAL_REVIEW' | 'BUSINESS_REVIEW' | 'ESCALATION' | 'FOUNDER_REQUEST'
  entityType: string
  entityId: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  createdAt: Date
  metadata?: Record<string, unknown>
}

/**
 * Escalation input for AI systems.
 */
export interface EscalationInput {
  escalationType: string
  severity: EscalationSeverity
  entityType: string
  entityId: string
  description: string
  metadata?: Record<string, unknown>
}

/**
 * Escalation resolution input.
 */
export interface EscalationResolutionInput {
  escalationId: string
  resolution: string
  dismiss?: boolean
}

/**
 * Featured content input.
 */
export interface FeaturedContentInput {
  entityType: FeaturedType
  entityId: string
  startAt: Date
  endAt: Date
  priority?: number
}

/**
 * Founder assignment input.
 */
export interface FounderAssignInput {
  businessId: string
  expiresAt?: Date
}

/**
 * Voucher issuance input (admin-initiated).
 */
export interface VoucherIssuanceInput {
  dealId: string
  quantity: number
  externalRef?: string
}

/**
 * Voucher issuance result.
 */
export interface VoucherIssuanceResult {
  dealId: string
  vouchersIssued: number
  voucherIds: string[]
}

/**
 * Deal activation result.
 */
export interface DealActivationResult {
  dealId: string
  previousStatus: DealStatus
  newStatus: DealStatus
  activatedAt: Date
}

/**
 * Business status change result.
 */
export interface BusinessStatusResult {
  businessId: string
  previousStatus: BusinessStatus
  newStatus: BusinessStatus
  changedAt: Date
}

/**
 * Audit log query parameters.
 */
export interface AuditLogQuery {
  adminUserId?: string
  actionType?: AdminActionType
  targetEntityType?: TargetEntityType
  targetEntityId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

/**
 * Paginated audit log response.
 */
export interface AuditLogResponse {
  logs: AdminActionLogEntry[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

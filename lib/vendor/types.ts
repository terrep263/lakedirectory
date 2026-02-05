/**
 * MODULE 7: Vendor Operations
 * Core type definitions for vendor operational layer.
 *
 * This module provides vendors with operational capabilities only.
 * It NEVER creates, bypasses, or weakens enforcement defined in earlier modules.
 *
 * Vendors operate WITHIN enforcement. They never define it.
 */

import { BusinessStatus, DealStatus, VoucherStatus, IdentityRole } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export { BusinessStatus, DealStatus, VoucherStatus }

/**
 * Vendor context with business binding.
 * Extended from Module 1 VendorContext.
 */
export interface VendorOperationalContext {
  id: string
  email: string
  role: typeof IdentityRole.VENDOR
  businessId: string
}

/**
 * Business profile as visible to vendor.
 * Read-only for ownership and lifecycle fields.
 */
export interface VendorBusinessProfile {
  id: string
  name: string
  status: BusinessStatus
  category: string | null
  description: string | null
  // Location
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  // Contact
  phone: string | null
  website: string | null
  // Media
  logoUrl: string | null
  coverUrl: string | null
  photos: string[]
  // Hours
  hours: Record<string, unknown> | null
  // Status
  isVerified: boolean
  createdAt: Date
  // Read-only: vendor cannot change these
  ownerUserId: string
  monthlyVoucherAllowance: number | null
}

/**
 * Deal summary for vendor dashboard.
 */
export interface VendorDealSummary {
  id: string
  title: string
  status: DealStatus
  dealPrice: string | null
  originalValue: string | null
  voucherQuantityLimit: number | null
  redemptionWindowStart: Date | null
  redemptionWindowEnd: Date | null
  createdAt: Date
  // Computed metrics
  vouchersIssued: number
  vouchersAssigned: number
  vouchersRedeemed: number
  vouchersExpired: number
}

/**
 * Deal draft input for creation.
 * Status is always INACTIVE on creation.
 */
export interface CreateDealDraftInput {
  title: string
  description: string
  dealCategory: string
  originalValue: number
  dealPrice: number
  redemptionWindowStart: string // ISO datetime
  redemptionWindowEnd: string   // ISO datetime
  voucherQuantityLimit: number
}

/**
 * Deal edit input for INACTIVE deals only.
 */
export interface EditDealDraftInput {
  title?: string
  description?: string
  dealCategory?: string
  originalValue?: number
  dealPrice?: number
  redemptionWindowStart?: string
  redemptionWindowEnd?: string
  voucherQuantityLimit?: number
}

/**
 * Voucher inventory summary by status.
 */
export interface VoucherInventorySummary {
  dealId: string
  dealTitle: string
  issued: number
  assigned: number
  redeemed: number
  expired: number
  total: number
}

/**
 * Redemption history record for vendor view.
 */
export interface VendorRedemptionRecord {
  id: string
  voucherId: string
  dealId: string
  dealTitle: string
  redeemedAt: Date
  originalValue: string | null
  dealPrice: string | null
}

/**
 * Result type for vendor operations.
 */
export type VendorResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number; details?: { field: string; message: string }[] }

/**
 * AI assistance suggestion for vendors.
 */
export interface VendorAISuggestion {
  type: 'DEAL_IMPROVEMENT' | 'PERFORMANCE_ALERT' | 'ISSUE_FLAG'
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  message: string
  actionable: boolean
  suggestedAction?: string
  metadata?: Record<string, unknown>
}

/**
 * AI threshold configuration for vendor alerts.
 */
export interface VendorAIThresholds {
  // Low conversion rate threshold
  lowConversionRatePercent: number
  // Abnormal redemption timing (hours from issuance)
  abnormalRedemptionHours: number
  // Repeated failed redemption attempts
  maxFailedRedemptionAttempts: number
  // DealGuard score threshold
  dealGuardScoreThreshold: number
}

/**
 * Default AI thresholds.
 * These trigger alerts but never block operations.
 */
export const DEFAULT_VENDOR_AI_THRESHOLDS: VendorAIThresholds = {
  lowConversionRatePercent: 10,
  abnormalRedemptionHours: 1,
  maxFailedRedemptionAttempts: 3,
  dealGuardScoreThreshold: 0.7,
}

/**
 * Vendor alert created by AI monitoring.
 */
export interface VendorAlert {
  id: string
  vendorId: string
  businessId: string
  type: VendorAISuggestion['type']
  severity: VendorAISuggestion['severity']
  message: string
  dealId?: string
  createdAt: Date
  acknowledged: boolean
  acknowledgedAt?: Date
}

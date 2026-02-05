/**
 * MODULE 3: Deal Definition
 * Core type definitions for the deal enforcement layer.
 */

import { DealStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export { DealStatus }

/**
 * Deal context for authenticated requests.
 */
export interface DealContext {
  id: string
  businessId: string
  title: string
  description: string | null
  dealCategory: string | null
  originalValue: Decimal | null
  dealPrice: Decimal | null
  redemptionWindowStart: Date | null
  redemptionWindowEnd: Date | null
  voucherQuantityLimit: number | null
  status: DealStatus
  createdByUserId: string | null
}

/**
 * Deal creation input (validated).
 */
export interface CreateDealInput {
  businessId: string
  title: string
  description: string
  category: string
  originalValue: number
  dealPrice: number
  redemptionWindowStart: string // ISO datetime
  redemptionWindowEnd: string   // ISO datetime
  voucherQuantityLimit: number
}

/**
 * Deal update input (for INACTIVE deals only).
 */
export interface UpdateDealInput {
  title?: string
  description?: string
  category?: string
  originalValue?: number
  dealPrice?: number
  redemptionWindowStart?: string
  redemptionWindowEnd?: string
  voucherQuantityLimit?: number
}

/**
 * Allowed deal status transitions.
 * INACTIVE → ACTIVE → EXPIRED (no reactivation, no deletion)
 */
export const ALLOWED_DEAL_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  INACTIVE: ['ACTIVE'],
  ACTIVE: ['EXPIRED'],
  EXPIRED: [], // Terminal state
} as const

/**
 * Check if a deal status transition is allowed.
 */
export function isValidDealTransition(
  from: DealStatus,
  to: DealStatus
): boolean {
  return ALLOWED_DEAL_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Validation errors for deal fields.
 */
export interface DealValidationError {
  field: string
  message: string
}

/**
 * Validate deal pricing and dates.
 */
export function validateDealFields(input: {
  originalValue?: number
  dealPrice?: number
  redemptionWindowStart?: string
  redemptionWindowEnd?: string
  voucherQuantityLimit?: number
}): DealValidationError[] {
  const errors: DealValidationError[] = []

  // dealPrice must be < originalValue
  if (input.originalValue !== undefined && input.dealPrice !== undefined) {
    if (input.dealPrice >= input.originalValue) {
      errors.push({
        field: 'dealPrice',
        message: 'Deal price must be less than original value',
      })
    }
    if (input.dealPrice <= 0) {
      errors.push({
        field: 'dealPrice',
        message: 'Deal price must be greater than 0',
      })
    }
    if (input.originalValue <= 0) {
      errors.push({
        field: 'originalValue',
        message: 'Original value must be greater than 0',
      })
    }
  }

  // redemptionWindowEnd must be after redemptionWindowStart
  if (input.redemptionWindowStart && input.redemptionWindowEnd) {
    const start = new Date(input.redemptionWindowStart)
    const end = new Date(input.redemptionWindowEnd)

    if (isNaN(start.getTime())) {
      errors.push({
        field: 'redemptionWindowStart',
        message: 'Invalid start date format',
      })
    }
    if (isNaN(end.getTime())) {
      errors.push({
        field: 'redemptionWindowEnd',
        message: 'Invalid end date format',
      })
    }
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
      errors.push({
        field: 'redemptionWindowEnd',
        message: 'Redemption window end must be after start',
      })
    }
  }

  // voucherQuantityLimit must be finite and > 0
  if (input.voucherQuantityLimit !== undefined) {
    if (
      !Number.isFinite(input.voucherQuantityLimit) ||
      input.voucherQuantityLimit <= 0 ||
      !Number.isInteger(input.voucherQuantityLimit)
    ) {
      errors.push({
        field: 'voucherQuantityLimit',
        message: 'Voucher quantity limit must be a positive integer',
      })
    }
  }

  return errors
}

/**
 * Result type for deal operations.
 */
export type DealResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number; details?: DealValidationError[] }

/**
 * MODULE 10: User Visibility (Vouchers & History)
 * AI Assistance Utilities (Non-Authoritative)
 *
 * AI may:
 * - Summarize voucher usage
 * - Explain redemption rules in plain language
 * - Highlight expiring vouchers
 * - Generate reminders or notifications
 *
 * AI may NOT:
 * - Change voucher status
 * - Extend expiration
 * - Reassign ownership
 * - Hide valid data
 *
 * Threshold handling:
 * - Low AI confidence → suppress AI output
 * - Conflicting signals → default to raw data
 */

import type {
  UserVoucherView,
  UserPurchaseView,
  UserRedemptionView,
  AIVoucherSummary,
  AIAssistanceContext,
} from './types'

/**
 * Confidence threshold below which AI output is suppressed.
 */
const CONFIDENCE_THRESHOLD = 0.6

/**
 * Days threshold for "expiring soon" alerts.
 */
const EXPIRING_SOON_DAYS = 7

/**
 * Generate a non-authoritative summary of user's vouchers.
 * This is for display hints only - never alters actual data.
 *
 * @param vouchers - User's vouchers (read-only)
 * @returns AI summary with confidence level
 */
export function generateVoucherSummary(
  vouchers: UserVoucherView[]
): AIVoucherSummary {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000)

  // Count by status
  const totalActive = vouchers.filter((v) => v.status === 'ASSIGNED').length
  const totalExpired = vouchers.filter((v) => v.status === 'EXPIRED').length
  const totalRedeemed = vouchers.filter((v) => v.status === 'REDEEMED').length

  // Find vouchers expiring within 7 days
  const expiringWithin7Days = vouchers.filter((v) => {
    if (v.status !== 'ASSIGNED' || !v.expiresAt) return false
    const expiresAt = new Date(v.expiresAt)
    return expiresAt > now && expiresAt <= sevenDaysFromNow
  }).length

  // Generate highlights (non-authoritative)
  const highlights: string[] = []

  if (totalActive === 0 && vouchers.length > 0) {
    highlights.push('No active vouchers available')
  } else if (totalActive > 0) {
    highlights.push(`${totalActive} voucher${totalActive > 1 ? 's' : ''} ready to use`)
  }

  if (expiringWithin7Days > 0) {
    highlights.push(`${expiringWithin7Days} voucher${expiringWithin7Days > 1 ? 's' : ''} expiring soon`)
  }

  if (totalRedeemed > 0) {
    highlights.push(`${totalRedeemed} voucher${totalRedeemed > 1 ? 's' : ''} redeemed`)
  }

  // Calculate confidence based on data completeness
  const confidence = calculateConfidence(vouchers)

  return {
    totalActive,
    totalExpired,
    totalRedeemed,
    expiringWithin7Days,
    highlights,
    confidence,
  }
}

/**
 * Calculate confidence level for AI summary.
 * Returns 'low' if data is incomplete or inconsistent.
 */
function calculateConfidence(
  vouchers: UserVoucherView[]
): 'high' | 'medium' | 'low' {
  if (vouchers.length === 0) {
    return 'high' // Empty set is valid, high confidence
  }

  // Check for data completeness
  const hasIncompleteData = vouchers.some((v) => {
    // Missing business name or deal title indicates incomplete data
    return !v.businessName || !v.dealTitle
  })

  if (hasIncompleteData) {
    return 'low'
  }

  // Check for potential data inconsistencies
  const hasInconsistencies = vouchers.some((v) => {
    // ASSIGNED voucher with redeemedAt is inconsistent
    if (v.status === 'ASSIGNED' && v.redeemedAt) return true
    // REDEEMED voucher without redeemedAt is inconsistent
    if (v.status === 'REDEEMED' && !v.redeemedAt) return true
    return false
  })

  if (hasInconsistencies) {
    return 'low'
  }

  // All data looks good
  return 'high'
}

/**
 * Generate plain language explanation of voucher status.
 * Non-authoritative helper for UI display.
 */
export function explainVoucherStatus(voucher: UserVoucherView): string {
  switch (voucher.status) {
    case 'ASSIGNED':
      if (voucher.expiresAt) {
        const expiresAt = new Date(voucher.expiresAt)
        const now = new Date()
        const daysUntilExpiry = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysUntilExpiry <= 0) {
          // Should not happen if status is correct, but defensive
          return 'This voucher has expired'
        } else if (daysUntilExpiry <= 3) {
          return `Ready to use - expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`
        } else if (daysUntilExpiry <= 7) {
          return `Ready to use - expires in ${daysUntilExpiry} days`
        } else {
          return 'Ready to use'
        }
      }
      return 'Ready to use'

    case 'REDEEMED':
      if (voucher.redeemedAt) {
        const redeemedAt = new Date(voucher.redeemedAt)
        return `Redeemed on ${redeemedAt.toLocaleDateString()}`
      }
      return 'Already redeemed'

    case 'EXPIRED':
      return 'This voucher has expired and can no longer be used'

    default:
      return 'Unknown status'
  }
}

/**
 * Generate reminder notifications for expiring vouchers.
 * Returns array of reminder messages for vouchers expiring soon.
 */
export function generateExpirationReminders(
  vouchers: UserVoucherView[]
): Array<{ voucherId: string; message: string; urgency: 'low' | 'medium' | 'high' }> {
  const now = new Date()
  const reminders: Array<{ voucherId: string; message: string; urgency: 'low' | 'medium' | 'high' }> = []

  for (const voucher of vouchers) {
    // Only check ASSIGNED vouchers with expiration dates
    if (voucher.status !== 'ASSIGNED' || !voucher.expiresAt) {
      continue
    }

    const expiresAt = new Date(voucher.expiresAt)
    const daysUntilExpiry = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilExpiry <= 0) {
      // Should not happen for ASSIGNED status, skip
      continue
    }

    if (daysUntilExpiry <= 1) {
      reminders.push({
        voucherId: voucher.voucherId,
        message: `Your voucher for "${voucher.dealTitle}" at ${voucher.businessName} expires tomorrow!`,
        urgency: 'high',
      })
    } else if (daysUntilExpiry <= 3) {
      reminders.push({
        voucherId: voucher.voucherId,
        message: `Your voucher for "${voucher.dealTitle}" at ${voucher.businessName} expires in ${daysUntilExpiry} days`,
        urgency: 'medium',
      })
    } else if (daysUntilExpiry <= 7) {
      reminders.push({
        voucherId: voucher.voucherId,
        message: `Reminder: Your voucher for "${voucher.dealTitle}" expires in ${daysUntilExpiry} days`,
        urgency: 'low',
      })
    }
  }

  // Sort by urgency (high first)
  return reminders.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 }
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  })
}

/**
 * Generate a complete AI assistance response.
 * Includes summary, explanations, and reminders.
 *
 * If confidence is low, returns minimal data to avoid misleading users.
 */
export function generateAIAssistance(context: AIAssistanceContext): {
  summary: AIVoucherSummary | null
  reminders: Array<{ voucherId: string; message: string; urgency: 'low' | 'medium' | 'high' }>
  suppressed: boolean
  reason?: string
} {
  const summary = generateVoucherSummary(context.vouchers)

  // Check confidence threshold
  if (summary.confidence === 'low') {
    return {
      summary: null,
      reminders: [],
      suppressed: true,
      reason: 'Low confidence due to incomplete or inconsistent data. Showing raw data only.',
    }
  }

  const reminders = generateExpirationReminders(context.vouchers)

  return {
    summary,
    reminders,
    suppressed: false,
  }
}

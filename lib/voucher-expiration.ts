/**
 * Voucher Expiration Tracking
 * 
 * Since Schema v2 Voucher model is frozen and cannot be modified,
 * this module provides expiration tracking outside the database schema.
 * 
 * In production, this should be implemented using:
 * - Redis with TTL for automatic cleanup
 * - Separate database table with indexed expiresAt column
 * - DynamoDB with TTL attribute
 * 
 * For now, uses in-memory store for demonstration.
 */

export interface VoucherExpiration {
  voucherId: string
  expiresAt: Date
  dealId: string
  issuedAt: Date
}

// In-memory expiration store (production should use Redis or database)
const voucherExpirationStore = new Map<string, VoucherExpiration>()

/**
 * Store voucher expiration timestamp
 * Called during voucher issuance in Layer 1 enforcement
 */
export function setVoucherExpiration(
  voucherId: string,
  expiresAt: Date,
  dealId: string,
  issuedAt: Date
): void {
  voucherExpirationStore.set(voucherId, {
    voucherId,
    expiresAt,
    dealId,
    issuedAt
  })
}

/**
 * Get voucher expiration details
 * Returns null if voucher expiration not found
 */
export function getVoucherExpiration(voucherId: string): VoucherExpiration | null {
  return voucherExpirationStore.get(voucherId) || null
}

/**
 * Check if voucher has expired
 * Returns true if voucher is expired, false if still valid
 * Returns true if expiration data not found (fail closed)
 */
export function isVoucherExpired(voucherId: string, now?: Date): boolean {
  const expiration = voucherExpirationStore.get(voucherId)
  
  // Fail closed: if no expiration data found, consider expired
  if (!expiration) {
    return true
  }

  const currentTime = now || new Date()
  return currentTime > expiration.expiresAt
}

/**
 * Get all voucher expirations for a deal
 * Useful for analytics and monitoring
 */
export function getVoucherExpirationsByDeal(dealId: string): VoucherExpiration[] {
  const expirations: VoucherExpiration[] = []
  
  for (const expiration of voucherExpirationStore.values()) {
    if (expiration.dealId === dealId) {
      expirations.push(expiration)
    }
  }
  
  return expirations
}

/**
 * Cleanup expired voucher expiration records
 * Should be called periodically by a background job
 */
export function cleanupExpiredVouchers(now?: Date): number {
  const currentTime = now || new Date()
  let cleanedCount = 0
  
  for (const [voucherId, expiration] of voucherExpirationStore.entries()) {
    if (currentTime > expiration.expiresAt) {
      voucherExpirationStore.delete(voucherId)
      cleanedCount++
    }
  }
  
  return cleanedCount
}

/**
 * Get expiration statistics for monitoring
 */
export function getExpirationStats(): {
  total: number
  expired: number
  active: number
} {
  const now = new Date()
  let expired = 0
  let active = 0
  
  for (const expiration of voucherExpirationStore.values()) {
    if (now > expiration.expiresAt) {
      expired++
    } else {
      active++
    }
  }
  
  return {
    total: voucherExpirationStore.size,
    expired,
    active
  }
}

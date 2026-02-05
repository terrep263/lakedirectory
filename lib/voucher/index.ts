/**
 * MODULE 4: Voucher Issuance (Public API)
 *
 * Purpose:
 * - Provide a stable import surface for voucher-related functionality.
 * - Keep internal file layout flexible while preventing ad-hoc deep imports.
 *
 * Boundary:
 * - Redemption execution is owned by `lib/redemption/engine`.
 * - Voucher module owns issuance, vendor sessions, PDF/email generation, and audit utilities.
 */

export * from './payment-callback'
export * from './email'
export * from './pdf'
export * from './renderData'
export * from './vendor-session'
export * from './voucher-audit'

// Compatibility: redemption engine is re-exported from its legacy path, but the
// canonical implementation lives in `lib/redemption/engine`.
export * from './redemption-engine'


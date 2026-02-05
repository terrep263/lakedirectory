/**
 * DEPRECATED LOCATION: Voucher redemption engine implementation.
 *
 * The canonical implementation now lives in `lib/redemption/engine.ts`.
 * This file remains as a compatibility re-export to avoid breaking imports.
 */

export type { RedemptionRequest, RedemptionResponse } from '@/lib/redemption/engine'
export { redeemVoucher, getVoucherRedemptionHistory } from '@/lib/redemption/engine'

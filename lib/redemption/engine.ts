/**
 * MODULE 5: Redemption Enforcement (Engine)
 *
 * Canonical redemption execution logic.
 * NOTE: This is the single owner of redemption behavior.
 *
 * Dependency note (transitional):
 * - Uses vendor session + voucher audit utilities currently located under `lib/voucher/`.
 * - This keeps behavior stable while consolidating the redemption engine into Module 5.
 */

import { prisma } from '@/lib/prisma'
import { validateVendorSession } from '@/lib/voucher/vendor-session'
import { logVoucherAuditEvent } from '@/lib/voucher/voucher-audit'

export interface RedemptionRequest {
  voucherId: string
  sessionToken: string
  locationId?: string
  metadata?: Record<string, any>
}

export interface RedemptionResponse {
  success: boolean
  voucherId?: string
  dealPrice?: number
  message?: string
  error?: string
  failureReason?: string
}

/**
 * Redeem a voucher atomically.
 * GLOBAL INVARIANT: First scan wins, all subsequent scans fail.
 */
export async function redeemVoucher(
  request: RedemptionRequest
): Promise<RedemptionResponse> {
  try {
    const session = await validateVendorSession(request.sessionToken)
    if (!session) {
      await logRedemptionFailure(request.voucherId, 'INVALID_SESSION', request.metadata)
      return {
        success: false,
        error: 'Invalid or expired session',
        failureReason: 'INVALID_SESSION',
      }
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const voucher = await tx.voucher.findUnique({
          where: { id: request.voucherId },
          include: {
            deal: {
              include: {
                business: true,
              },
            },
            redemption: true,
          },
        })

        if (!voucher) {
          return {
            success: false,
            failureReason: 'VOUCHER_INVALID',
            error: 'Voucher not found',
          }
        }

        if (!session.businessIds.includes(voucher.businessId)) {
          return {
            success: false,
            failureReason: 'BUSINESS_MISMATCH',
            error: 'Vendor does not own this business',
          }
        }

        if (voucher.status !== 'ISSUED') {
          return {
            success: false,
            failureReason: 'ALREADY_REDEEMED',
            error: `Voucher already ${voucher.status.toLowerCase()}`,
          }
        }

        const now = new Date()
        if (voucher.expiresAt && now > voucher.expiresAt) {
          return {
            success: false,
            failureReason: 'EXPIRED',
            error: 'Voucher has expired',
          }
        }

        if (request.locationId && session.locationIds.length > 0) {
          if (!session.locationIds.includes(request.locationId)) {
            return {
              success: false,
              failureReason: 'LOCATION_UNAUTHORIZED',
              error: 'Vendor not authorized for this location',
            }
          }
        }

        const updatedVoucher = await tx.voucher.update({
          where: { id: request.voucherId },
          data: {
            status: 'REDEEMED',
            redeemedAt: now,
            redeemedByBusinessId: voucher.businessId,
            redeemedContext: {
              locationId: request.locationId,
              sessionId: session.sessionId,
              timestamp: now.toISOString(),
              ...request.metadata,
            },
          },
        })

        const vendorRedemption = await tx.vendorRedemption.create({
          data: {
            sessionId: session.sessionId,
            voucherId: request.voucherId,
            dealId: voucher.dealId,
            businessId: voucher.businessId,
            vendorUserId: session.vendorUserId,
            locationId: request.locationId,
            status: 'SUCCESS',
            attemptedAt: now,
            completedAt: now,
            metadata: request.metadata,
          },
        })

        // Deal Guard: mark deal active usage
        await tx.deal.update({
          where: { id: voucher.dealId },
          data: { lastActiveAt: now },
        })

        await tx.voucherAuditLog.create({
          data: {
            voucherId: request.voucherId,
            actorType: 'VENDOR',
            actorId: session.vendorUserId,
            action: 'REDEEMED',
            metadata: {
              businessId: voucher.businessId,
              dealId: voucher.dealId,
              locationId: request.locationId,
              redemptionId: vendorRedemption.id,
            },
            countyId: voucher.countyId,
          },
        })

        return {
          success: true,
          voucherId: updatedVoucher.id,
          dealPrice: voucher.deal.dealPrice?.toNumber(),
          message: 'Voucher redeemed successfully',
        }
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 15000,
      }
    )

    if (result.success) {
      return result as RedemptionResponse
    }

    await logRedemptionFailure(request.voucherId, (result as any).failureReason, request.metadata)
    return result as RedemptionResponse
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Redemption error:', error)
    await logRedemptionFailure(request.voucherId, 'SYSTEM_ERROR', {
      ...request.metadata,
      errorMessage: message,
    })
    return {
      success: false,
      error: 'Redemption failed',
      failureReason: 'SYSTEM_ERROR',
    }
  }
}

async function logRedemptionFailure(
  voucherId: string,
  failureReason: string,
  metadata?: Record<string, any>
) {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
      select: { businessId: true, countyId: true },
    })

    if (voucher) {
      await logVoucherAuditEvent({
        voucherId,
        actorType: 'SYSTEM',
        action: 'REDEMPTION_FAILED',
        metadata: {
          failureReason,
          ...metadata,
        },
        countyId: voucher.countyId ?? undefined,
      })
    }
  } catch (err) {
    console.error('Failed to log redemption failure:', err)
  }
}

export async function getVoucherRedemptionHistory(voucherId: string): Promise<any> {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
      include: {
        redemption: {
          select: {
            id: true,
            voucherId: true,
            redeemedAt: true,
            businessId: true,
            vendorUserId: true,
            createdAt: true,
          },
        },
      },
    })

    return voucher?.redemption || null
  } catch (error) {
    throw new Error(
      `Failed to retrieve redemption history: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}


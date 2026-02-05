/**
 * MODULE 8: Admin Operations
 * POST /api/admin/vouchers/issue
 *
 * Purpose: Initiate voucher issuance for ACTIVE deals
 * Authorization:
 *   - ADMIN only
 * Rules:
 *   - Route through Module 4 issuance logic
 *   - Deal must be ACTIVE
 *   - Cannot exceed voucher quantity limit
 *   - Action is logged to audit trail
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VoucherStatus, Prisma } from '@prisma/client'
import { randomBytes } from 'crypto'
import {
  requireAdminContext,
  adminFailure,
  canIssueDealVouchers,
  logAdminActionInTransaction,
} from '@/lib/admin'

/**
 * Generate a secure QR token for voucher identification.
 */
function generateQRToken(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Generate an external reference for the voucher issuance.
 */
function generateExternalRef(dealId: string, index: number): string {
  return `admin_issue_${dealId}_${Date.now()}_${index}`
}

export async function POST(request: NextRequest) {
  // GUARD: Admin only (Module 8)
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) {
    return adminFailure(adminResult)
  }

  const admin = adminResult.data

  // Parse request body
  let body: { dealId: string; quantity: number; externalRef?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { dealId, quantity } = body

  if (!dealId || typeof dealId !== 'string') {
    return NextResponse.json(
      { error: 'dealId is required' },
      { status: 400 }
    )
  }

  // GUARD: Can issue vouchers for this deal
  const canIssue = await canIssueDealVouchers(dealId, quantity)
  if (!canIssue.success) {
    return adminFailure(canIssue)
  }

  const { deal } = canIssue.data

  // Get deal expiration for voucher expiry
  const dealData = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { redemptionWindowEnd: true },
  })

  // ATOMIC: Issue vouchers with Serializable isolation
  const result = await prisma.$transaction(
    async (tx) => {
      const voucherIds: string[] = []

      // Issue vouchers one at a time (maintains uniqueness guarantees)
      for (let i = 0; i < quantity; i++) {
        const externalRef = generateExternalRef(dealId, i)
        const qrToken = generateQRToken()

        // Create VoucherValidation record
        const validation = await tx.voucherValidation.create({
          data: {
            businessId: deal.businessId,
            dealId,
            externalRef,
          },
        })

        // Create Voucher record
        const voucher = await tx.voucher.create({
          data: {
            validationId: validation.id,
            dealId,
            businessId: deal.businessId,
            qrToken,
            status: VoucherStatus.ISSUED,
            expiresAt: dealData?.redemptionWindowEnd || null,
          },
        })

        voucherIds.push(voucher.id)
      }

      // Log admin action
      await logAdminActionInTransaction(
        tx,
        admin.id,
        'VOUCHERS_ISSUED',
        'DEAL',
        dealId,
        {
          quantity,
          voucherIds,
          dealTitle: deal.title,
          businessId: deal.businessId,
          remainingCapacity: deal.remainingCapacity - quantity,
        }
      )

      return voucherIds
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 30000, // 30 seconds for large issuance batches
    }
  )

  return NextResponse.json({
    success: true,
    data: {
      dealId,
      dealTitle: deal.title,
      vouchersIssued: result.length,
      voucherIds: result,
      remainingCapacity: deal.remainingCapacity - result.length,
    },
  })
}

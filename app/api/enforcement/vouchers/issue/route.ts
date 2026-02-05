import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import crypto from 'crypto'

/**
 * LAYER 1 - ENFORCEMENT: Voucher Issuance
 * 
 * This is the sole authoritative entry point for voucher creation.
 * 
 * INVARIANTS ENFORCED:
 * - Voucher can only exist after VoucherValidation
 * - Exactly one Voucher per unique externalTransactionReference
 * - No pre-generated vouchers
 * - Atomic transaction guarantees
 * - Database-level uniqueness enforcement
 * 
 * SCHEMA V2 CONSTRAINTS (immutable):
 * - VoucherValidation.externalRef is unique
 * - Voucher.validationId is unique
 * - Voucher.qrToken is unique
 * - Voucher status begins as ISSUED
 */

interface IssuanceRequest {
  externalTransactionReference: string
  dealId: string
  accountId?: string
}

function generateQRToken(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const randomBytes = crypto.randomBytes(16).toString('hex').toUpperCase()
  const hash = crypto
    .createHash('sha256')
    .update(`${timestamp}${randomBytes}`)
    .digest('hex')
    .substring(0, 12)
    .toUpperCase()
  
  return `VCH-${timestamp}-${hash}`
}

export async function POST(request: NextRequest) {
  try {
    // ENFORCEMENT: Business authentication required
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Bearer token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      )
    }

    // ENFORCEMENT: Only BUSINESS role can issue vouchers
    const account = await prisma.account.findUnique({
      where: { id: payload.accountId },
      include: {
        business: {
          include: {
            subscription: true
          }
        }
      }
    })

    if (!account || account.role !== 'BUSINESS') {
      return NextResponse.json(
        { error: 'Forbidden: Business role required' },
        { status: 403 }
      )
    }

    if (!account.business) {
      return NextResponse.json(
        { error: 'Forbidden: No business claimed' },
        { status: 403 }
      )
    }

    // ENFORCEMENT: Active subscription required
    if (!account.business.subscription || account.business.subscription.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Forbidden: Active subscription required' },
        { status: 403 }
      )
    }

    // Server-derived businessId (never trust payload)
    const businessId = account.business.id

    // Parse request body
    const body = await request.json() as IssuanceRequest

    // ENFORCEMENT: Required fields validation
    if (!body.externalTransactionReference || typeof body.externalTransactionReference !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request: externalTransactionReference is required' },
        { status: 400 }
      )
    }

    if (!body.dealId || typeof body.dealId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request: dealId is required' },
        { status: 400 }
      )
    }

    // ENFORCEMENT: Validate deal exists, belongs to business, and is active
    const deal = await prisma.deal.findUnique({
      where: { id: body.dealId }
    })

    if (!deal) {
      return NextResponse.json(
        { error: 'Not Found: Deal does not exist' },
        { status: 404 }
      )
    }

    if (deal.businessId !== businessId) {
      return NextResponse.json(
        { error: 'Forbidden: Deal does not belong to your business' },
        { status: 403 }
      )
    }

    // Schema truth: dealStatus is authoritative (isActive is deprecated)
    if (deal.dealStatus !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Conflict: Deal is not active' },
        { status: 409 }
      )
    }

    // ENFORCEMENT: Validate account exists if accountId provided
    const now = new Date()
    const voucherExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days default

    if (body.accountId) {
      const account = await prisma.account.findUnique({
        where: { id: body.accountId }
      })

      if (!account) {
        return NextResponse.json(
          { error: 'Not Found: Account does not exist' },
          { status: 404 }
        )
      }
    }

    // ATOMIC TRANSACTION: VoucherValidation → Voucher
    // This is the single enforcement point for voucher creation
    // All vouchers MUST flow through this transaction
    const result = await prisma.$transaction(async (tx) => {
      // STEP 1: Create VoucherValidation
      // The unique constraint on externalRef enforces no duplicates at database level
      // If this insert fails due to duplicate, the entire transaction rolls back
      const validation = await tx.voucherValidation.create({
        data: {
          businessId,
          dealId: body.dealId,
          externalRef: body.externalTransactionReference
        }
      })

      // STEP 2: Generate unique QR token
      // Collision-safe token generation
      const qrToken = generateQRToken()

      // STEP 3: Create Voucher
      // The unique constraint on validationId enforces exactly-once issuance
      // Voucher cannot exist without VoucherValidation (foreign key constraint)
      // Voucher begins in ISSUED state only (schema default)
      const voucher = await tx.voucher.create({
        data: {
          validationId: validation.id,
          dealId: body.dealId,
          businessId,
          accountId: body.accountId || null,
          qrToken,
          status: 'ISSUED'
        }
      })

      return { validation, voucher }
    }, {
      // Serializable isolation level for maximum consistency
      isolationLevel: 'Serializable'
    })

    // SUCCESS: Voucher issued
    return NextResponse.json(
      {
        success: true,
        data: {
          voucherId: result.voucher.id,
          validationId: result.validation.id,
          qrToken: result.voucher.qrToken,
          status: result.voucher.status,
          issuedAt: result.voucher.issuedAt,
          expiresAt: voucherExpiresAt,
          externalTransactionReference: body.externalTransactionReference
        }
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Voucher issuance enforcement error:', error)

    // ENFORCEMENT: Fail closed on all errors
    
    // Database uniqueness violation (P2002)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Conflict: Voucher already issued for this transaction reference' },
        { status: 409 }
      )
    }

    // Foreign key constraint violation (P2003)
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Conflict: Invalid reference (deal, business, or user)' },
        { status: 409 }
      )
    }

    // Transaction serialization failure
    if (error.code === 'P2034') {
      return NextResponse.json(
        { error: 'Conflict: Transaction conflict, please retry' },
        { status: 409 }
      )
    }

    // All other errors fail closed
    return NextResponse.json(
      { error: 'Internal Server Error: Voucher issuance failed' },
      { status: 500 }
    )
  }
}

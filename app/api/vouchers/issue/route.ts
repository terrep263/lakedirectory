import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateQRToken, generateCUID } from '@/lib/voucher-utils'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const rateLimitId = getRateLimitIdentifier(request)
    if (!rateLimit(rateLimitId, 'issue')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { externalRef, accountId } = await request.json()

    if (!externalRef || typeof externalRef !== 'string') {
      return NextResponse.json(
        { error: 'External reference required' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const validation = await tx.voucherValidation.findUnique({
        where: { externalRef },
        include: {
          business: true,
          deal: true,
          voucher: true
        }
      })

      if (!validation) {
        throw new Error('Validation record not found')
      }

      if (validation.voucher) {
        return {
          alreadyIssued: true,
          voucher: {
            id: validation.voucher.id,
            qrToken: validation.voucher.qrToken,
            status: validation.voucher.status,
            issuedAt: validation.voucher.issuedAt,
            dealTitle: validation.deal.title,
            businessName: validation.business.name
          }
        }
      }

      // Schema truth: Deal lifecycle is driven by dealStatus (isActive is deprecated)
      if (validation.deal.dealStatus !== 'ACTIVE') {
        throw new Error('Deal is not active')
      }

      const existingVouchersCount = await tx.voucher.count({
        where: {
          dealId: validation.dealId,
          status: 'ISSUED'
        }
      })

      const qrToken = generateQRToken()
      
      const voucherId = generateCUID()

      const voucher = await tx.voucher.create({
        data: {
          id: voucherId,
          validationId: validation.id,
          dealId: validation.dealId,
          businessId: validation.businessId,
          accountId: accountId || null,
          status: 'ISSUED',
          qrToken: qrToken,
          issuedAt: new Date()
        }
      })

      return {
        alreadyIssued: false,
        voucher: {
          id: voucher.id,
          qrToken: voucher.qrToken,
          status: voucher.status,
          issuedAt: voucher.issuedAt,
          dealTitle: validation.deal.title,
          businessName: validation.business.name,
          dealId: validation.dealId,
          businessId: validation.businessId
        }
      }
    })

    if (result.alreadyIssued) {
      return NextResponse.json({
        success: true,
        message: 'Voucher already issued',
        voucher: result.voucher
      }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      message: 'Voucher issued successfully',
      voucher: result.voucher
    }, { status: 201 })

  } catch (error: any) {
    console.error('Voucher issuance error:', error)
    
    const errorMessage = error.message || 'Voucher issuance failed'
    let statusCode = 400

    if (errorMessage.includes('not found')) {
      statusCode = 404
    } else if (errorMessage.includes('not active')) {
      statusCode = 409
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        success: false
      },
      { status: statusCode }
    )
  }
}

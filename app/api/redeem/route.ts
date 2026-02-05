import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const rateLimitId = getRateLimitIdentifier(request)
    if (!rateLimit(rateLimitId, 'default')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', redeemed: false },
        { status: 429 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', redeemed: false },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token', redeemed: false },
        { status: 401 }
      )
    }

    const { qrToken } = await request.json()

    if (!qrToken) {
      return NextResponse.json(
        { error: 'QR token required', redeemed: false },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.findUnique({
        where: { qrToken },
        include: {
          deal: true,
          business: true
        }
      })

      if (!voucher) {
        throw new Error('Voucher not found')
      }

      if (voucher.status === 'REDEEMED') {
        throw new Error('Voucher already redeemed')
      }

      if (voucher.businessId !== payload.businessId) {
        throw new Error('Invalid for this business')
      }

      const updatedVoucher = await tx.voucher.update({
        where: {
          id: voucher.id,
          status: 'ISSUED'
        },
        data: {
          status: 'REDEEMED',
          redeemedAt: new Date(),
          redeemedByBusinessId: payload.businessId,
          redeemedContext: {
            channel: 'PWA',
            timestamp: new Date().toISOString()
          }
        }
      })

      return updatedVoucher
    })

    return NextResponse.json({
      success: true,
      redeemed: true,
      message: 'Voucher redeemed — proceed with order'
    })

  } catch (error: any) {
    const errorMessage = error.message || 'Redemption failed'
    
    let statusCode = 400
    if (errorMessage.includes('not found')) {
      statusCode = 404
    } else if (errorMessage.includes('already redeemed')) {
      statusCode = 409
    } else if (errorMessage.includes('Invalid for this business')) {
      statusCode = 403
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        redeemed: false,
        success: false
      },
      { status: statusCode }
    )
  }
}

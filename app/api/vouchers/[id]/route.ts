import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
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

    const voucher = await prisma.voucher.findUnique({
      where: { id: params.id },
      include: {
        deal: {
          select: {
            title: true,
            dealStatus: true
          }
        },
        business: {
          select: {
            name: true,
            isVerified: true
          }
        },
        validation: {
          select: {
            externalRef: true,
            validatedAt: true
          }
        }
      }
    })

    if (!voucher) {
      return NextResponse.json(
        { error: 'Voucher not found' },
        { status: 404 }
      )
    }

    const account = await prisma.account.findUnique({
      where: { id: payload.accountId },
      include: {
        business: true
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const isOwner = account.id === voucher.accountId
    const isBusinessOwner = account.business?.id === voucher.businessId
    const isAdmin = account.role === 'ADMIN'

    if (!isOwner && !isBusinessOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: voucher.id,
        qrToken: voucher.qrToken,
        status: voucher.status,
        issuedAt: voucher.issuedAt,
        redeemedAt: voucher.redeemedAt,
        dealTitle: voucher.deal.title,
        dealActive: voucher.deal.dealStatus === 'ACTIVE',
        businessName: voucher.business.name,
        businessVerified: voucher.business.isVerified,
        externalRef: voucher.validation.externalRef,
        validatedAt: voucher.validation.validatedAt,
        redeemedByBusinessId: voucher.redeemedByBusinessId,
        redeemedContext: voucher.redeemedContext
      }
    })

  } catch (error: any) {
    console.error('Voucher detail error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voucher' },
      { status: 500 }
    )
  }
}

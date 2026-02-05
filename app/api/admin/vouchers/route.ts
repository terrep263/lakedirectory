import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/identity'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await requireAdmin(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error || 'Admin access required' }, { status: adminResult.status })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') as 'ISSUED' | 'REDEEMED' | null
    const businessId = searchParams.get('businessId')
    const dealId = searchParams.get('dealId')

    const skip = (page - 1) * limit

    const where: any = {}
    if (status) where.status = status
    if (businessId) where.businessId = businessId
    if (dealId) where.dealId = dealId

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        include: {
          deal: {
            select: {
              title: true
            }
          },
          business: {
            select: {
              name: true
            }
          },
          account: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: {
          issuedAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.voucher.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: vouchers.map(v => ({
        id: v.id,
        qrToken: v.qrToken,
        status: v.status,
        issuedAt: v.issuedAt,
        redeemedAt: v.redeemedAt,
        dealTitle: v.deal.title,
        businessName: v.business.name,
        userEmail: v.account?.email || null,
        redeemedByBusinessId: v.redeemedByBusinessId,
        redeemedContext: v.redeemedContext
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    console.error('Admin voucher list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vouchers' },
      { status: 500 }
    )
  }
}

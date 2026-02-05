import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/identity'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin(request)
  if (!adminResult.success) {
    return NextResponse.json(
      { error: adminResult.error || 'Admin access required' },
      { status: adminResult.status }
    )
  }

  const { id } = await params

  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: {
        business: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true, dealStatus: true } },
        account: { select: { id: true, email: true, role: true } },
        purchase: {
          select: {
            id: true,
            status: true,
            amountPaid: true,
            paymentProvider: true,
            paymentIntentId: true,
            createdAt: true,
            user: { select: { id: true, email: true, role: true } },
          },
        },
        redemption: {
          select: {
            id: true,
            redeemedAt: true,
            vendorUserId: true,
            vendor: { select: { id: true, email: true, role: true } },
            originalValue: true,
            dealPrice: true,
          },
        },
        validation: { select: { id: true, externalRef: true, validatedAt: true } },
      },
    })

    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 })
    }

    const audit = await prisma.voucherAuditLog.findMany({
      where: { voucherId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      data: {
        voucher: {
          id: voucher.id,
          qrToken: voucher.qrToken,
          status: voucher.status,
          issuedAt: voucher.issuedAt,
          expiresAt: voucher.expiresAt,
          redeemedAt: voucher.redeemedAt,
          redeemedByBusinessId: voucher.redeemedByBusinessId,
          redeemedContext: voucher.redeemedContext,
          business: voucher.business,
          deal: voucher.deal,
          account: voucher.account,
          validation: voucher.validation,
          purchase: voucher.purchase,
          redemption: voucher.redemption,
        },
        audit: audit.map((a) => ({
          id: a.id,
          actorType: a.actorType,
          actorId: a.actorId,
          action: a.action,
          metadata: a.metadata,
          createdAt: a.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Admin voucher details error:', error)
    return NextResponse.json({ error: 'Failed to fetch voucher details' }, { status: 500 })
  }
}


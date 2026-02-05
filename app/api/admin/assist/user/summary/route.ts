import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminContext, adminFailure, logAdminAction } from '@/lib/admin'

export async function GET(request: NextRequest) {
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) return adminFailure(adminResult)

  const url = new URL(request.url)
  const emailRaw = url.searchParams.get('email') || ''
  const email = emailRaw.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const user = await prisma.userIdentity.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, status: true },
  })
  if (!user || user.role !== 'USER') return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const purchases = await prisma.purchase.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      amountPaid: true,
      paymentProvider: true,
      status: true,
      deal: { select: { id: true, title: true } },
      voucher: { select: { id: true, status: true, expiresAt: true } },
    },
  })

  const vouchers = await prisma.voucher.findMany({
    where: {
      purchase: { is: { userId: user.id } },
    },
    orderBy: { issuedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      status: true,
      issuedAt: true,
      expiresAt: true,
      redeemedAt: true,
      deal: { select: { id: true, title: true } },
      business: { select: { id: true, name: true } },
    },
  })

  await logAdminAction(
    adminResult.data.id,
    'ADMIN_ASSIST_USER_VIEWED',
    'USER',
    user.id,
    {
      email: user.email,
      purchasesCount: purchases.length,
      vouchersCount: vouchers.length,
    }
  )

  return NextResponse.json({
    success: true,
    user,
    purchases: purchases.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      amountPaid: p.amountPaid.toString(),
      paymentProvider: p.paymentProvider,
      status: p.status,
      deal: p.deal,
      voucher: p.voucher,
    })),
    vouchers,
  })
}


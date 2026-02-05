import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminContext, adminFailure } from '@/lib/admin'

export async function GET(request: NextRequest) {
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) return adminFailure(adminResult)

  const url = new URL(request.url)
  const limitParam = url.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam || '100', 10) || 100, 1), 200)

  const logs = await prisma.dealGuardAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      deal: { select: { id: true, title: true, dealStatus: true, guardStatus: true } },
      vendor: { select: { id: true, email: true } },
    },
  })

  return NextResponse.json({ logs })
}


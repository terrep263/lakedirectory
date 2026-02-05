import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminContext, adminFailure } from '@/lib/admin'
import { DealGuardStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) return adminFailure(adminResult)

  const url = new URL(request.url)
  const limitParam = url.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 200)

  const deals = await prisma.deal.findMany({
    where: {
      guardStatus: { in: [DealGuardStatus.REWRITE_REQUIRED, DealGuardStatus.REJECTED, DealGuardStatus.SUSPENDED] },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      dealStatus: true,
      guardStatus: true,
      qualityScore: true,
      guardFeedback: true,
      updatedAt: true,
      createdAt: true,
      createdByUserId: true,
      business: { select: { id: true, name: true } },
      creator: { select: { id: true, email: true } },
    },
  })

  return NextResponse.json({ deals })
}


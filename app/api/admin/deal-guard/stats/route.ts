import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminContext, adminFailure } from '@/lib/admin'
import { DealGuardStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) return adminFailure(adminResult)

  // Admin monitoring should reflect CURRENT deal state, not audit event volume.
  const [approvedActive, rewriteRequired, rejected, suspended, avg] = await Promise.all([
    prisma.deal.count({
      where: { guardStatus: DealGuardStatus.APPROVED, dealStatus: 'ACTIVE' },
    }),
    prisma.deal.count({ where: { guardStatus: DealGuardStatus.REWRITE_REQUIRED } }),
    prisma.deal.count({ where: { guardStatus: DealGuardStatus.REJECTED } }),
    prisma.deal.count({ where: { guardStatus: DealGuardStatus.SUSPENDED } }),
    prisma.deal.aggregate({
      where: { guardStatus: DealGuardStatus.APPROVED, qualityScore: { gt: 0 } },
      _avg: { qualityScore: true },
    }),
  ])

  const avgScore = avg._avg.qualityScore ? Math.round(avg._avg.qualityScore) : 0

  return NextResponse.json({
    approved: approvedActive,
    rejected,
    rewriteRequired,
    suspended,
    avgScore,
  })
}


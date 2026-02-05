import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DealGuardStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('X-Cron-Secret')
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const result = await prisma.deal.updateMany({
    where: {
      guardStatus: DealGuardStatus.APPROVED,
      dealStatus: 'ACTIVE',
      lastActiveAt: { lt: sixtyDaysAgo },
    },
    data: {
      guardStatus: DealGuardStatus.SUSPENDED,
      guardFeedback: 'Suspended due to 60+ days inactivity',
    },
  })

  return NextResponse.json({
    success: true,
    dealsSuspended: result.count,
    message: `${result.count} inactive deals suspended`,
  })
}


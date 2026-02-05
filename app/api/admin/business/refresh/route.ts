import { NextRequest, NextResponse } from 'next/server'
import { refreshBusinesses, runRefreshJob } from '@/lib/business/refresh'
import { prisma } from '@/lib/prisma'
import { requireAdminContext, adminFailure } from '@/lib/admin'

export async function POST(req: NextRequest) {
  const adminResult = await requireAdminContext(req)
  if (!adminResult.success) return adminFailure(adminResult)
  const adminId = adminResult.data.id

  const body = await req.json()
  const { mode, filters, businessIds, batchSize, apiKey, jobId, city, category } = body || {}

  const key = apiKey || process.env.GOOGLE_PLACES_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY missing' }, { status: 400 })
  }

  if (jobId) {
    const summary = await runRefreshJob(jobId, key, batchSize)
    return NextResponse.json({ jobId, summary })
  }

  // Single supported operation: refresh by City + Category (FILTER only).
  // Accept legacy payload shapes but enforce a single mode.
  const cityValue = String((city ?? filters?.city) ?? '').trim()
  const categoryValue = String((category ?? filters?.category) ?? '').trim()
  if (!cityValue || !categoryValue) {
    return NextResponse.json({ error: 'city and category are required' }, { status: 400 })
  }

  const result = await refreshBusinesses({
    mode: 'FILTER',
    filters: { city: cityValue, category: categoryValue },
    businessIds: undefined,
    batchSize,
    apiKey: key,
    adminId,
  })

  return NextResponse.json(result)
}

export async function GET(req: NextRequest) {
  const adminResult = await requireAdminContext(req)
  if (!adminResult.success) return adminFailure(adminResult)

  const jobs = await prisma.refreshJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      status: true,
      mode: true,
      totalSelected: true,
      refreshedCount: true,
      updatedCount: true,
      unchangedCount: true,
      incompleteCount: true,
      verificationFailedCount: true,
      manualReviewCount: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
    },
  })
  return NextResponse.json({ jobs })
}

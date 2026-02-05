import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminContext, adminFailure } from '@/lib/admin'

export async function GET(request: NextRequest) {
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) return adminFailure(adminResult)

  const caps = await prisma.dealPriceCap.findMany({
    orderBy: { category: 'asc' },
  })

  return NextResponse.json({ caps })
}

export async function POST(request: NextRequest) {
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) return adminFailure(adminResult)

  let body: { category?: unknown; minPrice?: unknown; maxPrice?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const category = typeof body.category === 'string' ? body.category.trim().toLowerCase() : ''
  const minPrice = typeof body.minPrice === 'number' ? body.minPrice : Number(body.minPrice)
  const maxPrice = typeof body.maxPrice === 'number' ? body.maxPrice : Number(body.maxPrice)

  if (!category) return NextResponse.json({ error: 'category is required' }, { status: 400 })
  if (!Number.isFinite(minPrice) || minPrice < 0) {
    return NextResponse.json({ error: 'minPrice must be a number >= 0' }, { status: 400 })
  }
  if (!Number.isFinite(maxPrice) || maxPrice <= 0) {
    return NextResponse.json({ error: 'maxPrice must be a number > 0' }, { status: 400 })
  }
  if (maxPrice <= minPrice) {
    return NextResponse.json({ error: 'maxPrice must be > minPrice' }, { status: 400 })
  }

  const cap = await prisma.dealPriceCap.upsert({
    where: { category },
    create: { category, minPrice, maxPrice },
    update: { minPrice, maxPrice },
  })

  return NextResponse.json({ success: true, cap })
}


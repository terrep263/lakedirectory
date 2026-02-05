import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/identity'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await requireAdmin(request)
    if (!adminResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')
    const category = searchParams.get('category')

    if (!city) {
      return NextResponse.json(
        { success: false, error: 'City is required' },
        { status: 400 }
      )
    }

    const where: any = {
      city: city,
    }

    if (category) {
      where.category = category
    }

    const businesses = await prisma.business.findMany({
      where,
      select: {
        id: true,
        name: true,
        category: true,
        city: true,
        slug: true,
        ownerId: true,
        businessStatus: true,
        businessPage: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const ids = businesses.map((b) => b.id)
    const now = new Date()

    const activeDeals = await prisma.deal.groupBy({
      by: ['businessId'],
      where: {
        businessId: { in: ids },
        dealStatus: 'ACTIVE',
        redemptionWindowStart: { lte: now },
        redemptionWindowEnd: { gte: now },
      },
      _count: { businessId: true },
    })

    const activeMap = new Map(activeDeals.map((d) => [d.businessId, d._count.businessId]))

    const result = businesses.map((b) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      city: b.city,
      lifecycle: mapLifecycle(b.businessStatus),
      claimState: mapClaimState(b.ownerId),
      activeDeals: activeMap.get(b.id) ?? 0,
      publicSlug: b.businessPage?.slug || b.slug || b.id,
    }))

    return NextResponse.json({ success: true, businesses: result })
  } catch (error) {
    console.error('Error fetching businesses by city:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch businesses' },
      { status: 500 }
    )
  }
}

function mapLifecycle(status: string): 'Active' | 'Inactive' | 'Archived' {
  if (status === 'ACTIVE') return 'Active'
  if (status === 'DRAFT' || status === 'SUSPENDED') return 'Inactive'
  return 'Archived'
}

function mapClaimState(ownerId: string | null): 'Claimed' | 'Unclaimed' {
  return ownerId ? 'Claimed' : 'Unclaimed'
}

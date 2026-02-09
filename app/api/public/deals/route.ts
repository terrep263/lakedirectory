import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const city = searchParams.get('city')
    const query = searchParams.get('q')
    const sort = searchParams.get('sort') || 'newest'
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 100) // Max 100
    const featured = searchParams.get('featured') === 'true'

    // Build where clause
    const whereClause: any = {
      dealStatus: 'ACTIVE',
      ...(category && { 
        business: { category: { contains: category, mode: 'insensitive' } } 
      }),
      ...(city && { 
        business: { city: { contains: city, mode: 'insensitive' } } 
      }),
    }

    // Add search query
    if (query) {
      whereClause.OR = [
        { dealTitle: { contains: query, mode: 'insensitive' } },
        { dealDescription: { contains: query, mode: 'insensitive' } },
        { business: { name: { contains: query, mode: 'insensitive' } } },
      ]
    }

    // Build order by
    let orderByClause: any
    if (featured) {
      orderByClause = [
        { business: { founderStatus: { isActive: 'desc' } } },
        { createdAt: 'desc' },
      ]
    } else {
      switch (sort) {
        case 'price-low':
          orderByClause = [{ dealPrice: 'asc' }]
          break
        case 'price-high':
          orderByClause = [{ dealPrice: 'desc' }]
          break
        case 'discount':
          orderByClause = [{ createdAt: 'desc' }]
          break
        case 'newest':
        default:
          orderByClause = [
            { business: { founderStatus: { isActive: 'desc' } } },
            { createdAt: 'desc' },
          ]
          break
      }
    }
    const deals = await prisma.deal.findMany({
      where: whereClause,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            logoUrl: true,
            coverUrl: true,
            category: true,
            subscription: {
              select: {
                tier: true,
              },
            },
            founderStatus: {
              select: {
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            vouchers: {
              where: { voucherStatus: 'ISSUED' },
            },
          },
        },
      },
      orderBy: orderByClause,
      take: limit,
    })

    return NextResponse.json({ 
      deals,
      count: deals.length,
      filters: { category, city, query, sort },
    })
  } catch (error) {
    console.error('Error fetching deals:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch deals',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 
      { status: 500 }
    )
  }
}

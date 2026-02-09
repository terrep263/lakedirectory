/**
 * Database Schema Verification
 * 
 * Run this to verify your database has all required tables and fields
 * for the deals system to work properly.
 */

import { prisma } from '@/lib/prisma'

export async function verifyDealsSchema() {
  const results = {
    errors: [] as string[],
    warnings: [] as string[],
    success: [] as string[],
  }

  try {
    // Check Deal table exists
    await prisma.deal.findFirst()
    results.success.push('✅ Deal table exists')
  } catch (error) {
    results.errors.push('❌ Deal table missing or inaccessible')
    return results
  }

  try {
    // Check Business table exists
    await prisma.business.findFirst()
    results.success.push('✅ Business table exists')
  } catch (error) {
    results.errors.push('❌ Business table missing or inaccessible')
    return results
  }

  try {
    // Check Voucher table exists
    await prisma.voucher.findFirst()
    results.success.push('✅ Voucher table exists')
  } catch (error) {
    results.warnings.push('⚠️  Voucher table missing (voucher counts will be 0)')
  }

  try {
    // Check FounderStatus relation
    await prisma.business.findFirst({
      include: {
        founderStatus: true,
      },
    })
    results.success.push('✅ FounderStatus relation exists')
  } catch (error) {
    results.warnings.push('⚠️  FounderStatus relation missing (no founder badges)')
  }

  try {
    // Check Deal has required fields
    const deal = await prisma.deal.findFirst({
      select: {
        id: true,
        dealTitle: true,
        dealDescription: true,
        dealPrice: true,
        originalPrice: true,
        dealStatus: true,
        businessId: true,
      },
    })
    
    if (deal) {
      results.success.push('✅ Deal fields verified')
    } else {
      results.warnings.push('⚠️  No deals in database (create some test deals)')
    }
  } catch (error) {
    results.errors.push('❌ Deal table missing required fields')
  }

  return results
}

// Helper function to safely get deals with fallback
export async function getSafeDeals(options?: {
  limit?: number
  category?: string
  city?: string
  query?: string
  sort?: string
}) {
  try {
    const whereClause: any = {
      dealStatus: 'ACTIVE',
    }

    if (options?.category) {
      whereClause.business = {
        category: { contains: options.category, mode: 'insensitive' },
      }
    }

    if (options?.city) {
      whereClause.business = {
        ...whereClause.business,
        city: { contains: options.city, mode: 'insensitive' },
      }
    }

    if (options?.query) {
      whereClause.OR = [
        { dealTitle: { contains: options.query, mode: 'insensitive' } },
        { dealDescription: { contains: options.query, mode: 'insensitive' } },
        { business: { name: { contains: options.query, mode: 'insensitive' } } },
      ]
    }

    let orderBy: any = [{ createdAt: 'desc' }]
    
    if (options?.sort === 'price-low') {
      orderBy = [{ dealPrice: 'asc' }]
    } else if (options?.sort === 'price-high') {
      orderBy = [{ dealPrice: 'desc' }]
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
      orderBy,
      take: options?.limit || 50,
    })

    return deals
  } catch (error) {
    console.error('Error fetching deals:', error)
    return []
  }
}

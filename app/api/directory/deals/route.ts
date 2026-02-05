/**
 * MODULE 9: Public Business Directory
 * GET /api/directory/deals
 *
 * Purpose: Browse deals
 * Authorization: None (public endpoint)
 * Rules:
 *   - Return ACTIVE deals only (from ACTIVE businesses)
 *   - Filterable by category, price range, date window, location
 *   - Sortable by relevance or AI recommendation
 *   - Read-only
 *   - INACTIVE/EXPIRED deals are NEVER exposed
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  searchDeals,
  rankDeals,
  validateRankingIntegrity,
  getDealCategories,
  type DealSearchParams,
} from '@/lib/directory'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Parse query parameters
  const params: DealSearchParams = {
    category: searchParams.get('category') || undefined,
    businessId: searchParams.get('businessId') || undefined,
    city: searchParams.get('city') || undefined,
    state: searchParams.get('state') || undefined,
    keyword: searchParams.get('keyword') || undefined,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
    sortBy: (searchParams.get('sortBy') as DealSearchParams['sortBy']) || 'relevance',
    sortOrder: (searchParams.get('sortOrder') as DealSearchParams['sortOrder']) || 'desc',
    isFeatured: searchParams.get('isFeatured') === 'true' ? true : undefined,
    activeNow: searchParams.get('activeNow') === 'true' ? true : undefined,
  }

  // Parse price range parameters
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const minSavings = searchParams.get('minSavingsPercent')

  if (minPrice) params.minPrice = parseFloat(minPrice)
  if (maxPrice) params.maxPrice = parseFloat(maxPrice)
  if (minSavings) params.minSavingsPercent = parseInt(minSavings, 10)

  // Parse expiration filter
  const expiringDays = searchParams.get('expiringWithinDays')
  if (expiringDays) params.expiringWithinDays = parseInt(expiringDays, 10)

  // Parse proximity parameters
  const lat = searchParams.get('latitude')
  const lon = searchParams.get('longitude')
  const radius = searchParams.get('radiusMiles')

  if (lat && lon) {
    params.latitude = parseFloat(lat)
    params.longitude = parseFloat(lon)
    params.radiusMiles = radius ? parseFloat(radius) : 25 // Default 25 miles
  }

  // Legacy parameter support
  const offset = searchParams.get('offset')
  if (offset && !searchParams.get('page')) {
    const offsetNum = parseInt(offset, 10)
    params.page = Math.floor(offsetNum / (params.limit || 20)) + 1
  }

  // Fetch deals (ONLY ACTIVE from ACTIVE businesses)
  const result = await searchDeals(params)

  // Apply AI ranking if requested
  const useAIRanking = searchParams.get('aiRank') !== 'false'
  let finalData = result.data

  if (useAIRanking && result.data.length > 1) {
    const rankingResult = rankDeals(result.data, {
      locationBias:
        params.latitude && params.longitude
          ? { latitude: params.latitude, longitude: params.longitude }
          : undefined,
    })

    // Validate AI didn't filter anything out
    if (validateRankingIntegrity(result.data, rankingResult)) {
      finalData = rankingResult.items
    } else {
      // Fallback to original order if integrity check fails
      console.error('[Directory API] AI ranking integrity check failed, using original order')
    }
  }

  // Include metadata for filters
  const includeMeta = searchParams.get('includeMeta') === 'true'
  let meta = null

  if (includeMeta) {
    const categories = await getDealCategories()
    meta = { categories }
  }

  // Build response with legacy compatibility
  const response = NextResponse.json({
    success: true,
    // Legacy format support
    deals: finalData.map((deal) => ({
      id: deal.id,
      title: deal.title,
      description: null, // Not included in summary
      category: deal.dealCategory,
      originalValue: deal.originalValue,
      dealPrice: deal.dealPrice,
      savings: deal.originalValue && deal.dealPrice
        ? (Number(deal.originalValue) - Number(deal.dealPrice)).toFixed(2)
        : null,
      savingsPercent: deal.savingsPercent,
      redemptionWindowEnd: deal.redemptionWindowEnd,
      vouchersAvailable: deal.vouchersAvailable,
      isFeatured: deal.isFeatured,
      business: {
        id: deal.businessId,
        name: deal.businessName,
        slug: deal.businessSlug,
      },
    })),
    // New format
    data: finalData,
    pagination: {
      ...result.pagination,
      // Legacy format support
      total: result.pagination.totalCount,
      offset: (result.pagination.page - 1) * result.pagination.limit,
      hasMore: result.pagination.hasNextPage,
    },
    filters: {
      category: params.category,
      businessId: params.businessId,
      city: params.city,
      state: params.state,
      keyword: params.keyword,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      minSavingsPercent: params.minSavingsPercent,
      expiringWithinDays: params.expiringWithinDays,
      activeNow: params.activeNow,
      isFeatured: params.isFeatured,
    },
    ...(meta && { meta }),
  })

  // Cache for 2 minutes, allow stale for 30 minutes
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=120, stale-while-revalidate=1800'
  )

  return response
}

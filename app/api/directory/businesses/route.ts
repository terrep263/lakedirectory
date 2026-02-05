/**
 * MODULE 9: Public Business Directory
 * GET /api/directory/businesses
 *
 * Purpose: Browse businesses
 * Authorization: None (public endpoint)
 * Rules:
 *   - Return ACTIVE businesses only
 *   - Filterable by category, city, keyword, proximity
 *   - Sortable by relevance or AI recommendation
 *   - Read-only
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  searchBusinesses,
  rankBusinesses,
  validateRankingIntegrity,
  getBusinessCategories,
  getActiveCities,
  type BusinessSearchParams,
} from '@/lib/directory'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Parse query parameters
  const params: BusinessSearchParams = {
    category: searchParams.get('category') || undefined,
    city: searchParams.get('city') || undefined,
    state: searchParams.get('state') || undefined,
    keyword: searchParams.get('keyword') || undefined,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
    sortBy: (searchParams.get('sortBy') as BusinessSearchParams['sortBy']) || 'relevance',
    sortOrder: (searchParams.get('sortOrder') as BusinessSearchParams['sortOrder']) || 'desc',
    hasDeals: searchParams.get('hasDeals') === 'true' ? true : undefined,
    isFounder: searchParams.get('isFounder') === 'true' ? true : undefined,
    isFeatured: searchParams.get('isFeatured') === 'true' ? true : undefined,
  }

  // Parse proximity parameters
  const lat = searchParams.get('latitude')
  const lon = searchParams.get('longitude')
  const radius = searchParams.get('radiusMiles')

  if (lat && lon) {
    params.latitude = parseFloat(lat)
    params.longitude = parseFloat(lon)
    params.radiusMiles = radius ? parseFloat(radius) : 25 // Default 25 miles
    if (params.sortBy === 'relevance') {
      params.sortBy = 'distance'
    }
  }

  // Fetch businesses (ONLY ACTIVE)
  const result = await searchBusinesses(params)

  // Apply AI ranking if requested
  const useAIRanking = searchParams.get('aiRank') !== 'false'
  let finalData = result.data

  if (useAIRanking && result.data.length > 1) {
    const rankingResult = rankBusinesses(result.data, {
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
    const [categories, cities] = await Promise.all([
      getBusinessCategories(),
      getActiveCities(),
    ])
    meta = { categories, cities }
  }

  return NextResponse.json({
    success: true,
    data: finalData,
    pagination: result.pagination,
    filters: {
      category: params.category,
      city: params.city,
      state: params.state,
      keyword: params.keyword,
      hasDeals: params.hasDeals,
      isFounder: params.isFounder,
      isFeatured: params.isFeatured,
    },
    ...(meta && { meta }),
  })
}

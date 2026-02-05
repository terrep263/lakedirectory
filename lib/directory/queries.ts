/**
 * MODULE 9: Public Business Directory
 * Read-only query functions for public directory views.
 *
 * HARD RULES:
 * - Only ACTIVE businesses are visible
 * - Only ACTIVE deals are visible
 * - Read-only, no mutations
 * - INACTIVE, SUSPENDED, or EXPIRED entities must NEVER leak
 */

import { prisma } from '@/lib/prisma'
import { BusinessStatus, DealStatus, DealGuardStatus, FeaturedType, VoucherStatus, Prisma } from '@prisma/client'
import { BusinessDTO } from '@/lib/dto/business.dto'
import type {
  PublicBusiness,
  PublicBusinessSummary,
  PublicDeal,
  PublicDealSummary,
  PublicFeaturedContent,
  BusinessSearchParams,
  DealSearchParams,
  PaginatedResponse,
  BusinessDetailResponse,
  FeaturedResponse,
} from './types'

/**
 * HARD ENFORCEMENT: Only ACTIVE businesses.
 * This is the base where clause for all business queries.
 */
const ACTIVE_BUSINESS_WHERE: Prisma.BusinessWhereInput = {
  businessStatus: BusinessStatus.ACTIVE,
}

/**
 * HARD ENFORCEMENT: Only ACTIVE deals from ACTIVE businesses.
 * This is the base where clause for all deal queries.
 */
const ACTIVE_DEAL_WHERE: Prisma.DealWhereInput = {
  dealStatus: DealStatus.ACTIVE,
  guardStatus: DealGuardStatus.APPROVED,
  business: {
    businessStatus: BusinessStatus.ACTIVE,
  },
}

/**
 * Get current time-valid featured content.
 */
function getActiveFeaturedWhere(entityType: FeaturedType): Prisma.FeaturedContentWhereInput {
  const now = new Date()
  return {
    entityType,
    isActive: true,
    startAt: { lte: now },
    endAt: { gte: now },
  }
}

/**
 * Check if a business has active founder status.
 */
async function hasFounderStatus(businessId: string): Promise<boolean> {
  const founder = await prisma.founderStatus.findUnique({
    where: { businessId },
    select: { isActive: true, expiresAt: true },
  })

  if (!founder || !founder.isActive) return false
  if (founder.expiresAt && founder.expiresAt < new Date()) return false

  return true
}

/**
 * Check if an entity is currently featured.
 */
async function isFeatured(entityType: FeaturedType, entityId: string): Promise<boolean> {
  const now = new Date()
  const featured = await prisma.featuredContent.findFirst({
    where: {
      entityType,
      entityId,
      isActive: true,
      startAt: { lte: now },
      endAt: { gte: now },
    },
  })

  return !!featured
}

/**
 * Count available vouchers for a deal.
 */
async function countAvailableVouchers(dealId: string): Promise<number> {
  return prisma.voucher.count({
    where: {
      dealId,
      status: VoucherStatus.ISSUED,
    },
  })
}

/**
 * Calculate distance between two coordinates in miles.
 */
function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Search businesses with filters.
 * ONLY returns ACTIVE businesses.
 */
export async function searchBusinesses(
  params: BusinessSearchParams
): Promise<PaginatedResponse<PublicBusinessSummary>> {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(50, Math.max(1, params.limit || 20))
  const skip = (page - 1) * limit

  // Build where clause - ALWAYS starts with ACTIVE
  const where: Prisma.BusinessWhereInput = { ...ACTIVE_BUSINESS_WHERE }

  if (params.category) {
    where.category = params.category
  }

  if (params.city) {
    where.city = { contains: params.city, mode: 'insensitive' }
  }

  if (params.state) {
    where.state = { equals: params.state, mode: 'insensitive' }
  }

  if (params.keyword) {
    where.OR = [
      { name: { contains: params.keyword, mode: 'insensitive' } },
      { description: { contains: params.keyword, mode: 'insensitive' } },
      { category: { contains: params.keyword, mode: 'insensitive' } },
    ]
  }

  if (params.hasDeals) {
    where.deals = {
      some: {
        dealStatus: DealStatus.ACTIVE,
        guardStatus: DealGuardStatus.APPROVED,
      },
    }
  }

  // Fetch businesses with deal counts
  const [businesses, totalCount] = await Promise.all([
    prisma.business.findMany({
      where,
      include: {
        businessPage: {
          select: {
            slug: true,
            title: true,
            aiDescription: true,
            heroImageUrl: true,
            isFeatured: true,
            isPublished: true,
          },
        },
        _count: {
          select: {
            deals: {
              where: { dealStatus: DealStatus.ACTIVE },
            },
          },
        },
        founderStatus: {
          select: { isActive: true, expiresAt: true },
        },
      },
      orderBy: getBusinessOrderBy(params.sortBy, params.sortOrder),
      skip,
      take: limit,
    }),
    prisma.business.count({ where }),
  ])

  // Check featured status and filter by proximity if needed
  const now = new Date()
  let results = await Promise.all(
    businesses.map(async (b) => {
      const isFounderActive =
        b.founderStatus?.isActive &&
        (!b.founderStatus.expiresAt || b.founderStatus.expiresAt > now)

      return {
        id: b.id,
        name: BusinessDTO.displayName(b),
        slug: BusinessDTO.publicSlug(b),
        category: b.category,
        city: b.city,
        state: b.state,
        logoUrl: b.logoUrl,
        coverUrl: b.coverUrl,
        isVerified: b.isVerified,
        isFounder: !!isFounderActive,
        isFeatured: BusinessDTO.isFeatured(b),
        dealCount: b._count.deals,
        rating: null, // External rating - not implemented
        // For proximity filtering
        latitude: b.latitude,
        longitude: b.longitude,
      }
    })
  )

  // Filter by proximity if specified
  if (
    params.latitude !== undefined &&
    params.longitude !== undefined &&
    params.radiusMiles !== undefined
  ) {
    results = results.filter((b) => {
      if (b.latitude === null || b.longitude === null) return false
      const distance = calculateDistanceMiles(
        params.latitude!,
        params.longitude!,
        b.latitude,
        b.longitude
      )
      return distance <= params.radiusMiles!
    })
  }

  // Filter by founder/featured if specified
  if (params.isFounder !== undefined) {
    results = results.filter((b) => b.isFounder === params.isFounder)
  }
  if (params.isFeatured !== undefined) {
    results = results.filter((b) => b.isFeatured === params.isFeatured)
  }

  // Sort by distance if proximity search
  if (params.sortBy === 'distance' && params.latitude && params.longitude) {
    results.sort((a, b) => {
      if (a.latitude === null || a.longitude === null) return 1
      if (b.latitude === null || b.longitude === null) return -1
      const distA = calculateDistanceMiles(params.latitude!, params.longitude!, a.latitude, a.longitude)
      const distB = calculateDistanceMiles(params.latitude!, params.longitude!, b.latitude, b.longitude)
      return params.sortOrder === 'desc' ? distB - distA : distA - distB
    })
  }

  // Remove internal fields from response
  const summaries: PublicBusinessSummary[] = results.map(
    ({ latitude, longitude, ...rest }) => rest
  )

  const totalPages = Math.ceil(totalCount / limit)

  return {
    data: summaries,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }
}

/**
 * Get business detail by slug.
 * ONLY returns if business is ACTIVE.
 */
export async function getBusinessBySlug(
  slug: string,
  baseUrl: string
): Promise<BusinessDetailResponse | null> {
  // HARD ENFORCEMENT: Only ACTIVE businesses
  const business = await prisma.business.findFirst({
    where: {
      slug,
      businessStatus: BusinessStatus.ACTIVE,
    },
    include: {
      businessPage: {
        select: {
          slug: true,
          title: true,
          aiDescription: true,
          heroImageUrl: true,
          isFeatured: true,
          isPublished: true,
        },
      },
      founderStatus: {
        select: { isActive: true, expiresAt: true },
      },
      deals: {
        where: { dealStatus: DealStatus.ACTIVE },
        include: {
          _count: {
            select: {
              vouchers: {
                where: { status: VoucherStatus.ISSUED },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!business) {
    return null
  }

  const now = new Date()
  const isFounderActive =
    business.founderStatus?.isActive &&
    (!business.founderStatus.expiresAt || business.founderStatus.expiresAt > now)

  // Map deals with featured status
  const deals: PublicDealSummary[] = await Promise.all(
    business.deals.map(async (deal) => {
      const dealIsFeatured = await isFeatured(FeaturedType.DEAL, deal.id)
      const savingsPercent =
        deal.originalValue && deal.dealPrice
          ? Math.round(
              (1 - Number(deal.dealPrice) / Number(deal.originalValue)) * 100
            )
          : null

      return {
        id: deal.id,
        businessId: deal.businessId,
        title: deal.title,
        dealCategory: deal.dealCategory,
        originalValue: deal.originalValue?.toString() ?? null,
        dealPrice: deal.dealPrice?.toString() ?? null,
        savingsPercent,
        redemptionWindowEnd: deal.redemptionWindowEnd,
        vouchersAvailable: deal._count.vouchers,
        isFeatured: dealIsFeatured,
        businessName: business.name,
        businessSlug: business.slug,
      }
    })
  )

  const publicBusiness: PublicBusiness = {
    id: business.id,
    name: BusinessDTO.displayName(business),
    slug: BusinessDTO.publicSlug(business),
    description: BusinessDTO.displayDescription(business),
    category: business.category,
    city: business.city,
    state: business.state,
    postalCode: business.postalCode,
    latitude: business.latitude,
    longitude: business.longitude,
    logoUrl: business.logoUrl,
    coverUrl: business.coverUrl,
    photos: business.photos,
    phone: business.phone,
    website: business.website,
    hours: business.hours as Record<string, unknown> | null,
    addressLine1: business.addressLine1,
    addressLine2: business.addressLine2,
    status: BusinessStatus.ACTIVE,
    isVerified: business.isVerified,
    isFounder: !!isFounderActive,
    isFeatured: BusinessDTO.isFeatured(business),
    dealCount: deals.length,
    rating: null,
    reviewCount: null,
  }

  // Generate SEO metadata
  const canonicalUrl = `${baseUrl}/business/${BusinessDTO.publicSlug(business)}`
  const seoDescription =
    BusinessDTO.displayDescription(business)?.slice(0, 160) ||
    `${BusinessDTO.displayName(business)} in ${business.city}, ${business.state}. ${deals.length} deals available.`

  return {
    business: publicBusiness,
    deals,
    seo: {
      title: `${business.name} | Local Deals`,
      description: seoDescription,
      canonicalUrl,
      openGraph: {
        title: business.name,
        description: seoDescription,
        image: business.coverUrl || business.logoUrl,
        url: canonicalUrl,
      },
    },
  }
}

/**
 * Search deals with filters.
 * ONLY returns ACTIVE deals from ACTIVE businesses.
 */
export async function searchDeals(
  params: DealSearchParams
): Promise<PaginatedResponse<PublicDealSummary>> {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(50, Math.max(1, params.limit || 20))
  const skip = (page - 1) * limit

  // Build where clause - ALWAYS starts with ACTIVE
  const where: Prisma.DealWhereInput = { ...ACTIVE_DEAL_WHERE }

  if (params.category) {
    where.dealCategory = params.category
  }

  if (params.businessId) {
    where.businessId = params.businessId
  }

  if (params.city) {
    where.business = {
      ...where.business as Prisma.BusinessWhereInput,
      city: { contains: params.city, mode: 'insensitive' },
    }
  }

  if (params.state) {
    where.business = {
      ...where.business as Prisma.BusinessWhereInput,
      state: { equals: params.state, mode: 'insensitive' },
    }
  }

  if (params.keyword) {
    where.OR = [
      { title: { contains: params.keyword, mode: 'insensitive' } },
      { description: { contains: params.keyword, mode: 'insensitive' } },
      { dealCategory: { contains: params.keyword, mode: 'insensitive' } },
    ]
  }

  if (params.minPrice !== undefined) {
    where.dealPrice = { ...where.dealPrice as Prisma.DecimalFilter, gte: params.minPrice }
  }

  if (params.maxPrice !== undefined) {
    where.dealPrice = { ...where.dealPrice as Prisma.DecimalFilter, lte: params.maxPrice }
  }

  if (params.expiringWithinDays !== undefined) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + params.expiringWithinDays)
    where.redemptionWindowEnd = {
      gte: new Date(),
      lte: futureDate,
    }
  }

  if (params.activeNow) {
    const now = new Date()
    where.redemptionWindowStart = { lte: now }
    where.redemptionWindowEnd = { gte: now }
  }

  // Fetch deals
  const [deals, totalCount] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
          },
        },
        _count: {
          select: {
            vouchers: {
              where: { status: VoucherStatus.ISSUED },
            },
          },
        },
      },
      orderBy: getDealOrderBy(params.sortBy, params.sortOrder),
      skip,
      take: limit,
    }),
    prisma.deal.count({ where }),
  ])

  // Check featured status and apply additional filters
  let results = await Promise.all(
    deals.map(async (deal) => {
      const dealIsFeatured = await isFeatured(FeaturedType.DEAL, deal.id)
      const savingsPercent =
        deal.originalValue && deal.dealPrice
          ? Math.round(
              (1 - Number(deal.dealPrice) / Number(deal.originalValue)) * 100
            )
          : null

      return {
        id: deal.id,
        businessId: deal.businessId,
        title: deal.title,
        dealCategory: deal.dealCategory,
        originalValue: deal.originalValue?.toString() ?? null,
        dealPrice: deal.dealPrice?.toString() ?? null,
        savingsPercent,
        redemptionWindowEnd: deal.redemptionWindowEnd,
        vouchersAvailable: deal._count.vouchers,
        isFeatured: dealIsFeatured,
        businessName: deal.business.name,
        businessSlug: deal.business.slug,
        // For filtering
        businessLatitude: deal.business.latitude,
        businessLongitude: deal.business.longitude,
      }
    })
  )

  // Filter by savings percent
  if (params.minSavingsPercent !== undefined) {
    results = results.filter(
      (d) => d.savingsPercent !== null && d.savingsPercent >= params.minSavingsPercent!
    )
  }

  // Filter by proximity
  if (
    params.latitude !== undefined &&
    params.longitude !== undefined &&
    params.radiusMiles !== undefined
  ) {
    results = results.filter((d) => {
      if (d.businessLatitude === null || d.businessLongitude === null) return false
      const distance = calculateDistanceMiles(
        params.latitude!,
        params.longitude!,
        d.businessLatitude,
        d.businessLongitude
      )
      return distance <= params.radiusMiles!
    })
  }

  // Filter by featured
  if (params.isFeatured !== undefined) {
    results = results.filter((d) => d.isFeatured === params.isFeatured)
  }

  // Remove internal fields
  const summaries: PublicDealSummary[] = results.map(
    ({ businessLatitude, businessLongitude, ...rest }) => rest
  )

  const totalPages = Math.ceil(totalCount / limit)

  return {
    data: summaries,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }
}

/**
 * Get featured content (businesses and deals).
 * Respects admin-defined time bounds.
 */
export async function getFeaturedContent(): Promise<FeaturedResponse> {
  const now = new Date()

  // Get featured businesses
  const featuredBusinesses = await prisma.featuredContent.findMany({
    where: {
      ...getActiveFeaturedWhere(FeaturedType.BUSINESS),
    },
    orderBy: [{ priority: 'desc' }, { startAt: 'asc' }],
  })

  // Get featured deals
  const featuredDeals = await prisma.featuredContent.findMany({
    where: {
      ...getActiveFeaturedWhere(FeaturedType.DEAL),
    },
    orderBy: [{ priority: 'desc' }, { startAt: 'asc' }],
  })

  // Resolve business entities - ONLY include if ACTIVE
  const businessResults: PublicFeaturedContent[] = []
  for (const featured of featuredBusinesses) {
    const business = await prisma.business.findFirst({
      where: {
        id: featured.entityId,
        businessStatus: BusinessStatus.ACTIVE,
      },
      include: {
        _count: {
          select: {
            deals: { where: { dealStatus: DealStatus.ACTIVE } },
          },
        },
        founderStatus: {
          select: { isActive: true, expiresAt: true },
        },
      },
    })

    if (business) {
      const isFounderActive =
        business.founderStatus?.isActive &&
        (!business.founderStatus.expiresAt || business.founderStatus.expiresAt > now)

      businessResults.push({
        id: featured.id,
        entityType: FeaturedType.BUSINESS,
        entityId: featured.entityId,
        startAt: featured.startAt,
        endAt: featured.endAt,
        priority: featured.priority,
        entity: {
          id: business.id,
          name: business.name,
          slug: business.slug,
          category: business.category,
          city: business.city,
          state: business.state,
          logoUrl: business.logoUrl,
          coverUrl: business.coverUrl,
          isVerified: business.isVerified,
          isFounder: !!isFounderActive,
          isFeatured: true,
          dealCount: business._count.deals,
          rating: null,
        },
      })
    }
  }

  // Resolve deal entities - ONLY include if ACTIVE
  const dealResults: PublicFeaturedContent[] = []
  for (const featured of featuredDeals) {
    const deal = await prisma.deal.findFirst({
      where: {
        id: featured.entityId,
        dealStatus: DealStatus.ACTIVE,
        business: { businessStatus: BusinessStatus.ACTIVE },
      },
      include: {
        business: {
          select: { name: true, slug: true },
        },
        _count: {
          select: {
            vouchers: { where: { status: VoucherStatus.ISSUED } },
          },
        },
      },
    })

    if (deal) {
      const savingsPercent =
        deal.originalValue && deal.dealPrice
          ? Math.round(
              (1 - Number(deal.dealPrice) / Number(deal.originalValue)) * 100
            )
          : null

      dealResults.push({
        id: featured.id,
        entityType: FeaturedType.DEAL,
        entityId: featured.entityId,
        startAt: featured.startAt,
        endAt: featured.endAt,
        priority: featured.priority,
        entity: {
          id: deal.id,
          businessId: deal.businessId,
          title: deal.title,
          dealCategory: deal.dealCategory,
          originalValue: deal.originalValue?.toString() ?? null,
          dealPrice: deal.dealPrice?.toString() ?? null,
          savingsPercent,
          redemptionWindowEnd: deal.redemptionWindowEnd,
          vouchersAvailable: deal._count.vouchers,
          isFeatured: true,
          businessName: deal.business.name,
          businessSlug: deal.business.slug,
        },
      })
    }
  }

  return {
    businesses: businessResults,
    deals: dealResults,
  }
}

/**
 * Get distinct categories for businesses.
 */
export async function getBusinessCategories(): Promise<string[]> {
  const categories = await prisma.business.findMany({
    where: ACTIVE_BUSINESS_WHERE,
    select: { category: true },
    distinct: ['category'],
  })

  return categories
    .map((c) => c.category)
    .filter((c): c is string => c !== null)
    .sort()
}

/**
 * Get distinct deal categories.
 */
export async function getDealCategories(): Promise<string[]> {
  const categories = await prisma.deal.findMany({
    where: ACTIVE_DEAL_WHERE,
    select: { dealCategory: true },
    distinct: ['dealCategory'],
  })

  return categories
    .map((c) => c.dealCategory)
    .filter((c): c is string => c !== null)
    .sort()
}

/**
 * Get distinct cities with active businesses.
 */
export async function getActiveCities(): Promise<{ city: string; state: string }[]> {
  const locations = await prisma.business.findMany({
    where: {
      ...ACTIVE_BUSINESS_WHERE,
      city: { not: null },
      state: { not: null },
    },
    select: { city: true, state: true },
    distinct: ['city', 'state'],
  })

  return locations
    .filter((l): l is { city: string; state: string } => l.city !== null && l.state !== null)
    .sort((a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city))
}

/**
 * Helper: Get business order by clause.
 */
function getBusinessOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.BusinessOrderByWithRelationInput[] {
  const order = sortOrder === 'desc' ? 'desc' : 'asc'

  switch (sortBy) {
    case 'name':
      return [{ name: order }]
    case 'dealCount':
      return [{ deals: { _count: order } }]
    case 'distance':
      // Distance sorting is handled post-query
      return [{ createdAt: 'desc' }]
    case 'relevance':
    default:
      // Default: featured first, then by creation date
      return [{ createdAt: 'desc' }]
  }
}

/**
 * Helper: Get deal order by clause.
 */
function getDealOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.DealOrderByWithRelationInput[] {
  const order = sortOrder === 'desc' ? 'desc' : 'asc'

  switch (sortBy) {
    case 'price':
      return [{ dealPrice: order }]
    case 'savings':
      // Savings sorting is complex; default to price
      return [{ dealPrice: order }]
    case 'expiring':
      return [{ redemptionWindowEnd: 'asc' }]
    case 'newest':
      return [{ createdAt: 'desc' }]
    case 'relevance':
    default:
      return [{ createdAt: 'desc' }]
  }
}

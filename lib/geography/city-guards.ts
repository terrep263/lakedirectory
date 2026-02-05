/**
 * GEOGRAPHIC CONTEXT & DISCOVERY BOUNDARY MODULE
 * City Management Guards
 *
 * CITY SCOPE MODEL:
 * - Each county maintains a curated list of ~15 major municipalities
 * - Cities are the ONLY valid geographic units in the system
 * - Cities are treated as schema, not content
 * - No free-text city entry is permitted
 *
 * OUT OF SCOPE BY DESIGN:
 * - Unincorporated areas
 * - Neighborhoods
 * - Census-designated places
 * - ZIP / postal aliases
 * - Small towns outside the curated list
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { CityContext, GeoResult, CountyGeoContext } from './types'
import { isValidCitySlug } from './types'
import { resolveCountyFromDomain } from './domain-resolution'

/**
 * ERROR RESPONSES
 * Hard failures for city operations.
 */
export const CityErrors = {
  // Resolution errors
  CITY_NOT_FOUND: { error: 'City not found', status: 404 },
  CITY_NOT_IN_COUNTY: { error: 'City does not belong to this county', status: 403 },
  CITY_INACTIVE: { error: 'City is not active', status: 403 },
  INVALID_CITY_SLUG: { error: 'Invalid city slug format', status: 400 },

  // Creation/update errors
  CITY_ALREADY_EXISTS: { error: 'City with this slug already exists in this county', status: 409 },
  CITY_NAME_REQUIRED: { error: 'City name is required', status: 400 },
  CITY_SLUG_REQUIRED: { error: 'City slug is required', status: 400 },
  MAX_CITIES_REACHED: { error: 'Maximum number of cities for this county reached', status: 400 },

  // Geographic context errors
  COUNTY_CONTEXT_REQUIRED: { error: 'County context is required', status: 400 },
} as const

/**
 * Maximum number of cities per county.
 * Intentionally limited to ~15 major municipalities.
 */
export const MAX_CITIES_PER_COUNTY = 20

/**
 * Resolve city by ID within a county.
 * Validates that the city belongs to the specified county.
 */
export async function resolveCityById(
  cityId: string,
  countyId: string
): Promise<GeoResult<CityContext>> {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
  })

  if (!city) {
    return { success: false, ...CityErrors.CITY_NOT_FOUND }
  }

  // HARD CHECK: City must belong to the county
  if (city.countyId !== countyId) {
    return { success: false, ...CityErrors.CITY_NOT_IN_COUNTY }
  }

  if (!city.isActive) {
    return { success: false, ...CityErrors.CITY_INACTIVE }
  }

  return {
    success: true,
    data: {
      id: city.id,
      countyId: city.countyId,
      name: city.name,
      slug: city.slug,
      isActive: city.isActive,
      displayOrder: city.displayOrder,
    },
  }
}

/**
 * Resolve city by slug within a county.
 * Uses compound unique constraint (countyId, slug).
 */
export async function resolveCityBySlug(
  slug: string,
  countyId: string
): Promise<GeoResult<CityContext>> {
  if (!isValidCitySlug(slug)) {
    return { success: false, ...CityErrors.INVALID_CITY_SLUG }
  }

  const city = await prisma.city.findUnique({
    where: {
      countyId_slug: {
        countyId,
        slug,
      },
    },
  })

  if (!city) {
    return { success: false, ...CityErrors.CITY_NOT_FOUND }
  }

  if (!city.isActive) {
    return { success: false, ...CityErrors.CITY_INACTIVE }
  }

  return {
    success: true,
    data: {
      id: city.id,
      countyId: city.countyId,
      name: city.name,
      slug: city.slug,
      isActive: city.isActive,
      displayOrder: city.displayOrder,
    },
  }
}

/**
 * List all active cities for a county.
 * Returns cities in display order (for UI dropdown).
 */
export async function listCountyCities(
  countyId: string,
  includeInactive: boolean = false
): Promise<GeoResult<CityContext[]>> {
  const where = includeInactive
    ? { countyId }
    : { countyId, isActive: true }

  const cities = await prisma.city.findMany({
    where,
    orderBy: [
      { displayOrder: 'asc' },
      { name: 'asc' },
    ],
  })

  return {
    success: true,
    data: cities.map(c => ({
      id: c.id,
      countyId: c.countyId,
      name: c.name,
      slug: c.slug,
      isActive: c.isActive,
      displayOrder: c.displayOrder,
    })),
  }
}

/**
 * Validate city selection for discovery.
 * Resolves county from domain, then validates city belongs to it.
 */
export async function validateCitySelection(
  request: NextRequest,
  cityIdOrSlug: string
): Promise<GeoResult<{ county: CountyGeoContext; city: CityContext }>> {
  // 1. Resolve county from domain
  const countyResult = await resolveCountyFromDomain(request)
  if (!countyResult.success) {
    return countyResult
  }

  const county = countyResult.data

  // 2. Try to resolve city by ID first, then by slug
  let cityResult: GeoResult<CityContext>

  // Check if it looks like a UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cityIdOrSlug)

  if (isUuid) {
    cityResult = await resolveCityById(cityIdOrSlug, county.id)
  } else {
    cityResult = await resolveCityBySlug(cityIdOrSlug, county.id)
  }

  if (!cityResult.success) {
    return cityResult
  }

  return {
    success: true,
    data: {
      county,
      city: cityResult.data,
    },
  }
}

/**
 * Check if county can add more cities.
 * Enforces the ~15 city limit per county.
 */
export async function canAddCity(
  countyId: string
): Promise<GeoResult<{ currentCount: number; canAdd: boolean }>> {
  const count = await prisma.city.count({
    where: { countyId },
  })

  return {
    success: true,
    data: {
      currentCount: count,
      canAdd: count < MAX_CITIES_PER_COUNTY,
    },
  }
}

/**
 * Validate city belongs to a business's county.
 * Used when assigning a city to a business.
 */
export async function validateCityForBusiness(
  cityId: string,
  businessId: string
): Promise<GeoResult<CityContext>> {
  // Get business's county
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { countyId: true },
  })

  if (!business?.countyId) {
    return { success: false, ...CityErrors.COUNTY_CONTEXT_REQUIRED }
  }

  // Validate city belongs to same county
  return resolveCityById(cityId, business.countyId)
}

/**
 * Helper: Convert GeoResult failure to NextResponse
 */
export function geoFailure(
  result: { error: string; status: number }
): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status })
}

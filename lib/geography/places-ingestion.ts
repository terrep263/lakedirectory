/**
 * GEOGRAPHIC CONTEXT & DISCOVERY BOUNDARY MODULE
 * Google Places Ingestion Rules (Strictly Controlled)
 *
 * Google Places is used as a DATA SOURCE, not an authority.
 *
 * INGESTION RULES:
 * - Google Places queries are executed PER APPROVED CITY
 * - Only cities from the county's curated list are queried
 * - Businesses must physically resolve to one approved city
 * - Businesses must fall within county boundary geometry
 * - Place IDs are unique per county
 * - Same brand in multiple counties = separate businesses
 *
 * DO NOT:
 * - Ingest county-wide blobs
 * - Auto-map out-of-scope businesses
 * - Include "nearby" or adjacent cities
 * - Merge businesses across counties
 *
 * If a Place cannot be cleanly assigned to one approved city:
 * → reject or flag internally
 * → NEVER publish publicly
 */

import type {
  CountyGeoContext,
  CityContext,
  PlacesIngestionContext,
  PlaceIngestionResult,
  GeoResult,
} from './types'

/**
 * ERROR RESPONSES
 */
export const PlacesIngestionErrors = {
  COUNTY_REQUIRED: { error: 'County context is required for ingestion', status: 400 },
  CITY_REQUIRED: { error: 'City context is required for ingestion', status: 400 },
  CITY_NOT_IN_COUNTY: { error: 'City does not belong to county', status: 403 },
  PLACE_OUTSIDE_CITY: { error: 'Place is outside the approved city', status: 400 },
  PLACE_OUTSIDE_COUNTY: { error: 'Place is outside county boundaries', status: 400 },
  INVALID_PLACE_DATA: { error: 'Invalid place data', status: 400 },
} as const

/**
 * Rejection reasons for place ingestion.
 */
export type PlaceRejectReason =
  | 'OUTSIDE_CITY_BOUNDS'
  | 'OUTSIDE_COUNTY_BOUNDS'
  | 'AMBIGUOUS_CITY'
  | 'INVALID_ADDRESS'
  | 'DUPLICATE_PLACE_ID'
  | 'MISSING_REQUIRED_FIELDS'

/**
 * Raw place data from Google Places API.
 */
export interface GooglePlaceData {
  placeId: string
  name: string
  formattedAddress: string
  addressComponents?: {
    locality?: string        // City name
    administrativeArea1?: string  // State
    administrativeArea2?: string  // County
    postalCode?: string
  }
  geometry?: {
    lat: number
    lng: number
  }
  types?: string[]
  businessStatus?: string
}

/**
 * Validate ingestion context.
 * Both county and city must be resolved and matching.
 */
export function validateIngestionContext(
  context: PlacesIngestionContext
): GeoResult<void> {
  if (!context.county?.id) {
    return { success: false, ...PlacesIngestionErrors.COUNTY_REQUIRED }
  }

  if (!context.city?.id) {
    return { success: false, ...PlacesIngestionErrors.CITY_REQUIRED }
  }

  if (context.city.countyId !== context.county.id) {
    return { success: false, ...PlacesIngestionErrors.CITY_NOT_IN_COUNTY }
  }

  return { success: true, data: undefined }
}

/**
 * Validate a place belongs to the specified city.
 *
 * Rules:
 * - Place address must contain the city name
 * - Place must be within county boundaries (if geometry available)
 * - Ambiguous city assignments are rejected
 */
export function validatePlaceCity(
  place: GooglePlaceData,
  city: CityContext,
  county: CountyGeoContext
): PlaceIngestionResult {
  const baseResult = {
    placeId: place.placeId,
    name: place.name,
    address: place.formattedAddress,
    cityId: city.id,
    countyId: county.id,
  }

  // Check for required fields
  if (!place.placeId || !place.name || !place.formattedAddress) {
    return {
      ...baseResult,
      status: 'rejected',
      rejectReason: 'MISSING_REQUIRED_FIELDS',
    }
  }

  // Extract city from address components or address string
  const placeCity = extractCityFromPlace(place)

  if (!placeCity) {
    return {
      ...baseResult,
      status: 'flagged',
      rejectReason: 'INVALID_ADDRESS',
    }
  }

  // Check if place city matches the target city
  const cityMatches = normalizeCityName(placeCity) === normalizeCityName(city.name)

  if (!cityMatches) {
    return {
      ...baseResult,
      status: 'rejected',
      rejectReason: 'OUTSIDE_CITY_BOUNDS',
    }
  }

  // If we have county boundary geometry and place coordinates, validate bounds
  // This is a placeholder - actual geometry checking would use a proper GIS library

  return {
    ...baseResult,
    status: 'accepted',
  }
}

/**
 * Extract city name from Google Place data.
 */
function extractCityFromPlace(place: GooglePlaceData): string | null {
  // Try address components first (most reliable)
  if (place.addressComponents?.locality) {
    return place.addressComponents.locality
  }

  // Fall back to parsing formatted address
  // Typical format: "123 Main St, City, State ZIP"
  const parts = place.formattedAddress.split(',').map(p => p.trim())

  // City is usually the second-to-last part before "State ZIP"
  if (parts.length >= 2) {
    // Check if second-to-last part looks like a city (no digits, not just state)
    const possibleCity = parts[parts.length - 2]
    if (possibleCity && !/^\d/.test(possibleCity) && possibleCity.length > 2) {
      return possibleCity
    }
  }

  return null
}

/**
 * Normalize city name for comparison.
 * Handles common variations like "Mt." vs "Mount".
 */
function normalizeCityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^mt\.?\s/i, 'mount ')
    .replace(/^st\.?\s/i, 'saint ')
    .replace(/^ft\.?\s/i, 'fort ')
    .trim()
}

/**
 * Check if a place ID already exists for this county.
 * Same place in different counties = different business records.
 *
 * @param placeId - Google Place ID
 * @param countyId - County ID
 * @returns true if place already exists in this county
 */
export async function placeExistsInCounty(
  placeId: string,
  countyId: string
): Promise<boolean> {
  // This would query the business table for existing Google Place ID
  // Implementation depends on how Place ID is stored
  // For now, return false (no duplicate check)
  return false
}

/**
 * Create ingestion context for a city within a county.
 */
export function createIngestionContext(
  county: CountyGeoContext,
  city: CityContext,
  config?: Record<string, unknown>
): PlacesIngestionContext {
  return {
    county,
    city,
    googlePlacesConfig: config,
  }
}

/**
 * Filter valid cities for Places ingestion from a county.
 * Only active cities are included.
 */
export function filterIngestionCities(
  cities: CityContext[]
): CityContext[] {
  return cities.filter(c => c.isActive)
}

/**
 * Build Google Places search query for a city.
 * Constrains search to the specific city within the county.
 */
export function buildPlacesSearchQuery(
  city: CityContext,
  county: CountyGeoContext,
  category?: string
): {
  textQuery: string
  locationBias?: { lat: number; lng: number; radius: number }
} {
  // Build query that constrains to city + county + state
  const locationParts = [city.name, county.name, county.state]
  const locationString = locationParts.join(', ')

  const textQuery = category
    ? `${category} in ${locationString}`
    : `businesses in ${locationString}`

  return {
    textQuery,
    // Location bias would be set based on city center coordinates
    // if available in the city data
  }
}

/**
 * Summarize ingestion results for logging/reporting.
 */
export function summarizeIngestionResults(
  results: PlaceIngestionResult[]
): {
  total: number
  accepted: number
  rejected: number
  flagged: number
  rejectReasons: Record<string, number>
} {
  const summary = {
    total: results.length,
    accepted: 0,
    rejected: 0,
    flagged: 0,
    rejectReasons: {} as Record<string, number>,
  }

  for (const result of results) {
    if (result.status === 'accepted') {
      summary.accepted++
    } else if (result.status === 'rejected') {
      summary.rejected++
      if (result.rejectReason) {
        summary.rejectReasons[result.rejectReason] =
          (summary.rejectReasons[result.rejectReason] || 0) + 1
      }
    } else {
      summary.flagged++
      if (result.rejectReason) {
        summary.rejectReasons[result.rejectReason] =
          (summary.rejectReasons[result.rejectReason] || 0) + 1
      }
    }
  }

  return summary
}

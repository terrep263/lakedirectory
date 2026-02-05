/**
 * Google Places Enrichment Module
 * 
 * Fetches and normalizes data from Google Places Details API
 * for enriching business listings.
 * 
 * Responsibilities:
 * - Call Google Places Details API
 * - Extract editorial summary and photos
 * - Build photo URLs
 * - Return normalized enrichment data
 * 
 * NO database access. NO business rules.
 */

import { fetchWithTimeout } from '@/lib/http/fetch'

interface GooglePlacesDetailsResponse {
  result?: {
    editorial_summary?: {
      overview?: string
    }
    photos?: Array<{
      photo_reference: string
    }>
    formatted_phone_number?: string
  }
  status?: string
}

export interface EnrichmentData {
  description?: string
  logoUrl?: string
  phone?: string
  error?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchGoogleJsonWithRetry<T>(
  url: string,
  opts: { timeoutMs: number; maxAttempts: number }
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const { timeoutMs, maxAttempts } = opts

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeoutMs,
      })

      if (!response.ok) {
        // Retry transient errors
        if (response.status === 429 || (response.status >= 500 && response.status <= 599)) {
          if (attempt < maxAttempts) {
            await sleep(300 * Math.pow(3, attempt - 1))
            continue
          }
        }
        return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` }
      }

      const data = (await response.json()) as T
      return { ok: true, data }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (attempt < maxAttempts) {
        await sleep(300 * Math.pow(3, attempt - 1))
        continue
      }
      return { ok: false, error: `Failed to fetch enrichment: ${message}` }
    }
  }

  return { ok: false, error: 'Failed to fetch enrichment' }
}

/**
 * Fetch enrichment data from Google Places Details API
 * 
 * @param apiKey - Google Places API key
 * @param externalPlaceId - Google Places Place ID
 * @returns Enrichment data (description and/or logoUrl)
 */
export async function fetchGooglePlacesEnrichment(
  apiKey: string,
  externalPlaceId: string
): Promise<EnrichmentData> {
  if (!apiKey || !externalPlaceId) {
    return { error: 'Missing API key or externalPlaceId' }
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('place_id', externalPlaceId)
    url.searchParams.set('fields', 'editorial_summary,photos,formatted_phone_number')
    url.searchParams.set('key', apiKey)

    const result = await fetchGoogleJsonWithRetry<GooglePlacesDetailsResponse>(url.toString(), {
      timeoutMs: 15000,
      maxAttempts: 3,
    })

    if (!result.ok) {
      return { error: result.error }
    }

    const data = result.data

    if (data.status === 'ZERO_RESULTS') {
      return { error: 'Place not found in Google Places' }
    }

    if (data.status !== 'OK') {
      return { error: `Google Places API error: ${data.status}` }
    }

    const enrichment: EnrichmentData = {}

    // Extract editorial summary
    if (data.result?.editorial_summary?.overview) {
      enrichment.description = data.result.editorial_summary.overview
    }

    // Extract first photo and build URL
    if (data.result?.photos && data.result.photos.length > 0) {
      const photoReference = data.result.photos[0].photo_reference
      enrichment.logoUrl = buildPhotoUrl(apiKey, photoReference)
    }

    // Extract phone number
    if (data.result?.formatted_phone_number) {
      enrichment.phone = data.result.formatted_phone_number
    }

    return enrichment
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { error: `Failed to fetch enrichment: ${message}` }
  }
}

/**
 * Build a Google Maps photo URL for display
 * 
 * @param apiKey - Google Places API key
 * @param photoReference - Photo reference from Google Places
 * @returns Complete photo URL
 */
function buildPhotoUrl(apiKey: string, photoReference: string): string {
  const url = new URL('https://maps.googleapis.com/maps/api/place/photo')
  url.searchParams.set('maxwidth', '800')
  url.searchParams.set('photo_reference', photoReference)
  url.searchParams.set('key', apiKey)
  return url.toString()
}

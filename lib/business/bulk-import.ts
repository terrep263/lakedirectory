import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { ingestBusinessesFromGoogle } from './core'

export const LAKE_COUNTY_CITIES = [
  'Astatula',
  'Astor',
  'Clermont',
  'Eustis',
  'Fruitland Park',
  'Groveland',
  'Howey-in-the-Hills',
  'Lady Lake',
  'Leesburg',
  'Mascotte',
  'Minneola',
  'Montverde',
  'Mount Dora',
  'Tavares',
  'Umatilla',
]

export const DEAL_CATEGORIES = [
  {
    name: 'Restaurants & Dining',
    searchTerms: ['restaurant', 'cafe', 'bar', 'food'],
  },
  {
    name: 'Health & Wellness',
    searchTerms: ['gym', 'fitness', 'yoga', 'wellness'],
  },
  {
    name: 'Beauty & Spa',
    searchTerms: ['salon', 'spa', 'massage', 'nails'],
  },
  {
    name: 'Entertainment',
    searchTerms: ['entertainment', 'theater', 'attraction', 'event'],
  },
  {
    name: 'Retail & Shopping',
    searchTerms: ['retail', 'boutique', 'shop', 'store'],
  },
  {
    name: 'Services',
    searchTerms: ['service', 'contractor', 'professional service'],
  },
  {
    name: 'Activities & Recreation',
    searchTerms: ['recreation', 'sports', 'activity', 'class'],
  },
  {
    name: 'Automotive',
    searchTerms: ['auto repair', 'car service', 'auto detailing'],
  },
  {
    name: 'Home & Garden',
    searchTerms: ['landscaping', 'home improvement', 'cleaning'],
  },
  {
    name: 'Pet Services',
    searchTerms: ['pet grooming', 'veterinary', 'pet care'],
  },
  {
    name: 'Education & Classes',
    searchTerms: ['tutoring', 'lessons', 'school', 'classes'],
  },
  {
    name: 'Travel & Experiences',
    searchTerms: ['tour', 'rental', 'experience', 'adventure'],
  },
]

export interface BulkImportStats {
  batchId: string
  citiesProcessed: string[]
  categoriesProcessed: string[]
  totalQueriesRun: number
  totalFound: number
  createdCount: number
  skippedCount: number
  errorCount: number
  completedAt: Date
  duration_ms: number
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getCoordinates(city: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', `${city}, FL, USA`)
  url.searchParams.set('key', process.env.GOOGLE_PLACES_API_KEY || '')

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const data = (await res.json()) as any
    const result = data.results?.[0]
    if (!result?.geometry?.location) return null
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    }
  } catch {
    return null
  }
}

export async function bulkImportFromGooglePlaces(
  googleApiKey: string,
  adminId: string,
  radiusMeters: number = 40000
): Promise<BulkImportStats> {
  const startTime = Date.now()
  const batchId = randomUUID()

  let totalQueries = 0
  let totalFound = 0
  let createdCount = 0
  let skippedCount = 0
  let errorCount = 0

  const citiesProcessed: string[] = []
  const categoriesProcessed: string[] = []

  console.log(`[bulk-import] Starting batch ${batchId}`)

  for (const city of LAKE_COUNTY_CITIES) {
    console.log(`[bulk-import] Processing city: ${city}`)

    // Get city coordinates for location-based search
    const coords = await getCoordinates(city)
    if (!coords) {
      console.warn(`[bulk-import] Could not geocode ${city}, skipping`)
      errorCount++
      continue
    }

    citiesProcessed.push(city)

    for (const category of DEAL_CATEGORIES) {
      console.log(`[bulk-import] Processing category: ${category.name} in ${city}`)

      for (const searchTerm of category.searchTerms) {
        totalQueries++
        console.log(`[bulk-import] Query ${totalQueries}: "${searchTerm}" in ${city}`)

        try {
          const result = await ingestBusinessesFromGoogle({
            apiKey: googleApiKey,
            location: coords,
            keyword: searchTerm,
            category: category.name,
            radiusMeters,
            limit: 20, // Per query limit to reduce API usage
            importBatchId: batchId,
          })

          totalFound += result.createdCount + result.skippedCount
          createdCount += result.createdCount
          skippedCount += result.skippedCount

          if (!categoriesProcessed.includes(category.name)) {
            categoriesProcessed.push(category.name)
          }

          // Rate limiting: 1 second between queries
          await sleep(1000)
        } catch (err) {
          console.error(`[bulk-import] Error on query ${totalQueries}:`, err)
          errorCount++
          // Continue to next query despite error
        }
      }
    }
  }

  const completedAt = new Date()
  const duration = Date.now() - startTime

  console.log(`[bulk-import] Batch ${batchId} completed:`, {
    totalQueries,
    totalFound,
    createdCount,
    skippedCount,
    errorCount,
    duration_ms: duration,
  })

  return {
    batchId,
    citiesProcessed,
    categoriesProcessed,
    totalQueriesRun: totalQueries,
    totalFound,
    createdCount,
    skippedCount,
    errorCount,
    completedAt,
    duration_ms: duration,
  }
}

/**
 * BUSINESS REFRESH (Google Places Accuracy Verification)
 *
 * This is the backing implementation for `/api/admin/business/refresh`.
 *
 * Goals:
 * - Create a RefreshJob + RefreshJobResult audit trail
 * - Re-fetch Google Places Details for selected businesses
 * - Update Business record with any changed fields safely
 * - Compute per-business outcomes + job counters
 *
 * NOTE:
 * - This is intentionally conservative and schema-safe.
 * - Missing data is treated as normal.
 */

import { prisma } from '@/lib/prisma'
import { fetchWithTimeout } from '@/lib/http/fetch'

type RefreshMode = 'FILTER' | 'IDS'

export type RefreshBusinessesInput = {
  mode: RefreshMode
  filters?: { city: string; category: string }
  businessIds?: string[]
  batchSize?: number
  apiKey: string
  adminId?: string
}

type RefreshSummary = {
  jobId: string
  totalSelected: number
  refreshedCount: number
  updatedCount: number
  unchangedCount: number
  incompleteCount: number
  verificationFailedCount: number
  manualReviewCount: number
  status: string
}

type GoogleDetailsResponse = {
  status?: string
  result?: {
    place_id?: string
    formatted_address?: string
    address_components?: unknown
    formatted_phone_number?: string
    geometry?: { location?: { lat?: number; lng?: number } }
    url?: string
    website?: string
    photos?: Array<{ photo_reference?: string }>
    editorial_summary?: { overview?: string }
    rating?: number
    user_ratings_total?: number
    reviews?: Array<{
      author_name?: string
      rating?: number
      text?: string
      relative_time_description?: string
    }>
    business_status?: string
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchPlaceDetails(apiKey: string, placeId: string): Promise<GoogleDetailsResponse | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set(
    'fields',
    [
      'place_id',
      'name',
      'business_status',
      'formatted_address',
      'address_components',
      'formatted_phone_number',
      'geometry',
      'url',
      'website',
      'photos',
      'editorial_summary',
      'opening_hours',
      'rating',
      'user_ratings_total',
      'reviews',
    ].join(',')
  )
  url.searchParams.set('key', apiKey)

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetchWithTimeout(url.toString(), { timeoutMs: 15000 })
      if (!res.ok) {
        if ((res.status === 429 || res.status >= 500) && attempt < 3) {
          await sleep(300 * Math.pow(3, attempt - 1))
          continue
        }
        return null
      }
      const data = (await res.json()) as GoogleDetailsResponse
      if (data.status !== 'OK') {
        if (data.status === 'UNKNOWN_ERROR' && attempt < 3) {
          await sleep(300 * Math.pow(3, attempt - 1))
          continue
        }
        return null
      }
      return data
    } catch {
      if (attempt < 3) {
        await sleep(300 * Math.pow(3, attempt - 1))
        continue
      }
      return null
    }
  }

  return null
}

function buildPhotoUrl(apiKey: string, photoReference: string): string {
  const url = new URL('https://maps.googleapis.com/maps/api/place/photo')
  url.searchParams.set('maxwidth', '800')
  url.searchParams.set('photo_reference', photoReference)
  url.searchParams.set('key', apiKey)
  return url.toString()
}

function jsonStable(value: unknown): string {
  try {
    return JSON.stringify(value) ?? ''
  } catch {
    return ''
  }
}

export async function refreshBusinesses(input: RefreshBusinessesInput) {
  const { mode, filters, businessIds, apiKey, adminId } = input

  if (mode === 'FILTER') {
    if (!filters?.city || !filters?.category) {
      return { error: 'filters.city and filters.category are required' }
    }
  }

  const selectedBusinesses =
    mode === 'IDS'
      ? await prisma.business.findMany({
          where: { id: { in: Array.isArray(businessIds) ? businessIds : [] } },
          select: { id: true },
        })
      : await prisma.business.findMany({
          where: {
            city: filters!.city,
            category: filters!.category,
          },
          select: { id: true },
          take: 2000, // hard cap for safety in one request
        })

  const ids = selectedBusinesses.map((b) => b.id)

  const job = await prisma.refreshJob.create({
    data: {
      mode,
      filter: mode === 'FILTER' ? (filters as any) : undefined,
      businessIds: ids,
      status: 'RUNNING',
      totalSelected: ids.length,
      startedAt: new Date(),
      adminId: adminId || null,
    },
    select: { id: true },
  })

  if (ids.length > 0) {
    await prisma.refreshJobResult.createMany({
      data: ids.map((businessId) => ({
        jobId: job.id,
        businessId,
        outcome: 'NOT_RUN',
        attempts: 0,
      })),
      skipDuplicates: true,
    })
  }

  // Run immediately (synchronously) so the admin tool returns results right away.
  const summary = await runRefreshJob(job.id, apiKey, input.batchSize)
  return summary
}

export async function runRefreshJob(
  jobId: string,
  apiKey: string,
  batchSize?: number
): Promise<RefreshSummary> {
  const job = await prisma.refreshJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      totalSelected: true,
      refreshedCount: true,
      updatedCount: true,
      unchangedCount: true,
      incompleteCount: true,
      verificationFailedCount: true,
      manualReviewCount: true,
    },
  })

  if (!job) {
    return {
      jobId,
      totalSelected: 0,
      refreshedCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      incompleteCount: 0,
      verificationFailedCount: 0,
      manualReviewCount: 0,
      status: 'FAILED',
    }
  }

  const limit = Math.min(Math.max(batchSize || 50, 1), 500)

  // Process in chunks until completed (bounded by totalSelected).
  for (let loop = 0; loop < 2000; loop++) {
    const next = await prisma.refreshJobResult.findMany({
      where: { jobId, outcome: 'NOT_RUN' },
      select: { id: true, businessId: true, attempts: true },
      take: limit,
    })

    if (next.length === 0) break

    for (const r of next) {
      const business = await prisma.business.findUnique({
        where: { id: r.businessId },
        select: {
          id: true,
          name: true,
          externalPlaceId: true,
          phone: true,
          website: true,
          latitude: true,
          longitude: true,
          formattedAddress: true,
          mapLocationUrl: true,
          description: true,
          photos: true,
          aggregateRating: true,
          totalRatings: true,
          userReviews: true,
          rawGooglePayload: true,
          refreshStatus: true,
          refreshMissingFields: true,
        },
      })

      if (!business || !business.externalPlaceId) {
        await prisma.refreshJobResult.update({
          where: { id: r.id },
          data: {
            outcome: 'INCOMPLETE',
            missingFields: ['externalPlaceId'],
            attempts: { increment: 1 },
            refreshedAt: new Date(),
            notes: 'Missing externalPlaceId; cannot verify against Google Places.',
          },
        })
        await prisma.refreshJob.update({
          where: { id: jobId },
          data: {
            refreshedCount: { increment: 1 },
            incompleteCount: { increment: 1 },
          },
        })
        continue
      }

      const details = await fetchPlaceDetails(apiKey, business.externalPlaceId)
      if (!details?.result) {
        await prisma.refreshJobResult.update({
          where: { id: r.id },
          data: {
            outcome: 'VERIFICATION_FAILED',
            attempts: { increment: 1 },
            refreshedAt: new Date(),
            notes: 'Google Places details fetch failed.',
          },
        })
        await prisma.business.update({
          where: { id: business.id },
          data: {
            lastRefreshedAt: new Date(),
            refreshStatus: 'VERIFICATION_FAILED',
            refreshNotes: 'Google Places details fetch failed.',
          },
        })
        await prisma.refreshJob.update({
          where: { id: jobId },
          data: {
            refreshedCount: { increment: 1 },
            verificationFailedCount: { increment: 1 },
          },
        })
        continue
      }

      const res = details.result
      const missingFields: string[] = []

      const phone = res.formatted_phone_number || null
      const website = res.website || null
      const formattedAddress = res.formatted_address || null
      const latitude = typeof res.geometry?.location?.lat === 'number' ? res.geometry!.location!.lat! : null
      const longitude = typeof res.geometry?.location?.lng === 'number' ? res.geometry!.location!.lng! : null
      const mapLocationUrl = res.url || null
      const description = res.editorial_summary?.overview || null

      const photos =
        Array.isArray(res.photos) && res.photos.length > 0
          ? res.photos
              .map((p) => p?.photo_reference)
              .filter((p): p is string => typeof p === 'string' && p.length > 0)
              .slice(0, 8)
              .map((ref) => buildPhotoUrl(apiKey, ref))
          : []

      const aggregateRating = typeof res.rating === 'number' ? res.rating : null
      const totalRatings = typeof res.user_ratings_total === 'number' ? res.user_ratings_total : null

      const userReviews =
        Array.isArray(res.reviews) && res.reviews.length > 0
          ? res.reviews.slice(0, 3).map((rv) => ({
              author_name: rv.author_name ?? null,
              rating: rv.rating ?? null,
              text: rv.text ?? null,
              relative_time_description: rv.relative_time_description ?? null,
            }))
          : undefined

      if (!phone) missingFields.push('phone')
      if (!formattedAddress) missingFields.push('formattedAddress')
      if (latitude === null || longitude === null) missingFields.push('geo')
      if (!website) missingFields.push('website')
      if (!description) missingFields.push('description')
      if (!photos.length) missingFields.push('photos')
      if (aggregateRating === null) missingFields.push('aggregateRating')
      if (totalRatings === null) missingFields.push('totalRatings')

      const beforeFingerprint = jsonStable({
        phone: business.phone,
        website: business.website,
        formattedAddress: business.formattedAddress,
        latitude: business.latitude,
        longitude: business.longitude,
        mapLocationUrl: business.mapLocationUrl,
        description: business.description,
        photos: business.photos,
        aggregateRating: business.aggregateRating,
        totalRatings: business.totalRatings,
        userReviews: business.userReviews,
      })

      const afterFingerprint = jsonStable({
        phone,
        website,
        formattedAddress,
        latitude,
        longitude,
        mapLocationUrl,
        description,
        photos,
        aggregateRating,
        totalRatings,
        userReviews,
      })

      const updated = beforeFingerprint !== afterFingerprint
      const outcome = missingFields.length > 0 ? 'INCOMPLETE' : updated ? 'UPDATED' : 'UNCHANGED'

      await prisma.business.update({
        where: { id: business.id },
        data: {
          phone,
          website,
          formattedAddress,
          latitude,
          longitude,
          mapLocationUrl,
          description,
          photos,
          aggregateRating,
          totalRatings,
          userReviews: userReviews as any,
          rawGooglePayload: details as unknown as object,
          lastRefreshedAt: new Date(),
          refreshStatus: missingFields.length > 0 ? 'INCOMPLETE' : 'OK',
          refreshMissingFields: missingFields,
          refreshNotes: null,
        },
      })

      await prisma.refreshJobResult.update({
        where: { id: r.id },
        data: {
          outcome,
          missingFields,
          attempts: { increment: 1 },
          refreshedAt: new Date(),
          requestPayload: { placeId: business.externalPlaceId },
          responsePayload: details as unknown as object,
        },
      })

      await prisma.refreshJob.update({
        where: { id: jobId },
        data: {
          refreshedCount: { increment: 1 },
          updatedCount: outcome === 'UPDATED' ? { increment: 1 } : undefined,
          unchangedCount: outcome === 'UNCHANGED' ? { increment: 1 } : undefined,
          incompleteCount: outcome === 'INCOMPLETE' ? { increment: 1 } : undefined,
        },
      })
    }
  }

  const done = await prisma.refreshJobResult.count({
    where: { jobId, outcome: { not: 'NOT_RUN' } },
  })
  const total = job.totalSelected

  const updatedJob = await prisma.refreshJob.findUnique({
    where: { id: jobId },
    select: {
      status: true,
      totalSelected: true,
      refreshedCount: true,
      updatedCount: true,
      unchangedCount: true,
      incompleteCount: true,
      verificationFailedCount: true,
      manualReviewCount: true,
    },
  })

  const isComplete = done >= total
  if (isComplete && updatedJob?.status !== 'COMPLETED') {
    await prisma.refreshJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', finishedAt: new Date() },
    })
  }

  return {
    jobId,
    totalSelected: updatedJob?.totalSelected ?? total,
    refreshedCount: updatedJob?.refreshedCount ?? 0,
    updatedCount: updatedJob?.updatedCount ?? 0,
    unchangedCount: updatedJob?.unchangedCount ?? 0,
    incompleteCount: updatedJob?.incompleteCount ?? 0,
    verificationFailedCount: updatedJob?.verificationFailedCount ?? 0,
    manualReviewCount: updatedJob?.manualReviewCount ?? 0,
    status: isComplete ? 'COMPLETED' : updatedJob?.status ?? 'RUNNING',
  }
}


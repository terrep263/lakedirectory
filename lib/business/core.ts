import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import {
  prisma,
} from '@/lib/prisma'
import {
  BusinessClaimState,
  BusinessLifecycleState,
  BusinessSource,
  Prisma,
} from '@prisma/client'
import { ensureBusinessPageExists } from './business-page'

export const PLACEHOLDER_IMAGE = 'placeholder.png'

export interface BusinessCreateInput {
  name: string
  streetAddress: string
  city: string
  state: string
  postalCode: string
  latitude?: number | null
  longitude?: number | null
  phone?: string | null
  primaryCategory: string
  secondaryCategories?: string[]
  rating?: number | null
  reviewCount?: number | null
  hours?: Prisma.JsonValue | null
  isOpen?: boolean | null
  primaryImagePath?: string | null
  googlePlaceId?: string | null
  importBatchId?: string | null
  source?: BusinessSource
  claimState?: BusinessClaimState
  lifecycleState?: BusinessLifecycleState
}

export interface BusinessUpdateInput {
  name?: string
  streetAddress?: string
  city?: string
  state?: string
  postalCode?: string
  latitude?: number | null
  longitude?: number | null
  phone?: string | null
  primaryCategory?: string
  secondaryCategories?: string[]
  rating?: number | null
  reviewCount?: number | null
  hours?: Prisma.JsonValue | null
  isOpen?: boolean | null
  primaryImagePath?: string | null
  claimState?: BusinessClaimState
  lifecycleState?: BusinessLifecycleState
}

export interface GoogleIngestParams {
  apiKey: string
  location: { lat: number; lng: number }
  keyword?: string
  category?: string
  radiusMeters: number
  limit?: number
  importBatchId?: string
}

export interface GoogleIngestResult {
  importBatchId: string
  createdCount: number
  skippedCount: number
  businesses: string[]
}

export class BusinessError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

const BUSINESS_IMAGE_DIR = path.join(process.cwd(), 'public', 'business-assets')

const URL_PATTERN = /(https?:\/\/|www\.)/i

function assertNoUrl(value: string | null | undefined, field: string) {
  if (!value) return
  if (URL_PATTERN.test(value)) {
    throw new BusinessError(`${field} cannot contain URLs`, 400)
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFKC')
}

function normalizePostalCode(postalCode: string): string {
  return postalCode.trim().toUpperCase()
}

function buildDedupWhere(input: {
  normalizedName: string
  city: string
  state: string
  postalCode: string
}) {
  return {
    normalizedName: input.normalizedName,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
  }
}

async function isDuplicateBusiness(input: {
  normalizedName: string
  city: string
  state: string
  postalCode: string
  latitude?: number | null
  longitude?: number | null
}) {
  const existing = await prisma.businessCore.findFirst({
    where: {
      normalizedName: input.normalizedName,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      deletedAt: null,
    },
  })

  if (existing) return true

  if (input.latitude != null && input.longitude != null) {
    const lat = input.latitude
    const lng = input.longitude
    const proximity = 0.001 // ~100m
    const nearby = await prisma.businessCore.findFirst({
      where: {
        normalizedName: input.normalizedName,
        latitude: { gte: lat - proximity, lte: lat + proximity },
        longitude: { gte: lng - proximity, lte: lng + proximity },
        deletedAt: null,
      },
    })
    if (nearby) return true
  }

  return false
}

async function ensureImagePath(businessId: string, primaryImagePath?: string | null): Promise<string> {
  if (primaryImagePath && primaryImagePath.trim().length > 0) {
    assertNoUrl(primaryImagePath, 'primaryImagePath')
    return primaryImagePath.trim()
  }
  return PLACEHOLDER_IMAGE
}

async function storeGooglePhoto(apiKey: string, photoReference: string, businessId: string): Promise<string> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${encodeURIComponent(photoReference)}&key=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Photo fetch failed: ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    await fs.mkdir(BUSINESS_IMAGE_DIR, { recursive: true })
    const filename = `${businessId}.jpg`
    const filePath = path.join(BUSINESS_IMAGE_DIR, filename)
    await fs.writeFile(filePath, buffer)
    return `/business-assets/${filename}`
  } catch (err) {
    console.warn('[business] photo download failed, using placeholder', err)
    return PLACEHOLDER_IMAGE
  }
}

export async function createBusinessManual(input: BusinessCreateInput) {
  assertNoUrl(input.name, 'name')
  assertNoUrl(input.streetAddress, 'streetAddress')
  assertNoUrl(input.city, 'city')
  assertNoUrl(input.state, 'state')
  assertNoUrl(input.postalCode, 'postalCode')
  assertNoUrl(input.phone ?? undefined, 'phone')

  const normalizedName = normalizeName(input.name)
  const postal = normalizePostalCode(input.postalCode)

  const duplicate = await isDuplicateBusiness({
    normalizedName,
    city: input.city.trim(),
    state: input.state.trim(),
    postalCode: postal,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  })

  if (duplicate) {
    throw new BusinessError('Duplicate business (name + location)', 409)
  }

  const businessId = randomUUID()
  const primaryImagePath = await ensureImagePath(businessId, input.primaryImagePath)

  return prisma.businessCore.create({
    data: {
      id: businessId,
      name: input.name.trim(),
      normalizedName,
      streetAddress: input.streetAddress.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      postalCode: postal,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      phone: input.phone?.trim() ?? null,
      primaryCategory: input.primaryCategory.trim(),
      secondaryCategories: (input.secondaryCategories ?? []).map((c) => c.trim()).filter(Boolean),
      googlePlaceId: input.googlePlaceId ?? null,
      rating: input.rating ?? null,
      reviewCount: input.reviewCount ?? null,
      hours: input.hours ?? undefined,
      isOpen: input.isOpen ?? null,
      source: input.source ?? BusinessSource.MANUAL,
      claimState: input.claimState ?? BusinessClaimState.UNCLAIMED,
      lifecycleState: input.lifecycleState ?? BusinessLifecycleState.ACTIVE,
      primaryImagePath,
      importBatchId: input.importBatchId ?? null,
    },
  })
}

export async function updateBusiness(id: string, updates: BusinessUpdateInput, changedById?: string) {
  const existing = await prisma.businessCore.findUnique({ where: { id } })
  if (!existing || existing.deletedAt) {
    throw new BusinessError('Business not found', 404)
  }

  const normalizedUpdates: Partial<BusinessUpdateInput> & { normalizedName?: string; postalCode?: string } = {}

  if (updates.name !== undefined) {
    assertNoUrl(updates.name, 'name')
    normalizedUpdates.name = updates.name.trim()
    normalizedUpdates.normalizedName = normalizeName(updates.name)
  }
  if (updates.streetAddress !== undefined) {
    assertNoUrl(updates.streetAddress, 'streetAddress')
    normalizedUpdates.streetAddress = updates.streetAddress.trim()
  }
  if (updates.city !== undefined) {
    assertNoUrl(updates.city, 'city')
    normalizedUpdates.city = updates.city.trim()
  }
  if (updates.state !== undefined) {
    assertNoUrl(updates.state, 'state')
    normalizedUpdates.state = updates.state.trim()
  }
  if (updates.postalCode !== undefined) {
    assertNoUrl(updates.postalCode, 'postalCode')
    normalizedUpdates.postalCode = normalizePostalCode(updates.postalCode)
  }
  if (updates.phone !== undefined) {
    assertNoUrl(updates.phone ?? undefined, 'phone')
    normalizedUpdates.phone = updates.phone?.trim() ?? null
  }
  if (updates.primaryCategory !== undefined) normalizedUpdates.primaryCategory = updates.primaryCategory.trim()
  if (updates.secondaryCategories !== undefined) normalizedUpdates.secondaryCategories = updates.secondaryCategories
  if (updates.rating !== undefined) normalizedUpdates.rating = updates.rating ?? null
  if (updates.reviewCount !== undefined) normalizedUpdates.reviewCount = updates.reviewCount ?? null
  if (updates.hours !== undefined) normalizedUpdates.hours = updates.hours ?? undefined
  if (updates.isOpen !== undefined) normalizedUpdates.isOpen = updates.isOpen ?? null
  if (updates.latitude !== undefined) normalizedUpdates.latitude = updates.latitude ?? null
  if (updates.longitude !== undefined) normalizedUpdates.longitude = updates.longitude ?? null
  if (updates.claimState !== undefined) normalizedUpdates.claimState = updates.claimState
  if (updates.lifecycleState !== undefined) normalizedUpdates.lifecycleState = updates.lifecycleState

  if (updates.primaryImagePath !== undefined) {
    normalizedUpdates.primaryImagePath = await ensureImagePath(id, updates.primaryImagePath)
  }

  const sensitiveBefore: Record<string, unknown> = {}
  const sensitiveAfter: Record<string, unknown> = {}
  const sensitiveFields: string[] = []

  const sensitiveKeys: Array<keyof BusinessUpdateInput> = ['name', 'phone', 'streetAddress', 'city', 'state', 'postalCode', 'latitude', 'longitude']
  for (const key of sensitiveKeys) {
    if (key in updates) {
      sensitiveFields.push(key)
      sensitiveBefore[String(key)] = (existing as any)[key]
      sensitiveAfter[String(key)] = (normalizedUpdates as any)[key] ?? (updates as any)[key]
    }
  }

  const updated = await prisma.businessCore.update({
    where: { id },
    data: normalizedUpdates as any,
  })

  if (sensitiveFields.length > 0) {
    await prisma.businessAuditLog.create({
      data: {
        businessId: id,
        changedById: changedById ?? null,
        changedFields: sensitiveFields,
        before: sensitiveBefore as any,
        after: sensitiveAfter as any,
      },
    })
  }

  return updated
}

export async function softDeleteBusiness(id: string) {
  const exists = await prisma.businessCore.findUnique({ where: { id } })
  if (!exists || exists.deletedAt) throw new BusinessError('Business not found', 404)
  return prisma.businessCore.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export async function restoreBusiness(id: string) {
  const exists = await prisma.businessCore.findUnique({ where: { id } })
  if (!exists || !exists.deletedAt) throw new BusinessError('Business not deleted', 404)
  return prisma.businessCore.update({
    where: { id },
    data: { deletedAt: null },
  })
}

export async function finalDeleteBusiness(id: string) {
  await prisma.$transaction([
    prisma.businessAuditLog.deleteMany({ where: { businessId: id } }),
    prisma.businessCore.delete({ where: { id } }),
  ])
}

function parseAddress(address?: string): { streetAddress: string; city: string; state: string; postalCode: string } {
  if (!address) {
    return {
      streetAddress: 'Unknown address',
      city: 'Unknown city',
      state: 'UNKNOWN',
      postalCode: 'UNKNOWN',
    }
  }
  const parts = address.split(',').map((p) => p.trim())
  const streetAddress = parts[0] ?? 'Unknown address'
  const city = parts[1] ?? 'Unknown city'
  const statePostal = parts[2]?.split(' ').filter(Boolean) ?? []
  const state = statePostal[0] ?? 'UNKNOWN'
  const postal = statePostal[1] ?? 'UNKNOWN'
  return { streetAddress, city, state, postalCode: postal }
}
export async function ingestPlacesArray(
  places: any[],
  adminId: string,
  apiKey: string
): Promise<{ created: string[]; skipped: number }> {
  const created: string[] = []
  let skipped = 0

  for (const place of places) {
    try {
      const name: string = place.name
      const addressParts = parseAddress(place.vicinity || place.formatted_address)
      const normalizedName = normalizeName(name)
      const postal = normalizePostalCode(addressParts.postalCode)

      const duplicate = await isDuplicateBusiness({
        normalizedName,
        city: addressParts.city,
        state: addressParts.state,
        postalCode: postal,
        latitude: place.geometry?.location?.lat ?? null,
        longitude: place.geometry?.location?.lng ?? null,
      })

      if (duplicate) {
        skipped++
        continue
      }

      const businessId = randomUUID()
      let primaryImagePath = PLACEHOLDER_IMAGE
      const photoRef = place.photos?.[0]?.photo_reference
      if (photoRef) {
        primaryImagePath = await storeGooglePhoto(apiKey, photoRef, businessId)
      }

      await prisma.businessCore.create({
        data: {
          id: businessId,
          name,
          normalizedName,
          streetAddress: addressParts.streetAddress,
          city: addressParts.city,
          state: addressParts.state,
          postalCode: postal,
          latitude: place.geometry?.location?.lat ?? null,
          longitude: place.geometry?.location?.lng ?? null,
          phone: place.formatted_phone_number ?? null,
          primaryCategory: place.types?.[0] ?? 'unspecified',
          secondaryCategories: place.types?.slice(1) ?? [],
          googlePlaceId: place.place_id ?? null,
          rating: place.rating ?? null,
          reviewCount: place.user_ratings_total ?? null,
          hours: place.opening_hours ?? null,
          isOpen: place.opening_hours?.open_now ?? null,
          source: BusinessSource.GOOGLE,
          claimState: BusinessClaimState.UNCLAIMED,
          lifecycleState: BusinessLifecycleState.ACTIVE,
          primaryImagePath,
        },
      })

      created.push(businessId)
    } catch (error) {
      skipped++
    }
  }

  return { created, skipped }
}

export async function ingestBusinessesFromGoogle(params: GoogleIngestParams): Promise<GoogleIngestResult> {
  const importBatchId = params.importBatchId ?? randomUUID()
  const log = await prisma.businessImportLog.create({
    data: {
      importBatchId,
      source: BusinessSource.GOOGLE,
      location: params.location,
      category: params.category ?? null,
      keyword: params.keyword ?? null,
      radiusMeters: params.radiusMeters,
      limit: params.limit ?? null,
      params: params as any,
    },
  })

  const businesses: string[] = []
  let createdCount = 0
  let skippedCount = 0

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${params.location.lat},${params.location.lng}`)
  url.searchParams.set('radius', params.radiusMeters.toString())
  if (params.keyword) url.searchParams.set('keyword', params.keyword)
  if (params.category) url.searchParams.set('type', params.category)
  url.searchParams.set('key', params.apiKey)

  const res = await fetch(url.toString())
  if (!res.ok) {
    await prisma.businessImportLog.update({
      where: { id: log.id },
      data: { errorMessage: `Google Places request failed: ${res.status}` },
    })
    throw new BusinessError('Google Places request failed', 502)
  }

  const payload = await res.json() as any
  const results: any[] = Array.isArray(payload.results) ? payload.results : []
  const limit = params.limit ?? results.length

  for (const place of results.slice(0, limit)) {
    const name: string = place.name
    const addressParts = parseAddress(place.vicinity || place.formatted_address)
    const normalizedName = normalizeName(name)
    const postal = normalizePostalCode(addressParts.postalCode)

    const duplicate = await isDuplicateBusiness({
      normalizedName,
      city: addressParts.city,
      state: addressParts.state,
      postalCode: postal,
      latitude: place.geometry?.location?.lat ?? null,
      longitude: place.geometry?.location?.lng ?? null,
    })

    if (duplicate) {
      skippedCount++
      continue
    }

    const businessId = randomUUID()
    let primaryImagePath = PLACEHOLDER_IMAGE
    const photoRef = place.photos?.[0]?.photo_reference
    if (photoRef) {
      primaryImagePath = await storeGooglePhoto(params.apiKey, photoRef, businessId)
    }

    try {
      // Create BusinessCore record for ingestion tracking
      const created = await prisma.businessCore.create({
        data: {
          id: businessId,
          name,
          normalizedName,
          streetAddress: addressParts.streetAddress,
          city: addressParts.city,
          state: addressParts.state,
          postalCode: postal,
          latitude: place.geometry?.location?.lat ?? null,
          longitude: place.geometry?.location?.lng ?? null,
          phone: place.formatted_phone_number ?? null,
          primaryCategory: place.types?.[0] ?? params.category ?? 'unspecified',
          secondaryCategories: place.types?.slice(1) ?? [],
          googlePlaceId: place.place_id ?? null,
          rating: place.rating ?? null,
          reviewCount: place.user_ratings_total ?? null,
          hours: place.opening_hours ?? null,
          isOpen: place.opening_hours?.open_now ?? null,
          source: BusinessSource.GOOGLE,
          claimState: BusinessClaimState.UNCLAIMED,
          lifecycleState: BusinessLifecycleState.ACTIVE,
          primaryImagePath,
          importBatchId,
        },
      })

      // ALSO create Business record (Module 2: Business Record)
      const locationText = `${addressParts.city}, ${addressParts.state}`
      
      await prisma.business.upsert({
        where: { id: businessId },
        create: {
          id: businessId,
          name,
          slug: normalizeName(name).replace(/\s+/g, '-'),
          category: place.types?.[0] ?? params.category ?? null,
          addressLine1: addressParts.streetAddress,
          city: addressParts.city,
          state: addressParts.state,
          postalCode: postal,
          phone: place.formatted_phone_number ?? null,
          latitude: place.geometry?.location?.lat ?? null,
          longitude: place.geometry?.location?.lng ?? null,
          aggregateRating: place.rating ?? null,
          totalRatings: place.user_ratings_total ?? null,
          formattedAddress: place.formatted_address ?? null,
          operationalStatus: place.business_status ?? null,
          externalPlaceId: place.place_id ?? null,
          ingestionSource: 'GOOGLE_PLACES',
          logoUrl: primaryImagePath === PLACEHOLDER_IMAGE ? undefined : primaryImagePath,
          businessStatus: 'ACTIVE',
          isVerified: false,
        },
        update: {
          // Keep existing if already exists
        },
      })

      // AUTOMATICALLY create BusinessPage with AI description
      await ensureBusinessPageExists({
        businessId,
        businessName: name,
        businessCategory: place.types?.[0] ?? params.category,
        businessCity: addressParts.city,
        businessState: addressParts.state,
        businessPhone: place.formatted_phone_number ?? undefined,
        businessRating: place.rating ?? undefined,
        businessRatingCount: place.user_ratings_total ?? undefined,
        heroImageUrl: primaryImagePath === PLACEHOLDER_IMAGE ? undefined : primaryImagePath,
        locationText,
      })

      businesses.push(created.id)
      createdCount++
    } catch (err) {
      console.error('[ingestBusinessesFromGoogle] Error creating business records:', err)
      // Continue to next business despite error
    }
  }

  await prisma.businessImportLog.update({
    where: { id: log.id },
    data: {
      completedAt: new Date(),
      createdCount,
      skippedCount,
    },
  })

  return { importBatchId, createdCount, skippedCount, businesses }
}

export async function setPrimaryImage(businessId: string, primaryImagePath: string) {
  const business = await prisma.businessCore.findUnique({ where: { id: businessId } })
  if (!business || business.deletedAt) {
    throw new BusinessError('Business not found', 404)
  }
  const pathValue = await ensureImagePath(businessId, primaryImagePath)
  return prisma.businessCore.update({
    where: { id: businessId },
    data: { primaryImagePath: pathValue },
  })
}

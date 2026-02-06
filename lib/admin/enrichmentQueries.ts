/**
 * Enrichment Query Layer
 * 
 * Database queries for:
 * - Fetching eligible businesses
 * - Conditionally updating description/coverUrl/phone
 * 
 * Responsibilities:
 * - Query eligible enrichment candidates
 * - Apply safe update patterns
 * - NO Google API logic
 * - NO complex business rules outside enrichment checks
 */

import { prisma } from '@/lib/prisma'

export interface EligibleBusiness {
  id: string
  name: string
  externalPlaceId: string
  description: string | null
  coverUrl: string | null
  phone: string | null
}

export interface EnrichmentUpdate {
  description?: string
  coverUrl?: string
  phone?: string
}

/**
 * Fetch all eligible businesses for enrichment
 * 
 * Eligibility criteria:
 * - ingestionSource === "GOOGLE_PLACES"
 * - externalPlaceId is present
 * - At least one of: description, coverUrl, or phone is empty
 * 
 * @returns Array of eligible businesses
 */
export async function fetchEligibleBusinesses(): Promise<EligibleBusiness[]> {
  const businesses = await prisma.business.findMany({
    where: {
      ingestionSource: 'GOOGLE_PLACES',
      externalPlaceId: {
        not: null,
      },
      OR: [
        { description: null },
        { description: '' },
        { coverUrl: null },
        { coverUrl: '' },
        { phone: null },
        { phone: '' },
      ],
    },
    select: {
      id: true,
      name: true,
      externalPlaceId: true,
      description: true,
      coverUrl: true,
      phone: true,
    },
  })

  return businesses.map((b) => ({
    id: b.id,
    name: b.name,
    externalPlaceId: b.externalPlaceId || '',
    description: b.description,
    coverUrl: b.coverUrl,
    phone: b.phone,
  }))
}

/**
 * Safely update a business with enrichment data
 * 
 * Only updates fields that are currently empty.
 * Never overwrites existing vendor data.
 * 
 * @param businessId - ID of business to update
 * @param enrichment - Enrichment data to apply
 * @returns Updated field count
 */
export async function applyEnrichmentSafely(
  businessId: string,
  enrichment: EnrichmentUpdate
): Promise<number> {
  // Fetch current state
  const current = await getBusinessById(businessId)
  if (!current) {
    return 0
  }

  let updateCount = 0

  // Build update object - only update truly empty fields
  const updateData: Record<string, unknown> = {}

  // Only update description if it's currently empty AND new value exists
  if (enrichment.description && (!current.description || current.description.trim() === '')) {
    updateData.description = enrichment.description
    updateCount++
  }

  // Only update coverUrl if it's currently empty AND new value exists
  if (enrichment.coverUrl && (!current.coverUrl || current.coverUrl.trim() === '')) {
    updateData.coverUrl = enrichment.coverUrl
    updateCount++
  }

  // Only update phone if it's currently empty AND new value exists
  if (enrichment.phone && (!current.phone || current.phone.trim() === '')) {
    updateData.phone = enrichment.phone
    updateCount++
  }

  if (updateCount === 0) {
    return 0
  }

  // Apply update with safeguards
  await prisma.business.update({
    where: { id: businessId },
    data: updateData,
  })

  return updateCount
}

/**
 * Get a business by ID for verification
 * 
 * @param businessId - ID of business to fetch
 * @returns Business record or null
 */
export async function getBusinessById(businessId: string) {
  return await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      externalPlaceId: true,
      ingestionSource: true,
      description: true,
      coverUrl: true,
      phone: true,
    },
  })
}

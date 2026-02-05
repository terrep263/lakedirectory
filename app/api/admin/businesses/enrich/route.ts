/**
 * Admin Enrichment API Route
 * 
 * POST /api/admin/businesses/enrich
 * 
 * Enriches existing business listings with Google Places data:
 * - Descriptions from editorial_summary
 * - Photos from Google Places photo references
 * 
 * ADMIN ACCESS REQUIRED
 * 
 * Response:
 * {
 *   "processed": number,
 *   "enriched": number,
 *   "skipped": number
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAuth } from '@/lib/admin/auth'
import { fetchEligibleBusinesses, applyEnrichmentSafely, getBusinessById } from '@/lib/admin/enrichmentQueries'
import { fetchGooglePlacesEnrichment } from '@/lib/admin/googlePlacesEnrichment'
import { logAdminAction } from '@/lib/admin/audit'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (true) {
      const current = nextIndex++
      if (current >= items.length) return
      results[current] = await mapper(items[current])
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => worker())
  await Promise.all(workers)
  return results
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. ENFORCE ADMIN ACCESS
  const adminAuth = await verifyAdminAuth(request)

  if (!adminAuth.isValid) {
    return NextResponse.json({ error: adminAuth.error || 'Unauthorized' }, { status: 403 })
  }

  // 2. VERIFY GOOGLE API KEY
  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  if (!apiKey) {
    console.error('[enrich] GOOGLE_PLACES_API_KEY not configured')
    return NextResponse.json(
      { error: 'Google Places API key not configured' },
      { status: 500 }
    )
  }

  try {
    // 3. FETCH TOTAL GOOGLE BUSINESSES
    const totalGoogleBusinesses = await prisma.business.count({
      where: {
        ingestionSource: 'GOOGLE',
        externalPlaceId: { not: null },
      },
    })

    console.log(`[enrich] Total Google-sourced businesses: ${totalGoogleBusinesses}`)

    // 4. FETCH ELIGIBLE BUSINESSES
    const eligibleBusinesses = await fetchEligibleBusinesses()
    
    console.log(`[enrich] Found ${eligibleBusinesses.length} eligible businesses out of ${totalGoogleBusinesses}`)

    let processed = 0
    let enriched = 0
    let skipped = 0
    const errors: { businessId: string; name: string; error: string }[] = []

    // 4. PROCESS ELIGIBLE BUSINESSES WITH CONCURRENCY LIMIT
    const concurrency = 5
    const perBusinessResults = await mapWithConcurrency(eligibleBusinesses, concurrency, async (business) => {
      try {
        // Verify business is still eligible (double-check for safety)
        const current = await getBusinessById(business.id)

        if (!current || !current.externalPlaceId) {
          return { status: 'skipped' as const }
        }

        // Check if ALL fields are already filled
        if (current.description && current.logoUrl && current.phone) {
          return { status: 'skipped' as const }
        }

        // Fetch enrichment from Google Places
        const enrichmentData = await fetchGooglePlacesEnrichment(apiKey, current.externalPlaceId)

        if (enrichmentData.error) {
          return { status: 'error' as const, businessId: current.id, name: current.name, error: enrichmentData.error }
        }

        // Only include fields that are empty in current record
        const safeEnrichment = {
          description: !current.description ? enrichmentData.description : undefined,
          logoUrl: !current.logoUrl ? enrichmentData.logoUrl : undefined,
          phone: !current.phone ? enrichmentData.phone : undefined,
        }

        // Remove undefined fields
        Object.keys(safeEnrichment).forEach(
          (key) =>
            safeEnrichment[key as keyof typeof safeEnrichment] === undefined &&
            delete safeEnrichment[key as keyof typeof safeEnrichment]
        )

        // Skip if nothing to update
        if (Object.keys(safeEnrichment).length === 0) {
          return { status: 'skipped' as const }
        }

        const updateCount = await applyEnrichmentSafely(current.id, safeEnrichment)
        return updateCount > 0 ? { status: 'enriched' as const } : { status: 'skipped' as const }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { status: 'error' as const, businessId: business.id, name: business.name, error: message }
      } finally {
        // small yield to reduce burst pressure
        await sleep(10)
      }
    })

    processed = eligibleBusinesses.length
    for (const r of perBusinessResults) {
      if (r.status === 'enriched') enriched++
      else if (r.status === 'skipped') skipped++
      else {
        errors.push({ businessId: r.businessId, name: r.name, error: r.error })
        skipped++
      }
    }

    // 5. LOG AUDIT ENTRY
    try {
      await logAdminAction(
        adminAuth.adminId!,
        'BUSINESS_ENRICHMENT_RUN',
        'BUSINESS',
        'bulk',
        {
          processed,
          enriched,
          skipped,
          errorCount: errors.length,
          errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit to first 10 errors
        }
      )
    } catch (auditError) {
      console.error('[enrich] Failed to log audit action:', auditError)
      // Don't fail the entire operation if audit logging fails
    }

    // 7. RETURN RESULTS
    return NextResponse.json({
      totalChecked: totalGoogleBusinesses,
      processed,
      enriched,
      skipped,
      errorCount: errors.length,
      eligibleCount: eligibleBusinesses.length,
      message: eligibleBusinesses.length === 0 
        ? `Checked ${totalGoogleBusinesses} Google-sourced businesses. None needed enrichment - all already have descriptions, photos, and phone numbers.`
        : `Checked ${totalGoogleBusinesses} Google businesses, found ${eligibleBusinesses.length} eligible for enrichment`,
      ...(errors.length > 0 && { sampleErrors: errors.slice(0, 5) }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[enrich] Enrichment failed:', message)

    return NextResponse.json(
      { error: 'Enrichment operation failed: ' + message },
      { status: 500 }
    )
  }
}

/**
 * NEW COUNTY LAUNCH PLAYBOOK
 * Phase 2: Configure Cities API
 *
 * POST /api/super-admin/launch/counties/[id]/cities
 *
 * Authorization: SUPER_ADMIN only
 *
 * Configures the approved municipality list for a county.
 * This action is irreversible - once configured, the city list is frozen.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, countyFailure } from '@/lib/county'
import { executePhase2ConfigureCities } from '@/lib/county-launch'
import { isValidCitySlug } from '@/lib/geography/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/super-admin/launch/counties/[id]/cities
 * Configure cities for a county (Phase 2)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { id: countyId } = await context.params

  // GUARD: Require SUPER_ADMIN
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  const admin = adminResult.data

  // Parse request body
  let body: {
    cities?: Array<{
      name?: string
      slug?: string
      displayOrder?: number
    }>
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  // Validate cities array
  if (!body.cities || !Array.isArray(body.cities)) {
    return NextResponse.json(
      { error: 'Cities array is required' },
      { status: 400 }
    )
  }

  if (body.cities.length < 5) {
    return NextResponse.json(
      { error: 'At least 5 cities are required' },
      { status: 400 }
    )
  }

  if (body.cities.length > 20) {
    return NextResponse.json(
      { error: 'Maximum 20 cities allowed' },
      { status: 400 }
    )
  }

  // Validate each city
  const validatedCities: Array<{ name: string; slug: string; displayOrder: number }> = []
  const slugs = new Set<string>()

  for (let i = 0; i < body.cities.length; i++) {
    const city = body.cities[i]

    if (!city.name || typeof city.name !== 'string' || city.name.trim().length === 0) {
      return NextResponse.json(
        { error: `City at index ${i} is missing name` },
        { status: 400 }
      )
    }

    if (!city.slug || typeof city.slug !== 'string') {
      return NextResponse.json(
        { error: `City at index ${i} is missing slug` },
        { status: 400 }
      )
    }

    const normalizedSlug = city.slug.toLowerCase()

    if (!isValidCitySlug(normalizedSlug)) {
      return NextResponse.json(
        { error: `City at index ${i} has invalid slug format` },
        { status: 400 }
      )
    }

    if (slugs.has(normalizedSlug)) {
      return NextResponse.json(
        { error: `Duplicate slug "${normalizedSlug}" at index ${i}` },
        { status: 400 }
      )
    }

    slugs.add(normalizedSlug)

    validatedCities.push({
      name: city.name.trim(),
      slug: normalizedSlug,
      displayOrder: typeof city.displayOrder === 'number' ? city.displayOrder : i,
    })
  }

  // Execute Phase 2
  const result = await executePhase2ConfigureCities(
    countyId,
    validatedCities,
    admin.id
  )

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      cityCount: result.data.cityCount,
      phase: 'PHASE_2',
      nextPhase: 'PHASE_3',
      message: 'Cities configured and frozen. Proceed to Google Places ingestion.',
    },
  }, { status: 201 })
}

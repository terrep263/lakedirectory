/**
 * NEW COUNTY LAUNCH PLAYBOOK
 * Phase 1: Create Launch County API
 *
 * POST /api/super-admin/launch/counties
 *
 * Authorization: SUPER_ADMIN only
 *
 * Creates a new county in DRAFT status with its primary domain.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, countyFailure } from '@/lib/county'
import { isValidCountySlug, isValidStateAbbreviation } from '@/lib/county/types'
import {
  validatePreconditionsOrAbort,
  executePhase1CreateCounty,
} from '@/lib/county-launch'

/**
 * POST /api/super-admin/launch/counties
 * Create a new launch county (Phase 1)
 */
export async function POST(request: NextRequest) {
  // GUARD: Require SUPER_ADMIN
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  const admin = adminResult.data

  // Validate preconditions first
  const preconditionsResult = await validatePreconditionsOrAbort()
  if (!preconditionsResult.success) {
    return NextResponse.json(
      { error: preconditionsResult.error },
      { status: preconditionsResult.status }
    )
  }

  // Parse request body
  let body: {
    name?: string
    state?: string
    slug?: string
    primaryDomain?: string
    boundaryGeometry?: unknown
    googlePlacesConfig?: unknown
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  // Validate required fields
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: 'County name is required' },
      { status: 400 }
    )
  }

  if (!body.state || typeof body.state !== 'string') {
    return NextResponse.json(
      { error: 'State is required' },
      { status: 400 }
    )
  }

  if (!isValidStateAbbreviation(body.state)) {
    return NextResponse.json(
      { error: 'Invalid state abbreviation' },
      { status: 400 }
    )
  }

  if (!body.slug || typeof body.slug !== 'string') {
    return NextResponse.json(
      { error: 'County slug is required' },
      { status: 400 }
    )
  }

  if (!isValidCountySlug(body.slug)) {
    return NextResponse.json(
      { error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.' },
      { status: 400 }
    )
  }

  if (!body.primaryDomain || typeof body.primaryDomain !== 'string') {
    return NextResponse.json(
      { error: 'Primary domain is required' },
      { status: 400 }
    )
  }

  // Validate domain format
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i
  if (!domainRegex.test(body.primaryDomain)) {
    return NextResponse.json(
      { error: 'Invalid domain format' },
      { status: 400 }
    )
  }

  // Execute Phase 1
  const result = await executePhase1CreateCounty(
    {
      name: body.name.trim(),
      state: body.state.toUpperCase(),
      slug: body.slug.toLowerCase(),
      primaryDomain: body.primaryDomain.toLowerCase(),
      boundaryGeometry: body.boundaryGeometry,
      googlePlacesConfig: body.googlePlacesConfig,
    },
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
      countyId: result.data.countyId,
      domainId: result.data.domainId,
      phase: 'PHASE_1',
      nextPhase: 'PHASE_2',
      message: 'County created in DRAFT status. Proceed to configure cities.',
    },
  }, { status: 201 })
}

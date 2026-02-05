/**
 * NEW COUNTY LAUNCH PLAYBOOK
 * Phase Execution Functions
 *
 * Each phase has specific requirements and outputs.
 * Phases must be executed in order.
 * No phase can be skipped.
 */

import { prisma } from '@/lib/prisma'
import { CountyLaunchStatus } from '@prisma/client'
import type {
  LaunchResult,
  CreateLaunchCountyInput,
  CityConfiguration,
  PlacesIngestionSummary,
  AdminVerificationResult,
  LaunchProgress,
} from './types'
import {
  LaunchPhase,
  getCurrentPhase,
  getNextPhase,
  isValidStatusTransition,
} from './types'
import { logLaunchAction } from './audit'

/**
 * ERROR RESPONSES
 */
export const PhaseErrors = {
  COUNTY_NOT_FOUND: { error: 'County not found', status: 404 },
  PHASE_NOT_COMPLETE: { error: 'Previous phase not complete', status: 400 },
  INVALID_TRANSITION: { error: 'Invalid status transition', status: 400 },
  DOMAIN_ALREADY_MAPPED: { error: 'Domain is already mapped to a county', status: 409 },
  SLUG_ALREADY_EXISTS: { error: 'County with this slug already exists', status: 409 },
  NO_CITIES_CONFIGURED: { error: 'No cities configured for this county', status: 400 },
  CITIES_ALREADY_FROZEN: { error: 'City list is already frozen', status: 400 },
  INSUFFICIENT_CITIES: { error: 'At least 5 cities are required', status: 400 },
} as const

/**
 * PHASE 1: Domain & County Bootstrap
 * Create a new county with its primary domain.
 */
export async function executePhase1CreateCounty(
  input: CreateLaunchCountyInput,
  adminId: string
): Promise<LaunchResult<{ countyId: string; domainId: string }>> {
  // Check domain availability
  const existingDomain = await prisma.countyDomain.findUnique({
    where: { domain: input.primaryDomain },
  })

  if (existingDomain) {
    return { success: false, ...PhaseErrors.DOMAIN_ALREADY_MAPPED }
  }

  // Check slug availability
  const existingCounty = await prisma.county.findUnique({
    where: { slug: input.slug },
  })

  if (existingCounty) {
    return { success: false, ...PhaseErrors.SLUG_ALREADY_EXISTS }
  }

  // Create county and domain in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create county in DRAFT status
    const county = await tx.county.create({
      data: {
        name: input.name,
        state: input.state.toUpperCase(),
        slug: input.slug.toLowerCase(),
        launchStatus: 'DRAFT',
        isActive: true,
        boundaryGeometry: input.boundaryGeometry || undefined,
        googlePlacesConfig: input.googlePlacesConfig || undefined,
      },
    })

    // Create primary domain mapping
    const domain = await tx.countyDomain.create({
      data: {
        domain: input.primaryDomain.toLowerCase(),
        countyId: county.id,
        isPrimary: true,
        isActive: false, // Not active until LIVE_SOFT
      },
    })

    return { county, domain }
  })

  // Log the action
  await logLaunchAction({
    countyId: result.county.id,
    phase: LaunchPhase.PHASE_1,
    action: 'COUNTY_CREATED',
    status: 'SUCCESS',
    adminId,
    metadata: {
      name: result.county.name,
      slug: result.county.slug,
      primaryDomain: input.primaryDomain,
    },
  })

  await logLaunchAction({
    countyId: result.county.id,
    phase: LaunchPhase.PHASE_1,
    action: 'DOMAIN_PROVISIONED',
    status: 'SUCCESS',
    adminId,
    metadata: {
      domain: input.primaryDomain,
    },
  })

  return {
    success: true,
    data: {
      countyId: result.county.id,
      domainId: result.domain.id,
    },
  }
}

/**
 * PHASE 2: City Scope Configuration
 * Configure the approved municipality list (~15 cities).
 */
export async function executePhase2ConfigureCities(
  countyId: string,
  cities: CityConfiguration[],
  adminId: string
): Promise<LaunchResult<{ cityCount: number }>> {
  // Validate county exists and is in DRAFT
  const county = await prisma.county.findUnique({
    where: { id: countyId },
  })

  if (!county) {
    return { success: false, ...PhaseErrors.COUNTY_NOT_FOUND }
  }

  if (county.citiesConfigured) {
    return { success: false, ...PhaseErrors.CITIES_ALREADY_FROZEN }
  }

  // Require at least 5 cities
  if (cities.length < 5) {
    return { success: false, ...PhaseErrors.INSUFFICIENT_CITIES }
  }

  // Create all cities in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete any existing cities (during DRAFT only)
    await tx.city.deleteMany({
      where: { countyId },
    })

    // Create new cities
    for (const city of cities) {
      await tx.city.create({
        data: {
          countyId,
          name: city.name,
          slug: city.slug.toLowerCase(),
          displayOrder: city.displayOrder,
          isActive: true,
        },
      })
    }

    // Mark cities as configured (frozen)
    await tx.county.update({
      where: { id: countyId },
      data: { citiesConfigured: true },
    })
  })

  // Log the action
  await logLaunchAction({
    countyId,
    phase: LaunchPhase.PHASE_2,
    action: 'CITIES_CONFIGURED',
    status: 'SUCCESS',
    adminId,
    metadata: {
      cityCount: cities.length,
      cities: cities.map(c => c.name),
    },
  })

  await logLaunchAction({
    countyId,
    phase: LaunchPhase.PHASE_2,
    action: 'CITY_LIST_FROZEN',
    status: 'SUCCESS',
    adminId,
    metadata: {},
  })

  return {
    success: true,
    data: { cityCount: cities.length },
  }
}

/**
 * PHASE 3: Google Places Ingestion
 * Record that Places ingestion is complete.
 * (Actual ingestion is handled by separate jobs)
 */
export async function executePhase3MarkIngestionComplete(
  countyId: string,
  summary: PlacesIngestionSummary,
  adminId: string
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
  })

  if (!county) {
    return { success: false, ...PhaseErrors.COUNTY_NOT_FOUND }
  }

  if (!county.citiesConfigured) {
    return { success: false, ...PhaseErrors.PHASE_NOT_COMPLETE }
  }

  // Mark ingestion complete
  await prisma.county.update({
    where: { id: countyId },
    data: { placesIngested: true },
  })

  // Log the action
  await logLaunchAction({
    countyId,
    phase: LaunchPhase.PHASE_3,
    action: 'PLACES_INGESTION_COMPLETED',
    status: 'SUCCESS',
    adminId,
    metadata: summary,
  })

  return { success: true, data: undefined }
}

/**
 * PHASE 4: Governance & Quality Pass
 * Record that admin verification is complete.
 */
export async function executePhase4MarkVerificationComplete(
  countyId: string,
  result: AdminVerificationResult,
  adminId: string
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
  })

  if (!county) {
    return { success: false, ...PhaseErrors.COUNTY_NOT_FOUND }
  }

  if (!county.placesIngested) {
    return { success: false, ...PhaseErrors.PHASE_NOT_COMPLETE }
  }

  // Mark verification complete
  await prisma.county.update({
    where: { id: countyId },
    data: { adminVerified: true },
  })

  // Log the action
  await logLaunchAction({
    countyId,
    phase: LaunchPhase.PHASE_4,
    action: 'ADMIN_VERIFICATION_COMPLETED',
    status: 'SUCCESS',
    adminId,
    metadata: result,
  })

  return { success: true, data: undefined }
}

/**
 * PHASE 5: Soft Launch
 * Transition county status to LIVE_SOFT.
 */
export async function executePhase5SoftLaunch(
  countyId: string,
  adminId: string
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
  })

  if (!county) {
    return { success: false, ...PhaseErrors.COUNTY_NOT_FOUND }
  }

  // Check all prerequisites
  if (!county.adminVerified) {
    return { success: false, ...PhaseErrors.PHASE_NOT_COMPLETE }
  }

  // Validate transition
  if (!isValidStatusTransition(county.launchStatus, 'LIVE_SOFT')) {
    return { success: false, ...PhaseErrors.INVALID_TRANSITION }
  }

  // Transition to LIVE_SOFT and activate domain
  await prisma.$transaction(async (tx) => {
    await tx.county.update({
      where: { id: countyId },
      data: { launchStatus: 'LIVE_SOFT' },
    })

    // Activate primary domain
    await tx.countyDomain.updateMany({
      where: { countyId, isPrimary: true },
      data: { isActive: true },
    })
  })

  // Log the action
  await logLaunchAction({
    countyId,
    phase: LaunchPhase.PHASE_5,
    action: 'STATUS_CHANGED_TO_LIVE_SOFT',
    status: 'SUCCESS',
    adminId,
    metadata: {
      previousStatus: county.launchStatus,
      newStatus: 'LIVE_SOFT',
    },
  })

  return { success: true, data: undefined }
}

/**
 * PHASE 6: Vendor Onboarding
 * Enable vendor claims and founder program.
 */
export async function executePhase6EnableVendorClaims(
  countyId: string,
  adminId: string
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
  })

  if (!county) {
    return { success: false, ...PhaseErrors.COUNTY_NOT_FOUND }
  }

  if (county.launchStatus !== 'LIVE_SOFT') {
    return { success: false, ...PhaseErrors.PHASE_NOT_COMPLETE }
  }

  // Enable vendor claims
  await prisma.county.update({
    where: { id: countyId },
    data: { vendorClaimsEnabled: true },
  })

  // Log the action
  await logLaunchAction({
    countyId,
    phase: LaunchPhase.PHASE_6,
    action: 'VENDOR_CLAIMS_ENABLED',
    status: 'SUCCESS',
    adminId,
    metadata: {},
  })

  await logLaunchAction({
    countyId,
    phase: LaunchPhase.PHASE_6,
    action: 'FOUNDER_PROGRAM_ENABLED',
    status: 'SUCCESS',
    adminId,
    metadata: {},
  })

  return { success: true, data: undefined }
}

/**
 * PHASE 7: Full Public Launch
 * Transition county status to LIVE_PUBLIC.
 */
export async function executePhase7PublicLaunch(
  countyId: string,
  adminId: string
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
  })

  if (!county) {
    return { success: false, ...PhaseErrors.COUNTY_NOT_FOUND }
  }

  // Check all prerequisites
  if (!county.vendorClaimsEnabled) {
    return { success: false, ...PhaseErrors.PHASE_NOT_COMPLETE }
  }

  // Validate transition
  if (!isValidStatusTransition(county.launchStatus, 'LIVE_PUBLIC')) {
    return { success: false, ...PhaseErrors.INVALID_TRANSITION }
  }

  // Transition to LIVE_PUBLIC
  await prisma.county.update({
    where: { id: countyId },
    data: {
      launchStatus: 'LIVE_PUBLIC',
      featuredContentEnabled: true,
    },
  })

  // Log the actions
  await logLaunchAction({
    countyId,
    phase: LaunchPhase.PHASE_7,
    action: 'STATUS_CHANGED_TO_LIVE_PUBLIC',
    status: 'SUCCESS',
    adminId,
    metadata: {
      previousStatus: county.launchStatus,
      newStatus: 'LIVE_PUBLIC',
    },
  })

  await logLaunchAction({
    countyId,
    phase: LaunchPhase.PHASE_7,
    action: 'FEATURED_CONTENT_ENABLED',
    status: 'SUCCESS',
    adminId,
    metadata: {},
  })

  return { success: true, data: undefined }
}

/**
 * Get the current launch progress for a county.
 */
export async function getLaunchProgress(
  countyId: string
): Promise<LaunchResult<LaunchProgress>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    include: {
      _count: {
        select: {
          cities: true,
          businesses: true,
          domains: true,
        },
      },
    },
  })

  if (!county) {
    return { success: false, ...PhaseErrors.COUNTY_NOT_FOUND }
  }

  const flags = {
    citiesConfigured: county.citiesConfigured,
    placesIngested: county.placesIngested,
    adminVerified: county.adminVerified,
    vendorClaimsEnabled: county.vendorClaimsEnabled,
    featuredContentEnabled: county.featuredContentEnabled,
  }

  const currentPhase = getCurrentPhase(flags, county.launchStatus)
  const nextPhase = getNextPhase(currentPhase)

  // Determine completed phases
  const phasesCompleted: LaunchPhase[] = []
  if (county.citiesConfigured) {
    phasesCompleted.push(LaunchPhase.PHASE_1, LaunchPhase.PHASE_2)
  }
  if (county.placesIngested) {
    phasesCompleted.push(LaunchPhase.PHASE_3)
  }
  if (county.adminVerified) {
    phasesCompleted.push(LaunchPhase.PHASE_4)
  }
  if (county.launchStatus === 'LIVE_SOFT' || county.launchStatus === 'LIVE_PUBLIC') {
    phasesCompleted.push(LaunchPhase.PHASE_5)
  }
  if (county.vendorClaimsEnabled) {
    phasesCompleted.push(LaunchPhase.PHASE_6)
  }
  if (county.launchStatus === 'LIVE_PUBLIC') {
    phasesCompleted.push(LaunchPhase.PHASE_7)
  }

  return {
    success: true,
    data: {
      countyId: county.id,
      countyName: county.name,
      currentStatus: county.launchStatus,
      currentPhase,
      phasesCompleted,
      nextPhase,
      flags,
      cityCount: county._count.cities,
      businessCount: county._count.businesses,
      domainCount: county._count.domains,
    },
  }
}

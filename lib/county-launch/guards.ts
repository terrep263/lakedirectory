/**
 * NEW COUNTY LAUNCH PLAYBOOK
 * Launch Operation Guards
 *
 * These guards enforce the launch playbook rules.
 * All guards are HARD FAIL - no silent failures permitted.
 */

import { prisma } from '@/lib/prisma'
import { CountyLaunchStatus } from '@prisma/client'
import type { LaunchResult, LaunchPhase } from './types'
import { isValidStatusTransition } from './types'

/**
 * ERROR RESPONSES
 */
export const LaunchGuardErrors = {
  COUNTY_NOT_FOUND: { error: 'County not found', status: 404 },
  COUNTY_NOT_IN_DRAFT: { error: 'County is not in DRAFT status', status: 400 },
  COUNTY_NOT_LIVE: { error: 'County is not live', status: 400 },
  VENDOR_CLAIMS_DISABLED: { error: 'Vendor claims are not enabled for this county', status: 403 },
  FEATURED_CONTENT_DISABLED: { error: 'Featured content is not enabled for this county', status: 403 },
  CITIES_NOT_CONFIGURED: { error: 'Cities are not configured for this county', status: 400 },
  PLACES_NOT_INGESTED: { error: 'Places have not been ingested for this county', status: 400 },
  ADMIN_NOT_VERIFIED: { error: 'Admin verification is not complete for this county', status: 400 },
  INVALID_STATUS_TRANSITION: { error: 'Invalid status transition', status: 400 },
  FORBIDDEN_CROSS_COUNTY: { error: 'Cross-county operations are forbidden', status: 403 },
} as const

/**
 * Guard: Require county to be in DRAFT status.
 * Used for Phase 1-4 operations.
 */
export async function requireDraftStatus(
  countyId: string
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    select: { launchStatus: true },
  })

  if (!county) {
    return { success: false, ...LaunchGuardErrors.COUNTY_NOT_FOUND }
  }

  if (county.launchStatus !== 'DRAFT') {
    return { success: false, ...LaunchGuardErrors.COUNTY_NOT_IN_DRAFT }
  }

  return { success: true, data: undefined }
}

/**
 * Guard: Require county to be live (LIVE_SOFT or LIVE_PUBLIC).
 * Used for operations that require public visibility.
 */
export async function requireLiveStatus(
  countyId: string
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    select: { launchStatus: true },
  })

  if (!county) {
    return { success: false, ...LaunchGuardErrors.COUNTY_NOT_FOUND }
  }

  if (county.launchStatus === 'DRAFT') {
    return { success: false, ...LaunchGuardErrors.COUNTY_NOT_LIVE }
  }

  return { success: true, data: undefined }
}

/**
 * Guard: Require vendor claims to be enabled.
 * Used for business claim and deal creation operations.
 */
export async function requireVendorClaimsEnabled(
  countyId: string
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    select: { vendorClaimsEnabled: true },
  })

  if (!county) {
    return { success: false, ...LaunchGuardErrors.COUNTY_NOT_FOUND }
  }

  if (!county.vendorClaimsEnabled) {
    return { success: false, ...LaunchGuardErrors.VENDOR_CLAIMS_DISABLED }
  }

  return { success: true, data: undefined }
}

/**
 * Guard: Require featured content to be enabled.
 * Used for featured businesses and deals.
 */
export async function requireFeaturedContentEnabled(
  countyId: string
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    select: { featuredContentEnabled: true },
  })

  if (!county) {
    return { success: false, ...LaunchGuardErrors.COUNTY_NOT_FOUND }
  }

  if (!county.featuredContentEnabled) {
    return { success: false, ...LaunchGuardErrors.FEATURED_CONTENT_DISABLED }
  }

  return { success: true, data: undefined }
}

/**
 * Guard: Require cities to be configured.
 * Used for Phase 3+ operations.
 */
export async function requireCitiesConfigured(
  countyId: string
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    select: { citiesConfigured: true },
  })

  if (!county) {
    return { success: false, ...LaunchGuardErrors.COUNTY_NOT_FOUND }
  }

  if (!county.citiesConfigured) {
    return { success: false, ...LaunchGuardErrors.CITIES_NOT_CONFIGURED }
  }

  return { success: true, data: undefined }
}

/**
 * Guard: Require places to be ingested.
 * Used for Phase 4+ operations.
 */
export async function requirePlacesIngested(
  countyId: string
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    select: { placesIngested: true },
  })

  if (!county) {
    return { success: false, ...LaunchGuardErrors.COUNTY_NOT_FOUND }
  }

  if (!county.placesIngested) {
    return { success: false, ...LaunchGuardErrors.PLACES_NOT_INGESTED }
  }

  return { success: true, data: undefined }
}

/**
 * Guard: Require admin verification to be complete.
 * Used for Phase 5+ operations.
 */
export async function requireAdminVerified(
  countyId: string
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    select: { adminVerified: true },
  })

  if (!county) {
    return { success: false, ...LaunchGuardErrors.COUNTY_NOT_FOUND }
  }

  if (!county.adminVerified) {
    return { success: false, ...LaunchGuardErrors.ADMIN_NOT_VERIFIED }
  }

  return { success: true, data: undefined }
}

/**
 * Guard: Validate status transition.
 */
export async function validateStatusTransition(
  countyId: string,
  targetStatus: CountyLaunchStatus
): Promise<LaunchResult<void>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    select: { launchStatus: true },
  })

  if (!county) {
    return { success: false, ...LaunchGuardErrors.COUNTY_NOT_FOUND }
  }

  if (!isValidStatusTransition(county.launchStatus, targetStatus)) {
    return { success: false, ...LaunchGuardErrors.INVALID_STATUS_TRANSITION }
  }

  return { success: true, data: undefined }
}

/**
 * Guard: Check if a county can perform operations based on launch status.
 * Returns the current launch status and enabled features.
 */
export async function getCountyLaunchCapabilities(
  countyId: string
): Promise<LaunchResult<{
  launchStatus: CountyLaunchStatus
  isLive: boolean
  canAcceptVendorClaims: boolean
  canShowFeaturedContent: boolean
  canBrowseDirectory: boolean
}>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
    select: {
      launchStatus: true,
      vendorClaimsEnabled: true,
      featuredContentEnabled: true,
    },
  })

  if (!county) {
    return { success: false, ...LaunchGuardErrors.COUNTY_NOT_FOUND }
  }

  const isLive = county.launchStatus !== 'DRAFT'

  return {
    success: true,
    data: {
      launchStatus: county.launchStatus,
      isLive,
      canAcceptVendorClaims: county.vendorClaimsEnabled,
      canShowFeaturedContent: county.featuredContentEnabled,
      canBrowseDirectory: isLive,
    },
  }
}

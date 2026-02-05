/**
 * NEW COUNTY LAUNCH PLAYBOOK
 * Type definitions for county launch process.
 *
 * CORE LAUNCH LAW:
 * Launching a new county is configuration and ingestion — never modification of existing counties.
 * No data crosses counties.
 * No shared state is introduced.
 * No global assumptions are allowed.
 */

import { CountyLaunchStatus } from '@prisma/client'

export { CountyLaunchStatus }

/**
 * Launch phases as defined in the playbook.
 */
export enum LaunchPhase {
  PHASE_0 = 'PHASE_0', // Preconditions
  PHASE_1 = 'PHASE_1', // Domain & County Bootstrap
  PHASE_2 = 'PHASE_2', // City Scope Configuration
  PHASE_3 = 'PHASE_3', // Google Places Ingestion
  PHASE_4 = 'PHASE_4', // Governance & Quality Pass
  PHASE_5 = 'PHASE_5', // Soft Launch
  PHASE_6 = 'PHASE_6', // Vendor Onboarding
  PHASE_7 = 'PHASE_7', // Full Public Launch
}

/**
 * Launch actions that can be logged.
 */
export type LaunchAction =
  // Phase 0
  | 'PRECONDITIONS_CHECKED'
  // Phase 1
  | 'DOMAIN_PROVISIONED'
  | 'COUNTY_CREATED'
  // Phase 2
  | 'CITIES_CONFIGURED'
  | 'CITY_LIST_FROZEN'
  // Phase 3
  | 'PLACES_INGESTION_STARTED'
  | 'PLACES_INGESTION_COMPLETED'
  | 'BUSINESS_NORMALIZATION_COMPLETED'
  // Phase 4
  | 'ADMIN_VERIFICATION_STARTED'
  | 'ADMIN_VERIFICATION_COMPLETED'
  | 'AUTOMATION_RULES_ENABLED'
  // Phase 5
  | 'STATUS_CHANGED_TO_LIVE_SOFT'
  // Phase 6
  | 'VENDOR_CLAIMS_ENABLED'
  | 'FOUNDER_PROGRAM_ENABLED'
  // Phase 7
  | 'STATUS_CHANGED_TO_LIVE_PUBLIC'
  | 'FEATURED_CONTENT_ENABLED'

/**
 * Launch log status.
 */
export type LaunchLogStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED'

/**
 * Precondition check result.
 */
export interface PreconditionResult {
  name: string
  passed: boolean
  message: string
}

/**
 * All preconditions check result.
 */
export interface PreconditionsCheckResult {
  allPassed: boolean
  preconditions: PreconditionResult[]
}

/**
 * City configuration for Phase 2.
 */
export interface CityConfiguration {
  name: string
  slug: string
  displayOrder: number
}

/**
 * Places ingestion summary for Phase 3.
 */
export interface PlacesIngestionSummary {
  totalQueried: number
  accepted: number
  rejected: number
  byCity: Record<string, { accepted: number; rejected: number }>
  rejectionReasons: Record<string, number>
}

/**
 * Admin verification result for Phase 4.
 */
export interface AdminVerificationResult {
  totalBusinesses: number
  verified: number
  removed: number
  categoryChanges: number
  cityDistribution: Record<string, number>
}

/**
 * Launch progress summary.
 */
export interface LaunchProgress {
  countyId: string
  countyName: string
  currentStatus: CountyLaunchStatus
  currentPhase: LaunchPhase
  phasesCompleted: LaunchPhase[]
  nextPhase: LaunchPhase | null
  flags: {
    citiesConfigured: boolean
    placesIngested: boolean
    adminVerified: boolean
    vendorClaimsEnabled: boolean
    featuredContentEnabled: boolean
  }
  cityCount: number
  businessCount: number
  domainCount: number
}

/**
 * County creation input for Phase 1.
 */
export interface CreateLaunchCountyInput {
  name: string
  state: string
  slug: string
  primaryDomain: string
  boundaryGeometry?: unknown
  googlePlacesConfig?: unknown
}

/**
 * Phase transition validation result.
 */
export interface PhaseTransitionResult {
  allowed: boolean
  fromPhase: LaunchPhase
  toPhase: LaunchPhase
  blockers: string[]
}

/**
 * Result type for launch operations.
 */
export type LaunchResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number }

/**
 * Valid status transitions.
 * Status can only move forward, never backward.
 */
export const VALID_STATUS_TRANSITIONS: Record<CountyLaunchStatus, CountyLaunchStatus[]> = {
  DRAFT: ['LIVE_SOFT'],
  LIVE_SOFT: ['LIVE_PUBLIC'],
  LIVE_PUBLIC: [], // Terminal state
}

/**
 * Phase requirements for status transitions.
 */
export const STATUS_TRANSITION_REQUIREMENTS: Record<CountyLaunchStatus, LaunchPhase[]> = {
  DRAFT: [], // Initial state, no requirements
  LIVE_SOFT: [
    LaunchPhase.PHASE_0,
    LaunchPhase.PHASE_1,
    LaunchPhase.PHASE_2,
    LaunchPhase.PHASE_3,
    LaunchPhase.PHASE_4,
  ],
  LIVE_PUBLIC: [
    LaunchPhase.PHASE_0,
    LaunchPhase.PHASE_1,
    LaunchPhase.PHASE_2,
    LaunchPhase.PHASE_3,
    LaunchPhase.PHASE_4,
    LaunchPhase.PHASE_5,
    LaunchPhase.PHASE_6,
  ],
}

/**
 * Forbidden actions during launch (HARD FAIL).
 */
export const FORBIDDEN_LAUNCH_ACTIONS = [
  'Copying data from another county',
  'Sharing vendors across counties',
  'Sharing analytics dashboards',
  'Comparing counties operationally',
  'Enabling global discovery',
  'Skipping soft launch',
] as const

/**
 * Check if a status transition is valid.
 */
export function isValidStatusTransition(
  from: CountyLaunchStatus,
  to: CountyLaunchStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Get the current phase based on county flags.
 */
export function getCurrentPhase(flags: {
  citiesConfigured: boolean
  placesIngested: boolean
  adminVerified: boolean
  vendorClaimsEnabled: boolean
  featuredContentEnabled: boolean
}, status: CountyLaunchStatus): LaunchPhase {
  if (status === 'LIVE_PUBLIC') return LaunchPhase.PHASE_7
  if (flags.vendorClaimsEnabled) return LaunchPhase.PHASE_6
  if (status === 'LIVE_SOFT') return LaunchPhase.PHASE_5
  if (flags.adminVerified) return LaunchPhase.PHASE_4
  if (flags.placesIngested) return LaunchPhase.PHASE_3
  if (flags.citiesConfigured) return LaunchPhase.PHASE_2
  return LaunchPhase.PHASE_1
}

/**
 * Get the next phase after the current one.
 */
export function getNextPhase(currentPhase: LaunchPhase): LaunchPhase | null {
  const phases = Object.values(LaunchPhase)
  const currentIndex = phases.indexOf(currentPhase)
  if (currentIndex === -1 || currentIndex >= phases.length - 1) return null
  return phases[currentIndex + 1]
}

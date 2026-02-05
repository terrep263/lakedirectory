/**
 * NEW COUNTY LAUNCH PLAYBOOK
 * Barrel Export
 *
 * This module implements the New County Launch Playbook.
 *
 * CORE LAUNCH LAW (AUTHORITATIVE):
 * Launching a new county is configuration and ingestion — never modification of existing counties.
 * No data crosses counties.
 * No shared state is introduced.
 * No global assumptions are allowed.
 *
 * PHASES:
 * Phase 0: Preconditions (HARD GATES)
 * Phase 1: Domain & County Bootstrap
 * Phase 2: City Scope Configuration
 * Phase 3: Google Places Ingestion
 * Phase 4: Governance & Quality Pass
 * Phase 5: Soft Launch (DRAFT → LIVE_SOFT)
 * Phase 6: Vendor Onboarding
 * Phase 7: Full Public Launch (LIVE_SOFT → LIVE_PUBLIC)
 *
 * FORBIDDEN ACTIONS (HARD FAIL):
 * - Copying data from another county
 * - Sharing vendors across counties
 * - Sharing analytics dashboards
 * - Comparing counties operationally
 * - Enabling global discovery
 * - Skipping soft launch
 */

// Types
export {
  CountyLaunchStatus,
  LaunchPhase,
  type LaunchAction,
  type LaunchLogStatus,
  type PreconditionResult,
  type PreconditionsCheckResult,
  type CityConfiguration,
  type PlacesIngestionSummary,
  type AdminVerificationResult,
  type LaunchProgress,
  type CreateLaunchCountyInput,
  type PhaseTransitionResult,
  type LaunchResult,
  VALID_STATUS_TRANSITIONS,
  STATUS_TRANSITION_REQUIREMENTS,
  FORBIDDEN_LAUNCH_ACTIONS,
  isValidStatusTransition,
  getCurrentPhase,
  getNextPhase,
} from './types'

// Preconditions (Phase 0)
export {
  checkAllPreconditions,
  validatePreconditionsOrAbort,
  PreconditionErrors,
} from './preconditions'

// Phase Execution
export {
  executePhase1CreateCounty,
  executePhase2ConfigureCities,
  executePhase3MarkIngestionComplete,
  executePhase4MarkVerificationComplete,
  executePhase5SoftLaunch,
  executePhase6EnableVendorClaims,
  executePhase7PublicLaunch,
  getLaunchProgress,
  PhaseErrors,
} from './phases'

// Audit & Tracking
export {
  logLaunchAction,
  getLaunchLogs,
  getLaunchLogsByPhase,
  hasCompletedAction,
  getMostRecentLog,
  getCompletedPhasesSummary,
  type LogLaunchActionInput,
  type LaunchLogEntry,
} from './audit'

// Guards
export {
  requireDraftStatus,
  requireLiveStatus,
  requireVendorClaimsEnabled,
  requireFeaturedContentEnabled,
  requireCitiesConfigured,
  requirePlacesIngested,
  requireAdminVerified,
  validateStatusTransition,
  getCountyLaunchCapabilities,
  LaunchGuardErrors,
} from './guards'

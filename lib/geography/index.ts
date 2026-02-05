/**
 * GEOGRAPHIC CONTEXT & DISCOVERY BOUNDARY MODULE
 * Barrel Export
 *
 * This module enforces county-locked geographic context for all discovery operations.
 *
 * CORE PRINCIPLES:
 * 1. County is resolved from domain ONLY (invisible pre-context)
 * 2. Cities are human-anchored municipalities (~15 per county)
 * 3. Intent interpretation is ILLEGAL without county context
 * 4. Google Places ingestion is strictly city-scoped
 *
 * NO CROSS-COUNTY OPERATIONS ARE PERMITTED.
 */

// Types
export type {
  CountyGeoContext,
  CityContext,
  CountyDomainMapping,
  DiscoveryInput,
  InterpretedIntent,
  PlacesIngestionContext,
  PlaceIngestionResult,
  GeoResult,
} from './types'

export {
  isValidCitySlug,
  normalizeDomain,
  extractDomain,
  INTENT_FILLER_WORDS,
  DEAL_INTENT_KEYWORDS,
} from './types'

// Domain Resolution
export {
  resolveCountyFromDomain,
  resolveCountyById,
  listCountyDomains,
  getPrimaryDomain,
  DomainResolutionErrors,
} from './domain-resolution'

// City Guards
export {
  resolveCityById,
  resolveCityBySlug,
  listCountyCities,
  validateCitySelection,
  canAddCity,
  validateCityForBusiness,
  geoFailure,
  CityErrors,
  MAX_CITIES_PER_COUNTY,
} from './city-guards'

// Intent Interpretation
export {
  interpretIntent,
  getCategorySuggestions,
  canInterpretIntent,
  IntentErrors,
  PLATFORM_CATEGORIES,
  type PlatformCategory,
} from './intent-interpretation'

// Places Ingestion
export {
  validateIngestionContext,
  validatePlaceCity,
  placeExistsInCounty,
  createIngestionContext,
  filterIngestionCities,
  buildPlacesSearchQuery,
  summarizeIngestionResults,
  PlacesIngestionErrors,
  type PlaceRejectReason,
  type GooglePlaceData,
} from './places-ingestion'

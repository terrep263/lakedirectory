export type { DealGuardResult, DealSubmission } from './types'
export { validateEligibility, normalizePriceCategory } from './rules'
export { validatePriceCap } from './price-caps'
export { scoreQuality, generateRewrite } from './ai'
export { evaluateDeal, logGuardDecision, checkVendorCompliance, mapDealFieldsToSubmission } from './engine'
export { generateSeoDealFromBrief, validateBriefText } from './brief'


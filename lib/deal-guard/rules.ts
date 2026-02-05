import type { DealSubmission } from './types'

// Mirrors the Mocha Deal Guard prompt rules (deterministic checks)

const MISLEADING_PATTERNS: RegExp[] = [
  /act now/i,
  /limited time only/i,
  /while supplies last/i,
  /don't miss out/i,
  /\bhurry\b/i,
  /once in a lifetime/i,
]

const VAGUE_PRICE_PATTERNS: RegExp[] = [
  /\bup to\b/i,
  /\bas low as\b/i,
  /\bstarting at\b/i,
  /\bfrom\s*\$/i,
  /\bvaries\b/i,
]

export function validateEligibility(deal: DealSubmission): string[] {
  const violations: string[] = []

  if (!deal.title || deal.title.trim().length < 10) {
    violations.push('Title must be at least 10 characters')
  }

  if (!deal.description || deal.description.trim().length < 50) {
    violations.push('Description must be at least 50 characters')
  }

  if (!Number.isFinite(deal.price) || deal.price <= 0) {
    violations.push('Price must be greater than $0')
  }

  if (!deal.redemptionTerms || deal.redemptionTerms.trim().length < 20) {
    violations.push('Redemption terms must be clear (minimum 20 characters)')
  }

  if (!deal.expirationDate && !deal.voucherLimit) {
    violations.push('Deal must have expiration date OR voucher limit')
  }

  if (MISLEADING_PATTERNS.some((p) => p.test(deal.title) || p.test(deal.description))) {
    violations.push("Remove fake urgency language ('Act Now', 'Limited Time Only', etc.)")
  }

  if (VAGUE_PRICE_PATTERNS.some((p) => p.test(deal.title) || p.test(deal.description))) {
    violations.push("Pricing must be specific - remove 'up to', 'starting at', vague ranges")
  }

  return violations
}

export function normalizePriceCategory(category: string | null | undefined): string {
  const raw = (category || 'other').trim().toLowerCase()
  if (!raw) return 'other'

  // Common mappings (safe, conservative)
  if (raw.includes('restaurant') || raw.includes('food') || raw.includes('dining')) return 'restaurant'
  if (raw.includes('auto') || raw.includes('car') || raw.includes('repair')) return 'auto'
  if (raw.includes('beauty') || raw.includes('salon') || raw.includes('spa')) return 'beauty'
  if (raw.includes('fitness') || raw.includes('gym') || raw.includes('training')) return 'fitness'
  if (raw.includes('entertainment') || raw.includes('event') || raw.includes('activity')) return 'entertainment'
  if (raw.includes('retail') || raw.includes('shop')) return 'retail'
  if (raw.includes('service') || raw.includes('professional')) return 'services'

  return raw
}


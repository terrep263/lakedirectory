import { NextRequest, NextResponse } from 'next/server'

/**
 * Copy Validation Guardrails
 * 
 * Purpose: Enforce copy quality standards for customer-facing deal text
 * 
 * Scope:
 * - Validates deal copy before publication
 * - Rejects or flags prohibited content patterns
 * - Returns deterministic pass/fail results
 * - No coaching language or performance claims
 * 
 * This is an ENFORCEMENT layer (not advisory)
 * - Returns validation results (pass/fail)
 * - Flags specific violations neutrally
 * - Does not provide suggestions or optimization advice
 */

interface CopyValidationRequest {
  dealDescription: string
  vendorName?: string
}

interface ValidationFlag {
  category: 'REJECT' | 'FLAG'
  rule: string
  matched: string
  position: number
}

interface CopyValidationResponse {
  valid: boolean
  flags: ValidationFlag[]
  message: string
}

// Prohibited patterns that trigger REJECT
const REJECT_PATTERNS = [
  // Guarantees
  {
    rule: 'GUARANTEE_LANGUAGE',
    pattern: /\b(guarantee|guaranteed|promise|promises|assured|100% certain|definitely will|will definitely)\b/i,
    description: 'Guarantee language prohibited'
  },
  // Exaggerated value claims
  {
    rule: 'EXAGGERATED_VALUE',
    pattern: /\b(best deal ever|unbeatable|once in a lifetime|incredible|amazing deal|insane|crazy deal|steal|too good to be true)\b/i,
    description: 'Exaggerated value claim'
  },
  // Artificial urgency
  {
    rule: 'ARTIFICIAL_URGENCY',
    pattern: /\b(act now|hurry|rush|don't miss out|going fast|almost gone|last chance|limited time only|today only)\b/i,
    description: 'Artificial urgency language'
  },
  // Vendor hardship/internal motivations
  {
    rule: 'VENDOR_HARDSHIP',
    pattern: /\b(slow period|slow season|slow time|need customers|make up for|offset|cover (our )?costs?|cover (our )?rent|cover (our )?overhead|break even|financial|struggling|difficult time)\b/i,
    description: 'References vendor hardship or internal motivations'
  },
  // Operational constraints
  {
    rule: 'OPERATIONAL_CONSTRAINTS',
    pattern: /\b(fill seats|fill tables|empty tables?|idle|not busy|under-?utilized|extra capacity|staffing|employee|keep staff busy)\b/i,
    description: 'References operational constraints or capacity'
  }
]

// Patterns that trigger FLAG (warning but not rejection)
const FLAG_PATTERNS = [
  {
    rule: 'WEAK_VALUE_FRAMING',
    pattern: /\b(cheap|cheapest|discount|discounted|sale|on sale)\b/i,
    description: 'Weak value framing (price-focused rather than value-focused)'
  },
  {
    rule: 'PASSIVE_VOICE',
    pattern: /\b(is offered|are offered|can be redeemed|will be provided)\b/i,
    description: 'Passive voice construction'
  }
]

// Allowed patterns (customer-centric, desire-driven, time-bound)
const ALLOWED_PATTERNS = {
  desire: /\b(start your|treat yourself|enjoy|experience|savor|indulge|discover|perfect for|ideal for)\b/i,
  convenience: /\b(convenient|easy|simple|hassle-free|save time|flexible)\b/i,
  timing: /\b(early bird|morning|evening|weekend|seasonal|spring|summer|fall|winter)\b/i,
  value: /\b(save \d+%|value|worth|premium|quality|authentic|genuine)\b/i,
  timebound: /\b(valid|expires|available|redeemable|good for)\b/i
}

function validateCopy(request: CopyValidationRequest): CopyValidationResponse {
  const { dealDescription } = request
  const flags: ValidationFlag[] = []

  // Check for REJECT patterns
  for (const { rule, pattern, description } of REJECT_PATTERNS) {
    const match = dealDescription.match(pattern)
    if (match) {
      flags.push({
        category: 'REJECT',
        rule,
        matched: match[0],
        position: match.index || 0
      })
    }
  }

  // Check for FLAG patterns
  for (const { rule, pattern, description } of FLAG_PATTERNS) {
    const match = dealDescription.match(pattern)
    if (match) {
      flags.push({
        category: 'FLAG',
        rule,
        matched: match[0],
        position: match.index || 0
      })
    }
  }

  // Determine validity
  const hasRejections = flags.some(f => f.category === 'REJECT')
  const valid = !hasRejections

  // Build neutral message
  let message = ''
  if (valid) {
    if (flags.length === 0) {
      message = 'Copy validation passed. No violations detected.'
    } else {
      message = `Copy validation passed with ${flags.length} flagged pattern(s). Review recommended.`
    }
  } else {
    const rejectionCount = flags.filter(f => f.category === 'REJECT').length
    message = `Copy validation failed. ${rejectionCount} prohibited pattern(s) detected.`
  }

  return {
    valid,
    flags,
    message
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.dealDescription || typeof body.dealDescription !== 'string') {
      return NextResponse.json(
        { error: 'dealDescription is required and must be a string' },
        { status: 400 }
      )
    }

    if (body.dealDescription.trim().length === 0) {
      return NextResponse.json(
        { error: 'dealDescription cannot be empty' },
        { status: 400 }
      )
    }

    const result = validateCopy(body)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Copy validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error during copy validation' },
      { status: 500 }
    )
  }
}

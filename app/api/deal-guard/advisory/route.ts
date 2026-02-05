import { NextRequest, NextResponse } from 'next/server'

/**
 * Deal Guard Advisory Engine
 * 
 * Purpose: Provide non-authoritative deal quality feedback to vendors
 * 
 * Scope:
 * - Analyzes vendor draft copy for quality and market fit
 * - Returns: (1) suggested rewrite example, (2) clarity/persuasion scores, (3) neutral explanations
 * - Tone: Senior advertising executive - analytical, observational, never directive
 * - Strictly advisory (no database writes, no blocking, no guarantees)
 * - Does NOT touch vouchers, validations, or redemptions
 * - Does NOT instruct vendors what actions to take
 * - Does NOT guarantee outcomes or block voucher issuance
 * 
 * Critical Enforcement:
 * - Detects vendor operational weakness language (slow periods, staffing, idle capacity)
 * - Ensures customer-perspective framing (desire, convenience, timing, value)
 * - Prevents customer-facing copy that references vendor internal concerns
 * 
 * Authentication: Optional (can be used by vendors or during onboarding)
 * 
 * Advisory Status: All outputs are optional and advisory only
 */

interface DealDraftInput {
  vendorName: string
  industry: string
  itemOrService: string
  regularPrice: number
  dealPrice: number
  ingredientsOrScope?: string
  vendorCopy?: string
}

interface DealGuardResponse {
  canonicalDescription: string
  accuracyScore: number
  performanceScore: number
  overallScore: number
  explanation: string
  suggestions: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const required = ['vendorName', 'industry', 'itemOrService', 'regularPrice', 'dealPrice']
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Bad Request: ${field} is required` },
          { status: 400 }
        )
      }
    }

    const draft: DealDraftInput = {
      vendorName: body.vendorName,
      industry: body.industry,
      itemOrService: body.itemOrService,
      regularPrice: parseFloat(body.regularPrice),
      dealPrice: parseFloat(body.dealPrice),
      ingredientsOrScope: body.ingredientsOrScope || '',
      vendorCopy: body.vendorCopy || ''
    }

    // Validate pricing logic
    if (draft.dealPrice >= draft.regularPrice) {
      return NextResponse.json(
        { error: 'Bad Request: Deal price must be less than regular price' },
        { status: 400 }
      )
    }

    if (draft.dealPrice <= 0 || draft.regularPrice <= 0) {
      return NextResponse.json(
        { error: 'Bad Request: Prices must be positive numbers' },
        { status: 400 }
      )
    }

    // Generate advisory response
    const advisory = generateDealAdvisory(draft)

    return NextResponse.json({
      success: true,
      advisory
    })
  } catch (error) {
    console.error('Deal Guard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateDealAdvisory(draft: DealDraftInput): DealGuardResponse {
  // Calculate discount metrics
  const discountAmount = draft.regularPrice - draft.dealPrice
  const discountPercent = Math.round((discountAmount / draft.regularPrice) * 100)
  const savings = discountAmount.toFixed(2)

  // Generate canonical description
  const canonicalDescription = buildCanonicalDescription(draft, discountPercent, savings)

  // Calculate scores
  const accuracyScore = calculateAccuracyScore(draft)
  const performanceScore = calculatePerformanceScore(draft, discountPercent)
  const overallScore = Math.round((accuracyScore + performanceScore) / 2)

  // Generate explanation and suggestions
  const explanation = generateExplanation(draft, accuracyScore, performanceScore, discountPercent)
  const suggestions = generateSuggestions(draft, accuracyScore, performanceScore, discountPercent)

  return {
    canonicalDescription,
    accuracyScore,
    performanceScore,
    overallScore,
    explanation,
    suggestions
  }
}

function buildCanonicalDescription(
  draft: DealDraftInput,
  discountPercent: number,
  savings: string
): string {
  const parts: string[] = []

  // Lead with value proposition
  parts.push(`Save ${discountPercent}% on ${draft.itemOrService} at ${draft.vendorName}`)

  // Add industry context if meaningful
  if (draft.industry && !draft.vendorName.toLowerCase().includes(draft.industry.toLowerCase())) {
    parts.push(`This ${draft.industry.toLowerCase()} deal`)
  } else {
    parts.push('This deal')
  }

  // Price anchor
  parts.push(`brings your cost down from $${draft.regularPrice.toFixed(2)} to just $${draft.dealPrice.toFixed(2)}`)

  // Add scope if provided
  if (draft.ingredientsOrScope && draft.ingredientsOrScope.trim().length > 0) {
    const scope = draft.ingredientsOrScope.trim()
    if (scope.length > 100) {
      parts.push(`Includes: ${scope.substring(0, 97)}...`)
    } else {
      parts.push(`Includes: ${scope}`)
    }
  }

  return parts.join('. ') + '.'
}

function calculateAccuracyScore(draft: DealDraftInput): number {
  let score = 100

  // Deduct for missing vendor copy
  if (!draft.vendorCopy || draft.vendorCopy.trim().length === 0) {
    score -= 20
  } else {
    // Check vendor copy quality
    const copyLength = draft.vendorCopy.trim().length
    if (copyLength < 20) {
      score -= 15 // Too brief
    } else if (copyLength > 300) {
      score -= 5 // Too verbose
    }

    // Check for common issues
    if (draft.vendorCopy.toLowerCase().includes('click here')) score -= 5
    if (draft.vendorCopy.toLowerCase().includes('buy now')) score -= 5
    if (draft.vendorCopy.match(/!{2,}/)) score -= 5 // Multiple exclamation marks
    
    // CRITICAL: Check for vendor operational weakness language
    const vendorCopyLower = draft.vendorCopy.toLowerCase()
    if (vendorCopyLower.match(/slow period|slow time|slow season|fill seats|fill tables|need customers|idle|empty|not busy|underutilized/)) {
      score -= 30 // Major penalty for operational weakness framing
    }
    if (vendorCopyLower.match(/staffing|employee|overhead|fixed cost|rent|lease|capacity/)) {
      score -= 25 // Penalty for internal business concerns
    }
    if (vendorCopyLower.match(/make up for|offset|cover cost|break even/)) {
      score -= 20 // Penalty for desperation framing
    }
  }

  // Deduct for missing scope/ingredients
  if (!draft.ingredientsOrScope || draft.ingredientsOrScope.trim().length === 0) {
    score -= 15
  }

  // Deduct for vague item/service naming
  if (draft.itemOrService.trim().length < 5) {
    score -= 15
  }

  // Deduct for vague industry
  if (!draft.industry || draft.industry.trim().length < 3) {
    score -= 5
  }

  return Math.max(0, Math.min(100, score))
}

function calculatePerformanceScore(draft: DealDraftInput, discountPercent: number): number {
  let score = 100

  // Discount depth assessment
  if (discountPercent < 10) {
    score -= 30 // Weak value proposition
  } else if (discountPercent < 20) {
    score -= 15 // Below market average
  } else if (discountPercent > 70) {
    score -= 20 // Suspiciously high discount (trust issue)
  }

  // Price point assessment
  if (draft.dealPrice < 5) {
    score -= 10 // Too low (profitability concern)
  } else if (draft.dealPrice > 100) {
    score -= 5 // High commitment (conversion friction)
  }

  // Vendor name assessment
  if (!draft.vendorName || draft.vendorName.trim().length < 3) {
    score -= 15 // Weak brand identity
  }

  // Item clarity assessment
  const itemWords = draft.itemOrService.trim().split(/\s+/).length
  if (itemWords < 2) {
    score -= 10 // Too generic
  } else if (itemWords > 8) {
    score -= 5 // Too complex
  }

  return Math.max(0, Math.min(100, score))
}

function generateExplanation(
  draft: DealDraftInput,
  accuracyScore: number,
  performanceScore: number,
  discountPercent: number
): string {
  const parts: string[] = []

  // Opening assessment (neutral, analytical tone)
  if (accuracyScore >= 85 && performanceScore >= 85) {
    parts.push("The deal structure demonstrates strong fundamentals across accuracy and performance dimensions.")
  } else if (accuracyScore >= 70 && performanceScore >= 70) {
    parts.push("The deal shows reasonable construction with potential for optimization in specific areas.")
  } else {
    parts.push("The deal structure exhibits several areas where refinement could improve market reception.")
  }

  // Accuracy feedback (neutral observations)
  if (accuracyScore < 70) {
    if (!draft.vendorCopy || draft.vendorCopy.trim().length === 0) {
      parts.push("The absence of vendor copy represents a missed opportunity to establish value context and customer motivation.")
    }
    if (!draft.ingredientsOrScope || draft.ingredientsOrScope.trim().length === 0) {
      parts.push("Deals without scope specification typically face higher abandonment rates as customers lack clarity on deliverables.")
    }
    if (draft.itemOrService.trim().length < 5) {
      parts.push("Item descriptions under 5 characters historically correlate with lower conversion due to insufficient specificity.")
    }
  } else {
    parts.push("The deal details provide adequate clarity for customer decision-making.")
  }
  
  // Check for vendor operational weakness language
  if (draft.vendorCopy) {
    const vendorCopyLower = draft.vendorCopy.toLowerCase()
    if (vendorCopyLower.match(/slow period|slow time|slow season|fill seats|fill tables|need customers|idle|empty|not busy|underutilized|staffing|employee|overhead|fixed cost|make up for|offset|cover cost|break even/)) {
      parts.push("The copy contains vendor-operational framing (e.g., 'slow period', 'fill tables', 'staffing needs'). Customer-facing copy performs better when framed from customer perspective: desire, convenience, timing, and value rather than vendor operational concerns.")
    }
  }

  // Performance feedback (neutral analytical observations)
  if (performanceScore < 70) {
    if (discountPercent < 10) {
      parts.push(`Market data suggests discounts below 10% (current: ${discountPercent}%) typically generate lower urgency response. The 20-35% range historically shows stronger conversion rates.`)
    } else if (discountPercent < 20) {
      parts.push(`The ${discountPercent}% discount falls below typical market response thresholds. Deals in the 25-35% range tend to demonstrate higher engagement metrics.`)
    }

    if (draft.dealPrice < 5) {
      parts.push("Price points under $5 often face value perception challenges. Margin sustainability becomes a relevant consideration at this tier.")
    } else if (draft.dealPrice > 100) {
      parts.push("Deals above $100 typically require additional trust signals such as testimonials, guarantees, or detailed deliverable breakdowns to overcome commitment friction.")
    }
  } else {
    // Only add positive discount message if it's NOT suspiciously high
    if (discountPercent <= 70) {
      parts.push(`The ${discountPercent}% discount aligns with ranges that historically demonstrate strong customer motivation without triggering skepticism.`)
    }
  }

  // Add deep discount observation even for high performance scores
  if (discountPercent > 70) {
    parts.push(`Discounts exceeding 70% (current: ${discountPercent}%) can trigger authenticity concerns. Context such as overstocking, grand opening, or seasonal closeout tends to mitigate this perception when included in copy.`)
  }

  // Closing (neutral summary - no directives)
  if (accuracyScore >= 80 && performanceScore >= 80) {
    parts.push("The deal exhibits characteristics associated with successful market performance.")
  } else if (accuracyScore >= 70 || performanceScore >= 70) {
    parts.push("The suggestions below represent observations from market data that may inform optimization decisions.")
  } else {
    parts.push("The suggestions below identify areas where historical data shows potential for improvement.")
  }

  return parts.join(' ')
}

function generateSuggestions(
  draft: DealDraftInput,
  accuracyScore: number,
  performanceScore: number,
  discountPercent: number
): string[] {
  const suggestions: string[] = []

  // CRITICAL: Check for vendor operational weakness language first
  if (draft.vendorCopy) {
    const vendorCopyLower = draft.vendorCopy.toLowerCase()
    if (vendorCopyLower.match(/slow period|slow time|slow season|need to fill|fill seats|fill tables/)) {
      suggestions.push("Observation: Copy references 'slow period' or 'filling seats'—vendor operational concerns. Customer-facing copy typically performs better when framed around customer benefits: 'Perfect timing for your [occasion]', 'Available when you need it most', 'Convenient hours that fit your schedule'.")
    }
    if (vendorCopyLower.match(/staffing|employee|overhead|rent|lease|fixed cost/)) {
      suggestions.push("Observation: Copy mentions internal business operations (staffing, overhead, costs). Market data suggests customer-perspective framing—emphasizing quality, experience, or value—generates stronger response.")
    }
    if (vendorCopyLower.match(/need customers|need business|make up for|offset|cover cost|break even|idle capacity|underutilized/)) {
      suggestions.push("Observation: Copy contains desperation signals or capacity language. Successful deals typically frame from customer desire: 'Exclusive access', 'Limited availability', 'Premium experience at accessible pricing'.")
    }
  }

  // Accuracy suggestions (observational tone)
  if (!draft.vendorCopy || draft.vendorCopy.trim().length === 0) {
    suggestions.push("Observation: No vendor copy provided. Deals with 2-3 sentence context (value, uniqueness, timing) historically show 35-40% higher conversion than those without.")
  } else if (draft.vendorCopy.trim().length < 20) {
    suggestions.push("Observation: Vendor copy under 20 characters. Market data indicates 50-200 character range provides optimal context without overwhelming.")
  } else if (draft.vendorCopy.trim().length > 300) {
    suggestions.push("Observation: Vendor copy exceeds 300 characters. Successful deals tend to keep copy under 250 characters, focusing on 2-3 key points.")
  }

  if (!draft.ingredientsOrScope || draft.ingredientsOrScope.trim().length === 0) {
    suggestions.push("Observation: No ingredients/scope provided. Specificity correlates with 25-30% reduction in abandonment rates as customers gain clarity.")
  }

  if (draft.itemOrService.trim().length < 5) {
    suggestions.push("Observation: Item description under 5 characters. Example transformation: 'Coffee' → 'Artisan Cold Brew Coffee (16oz)' provides specificity that aids conversion.")
  }

  if (draft.vendorCopy && draft.vendorCopy.toLowerCase().includes('click here')) {
    suggestions.push("Observation: 'Click here' language detected. This phrasing dates to early web conventions and can reduce perceived quality. Value-driven copy without navigational prompts tends to perform better.")
  }

  // Performance suggestions (observational tone)
  if (discountPercent < 10) {
    suggestions.push(`Observation: ${discountPercent}% discount falls below typical urgency thresholds. Market data shows 20-35% range generates stronger response rates.`)
  } else if (discountPercent < 20) {
    suggestions.push(`Observation: ${discountPercent}% discount is below market averages. The 25-30% range historically demonstrates 15-20% higher conversion.`)
  } else if (discountPercent > 70) {
    suggestions.push(`Observation: ${discountPercent}% discount exceeds typical thresholds and may trigger authenticity concerns. Context such as 'Overstock Clearance', 'Grand Opening', or 'End of Season' tends to mitigate skepticism when included.`)
  }

  if (draft.dealPrice < 5) {
    suggestions.push("Observation: Deal price under $5. This tier faces margin sustainability considerations and potential value perception challenges.")
  } else if (draft.dealPrice > 100) {
    suggestions.push("Observation: Deal price exceeds $100. High-commitment purchases benefit from trust signals: testimonials, guarantees, detailed deliverable lists, or risk-reversal language.")
  }

  if (draft.itemOrService.trim().split(/\s+/).length > 8) {
    suggestions.push("Observation: Item name exceeds 8 words. Cognitive load research suggests 4-6 word descriptions optimize for clarity without oversimplification.")
  }

  // Industry-specific suggestions (observational)
  if (draft.industry.toLowerCase().includes('food') || draft.industry.toLowerCase().includes('restaurant')) {
    if (!draft.ingredientsOrScope || draft.ingredientsOrScope.trim().length === 0) {
      suggestions.push("Observation: Food/restaurant deals without ingredient or menu item specifications historically face 40-50% higher abandonment due to dietary restrictions and preference clarity needs.")
    }
  }

  if (draft.industry.toLowerCase().includes('service')) {
    if (!draft.ingredientsOrScope || draft.ingredientsOrScope.trim().length === 0) {
      suggestions.push("Observation: Service deals without scope (duration, inclusions, exclusions) tend to generate higher support inquiries and lower conversion. Specificity reduces friction.")
    }
  }

  // If everything looks good (neutral observation)
  if (suggestions.length === 0) {
    suggestions.push("Observation: The deal structure aligns with established best practices across accuracy and performance dimensions. A/B testing copy variations could yield marginal optimization.")
  }

  return suggestions
}

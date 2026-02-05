/**
 * GEOGRAPHIC CONTEXT & DISCOVERY BOUNDARY MODULE
 * Discovery Search API
 *
 * POST /api/discovery/search - Search with intent interpretation
 *
 * Authorization: Public (county resolved from domain)
 *
 * HARD RULES:
 * - County is resolved from domain ONLY
 * - Intent interpretation is county-locked
 * - AI may classify intent but NEVER expand geography
 * - If confidence is low, present clarification within same county
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveCountyFromDomain } from '@/lib/geography/domain-resolution'
import { resolveCityBySlug } from '@/lib/geography/city-guards'
import {
  interpretIntent,
  getCategorySuggestions,
} from '@/lib/geography/intent-interpretation'

/**
 * POST /api/discovery/search
 * Interpret search intent within county boundaries
 *
 * Body:
 * - query: string (required) - The search query
 * - citySlug?: string (optional) - Scope to specific city
 */
export async function POST(request: NextRequest) {
  // 1. Resolve county from domain (REQUIRED)
  const countyResult = await resolveCountyFromDomain(request)
  if (!countyResult.success) {
    return NextResponse.json(
      { error: countyResult.error },
      { status: countyResult.status }
    )
  }

  const county = countyResult.data

  // 2. Parse request body
  let body: {
    query?: string
    citySlug?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  if (!body.query || typeof body.query !== 'string') {
    return NextResponse.json(
      { error: 'Search query is required' },
      { status: 400 }
    )
  }

  // 3. Optionally resolve city context
  let city = undefined
  if (body.citySlug) {
    const cityResult = await resolveCityBySlug(body.citySlug, county.id)
    if (cityResult.success) {
      city = cityResult.data
    }
    // If city doesn't resolve, we still search county-wide
  }

  // 4. Interpret intent (county-locked)
  const intentResult = interpretIntent(body.query, county, city)
  if (!intentResult.success) {
    return NextResponse.json(
      { error: intentResult.error },
      { status: intentResult.status }
    )
  }

  const intent = intentResult.data

  // 5. If confidence is low, provide category suggestions
  let suggestions: string[] | undefined
  if (intent.confidence === 'low') {
    suggestions = getCategorySuggestions(county, city)
  }

  return NextResponse.json({
    success: true,
    data: {
      context: {
        county: {
          id: county.id,
          name: county.name,
          state: county.state,
        },
        city: city ? {
          id: city.id,
          name: city.name,
          slug: city.slug,
        } : null,
      },
      intent: {
        originalQuery: intent.originalQuery,
        categories: intent.categories,
        hasDealIntent: intent.hasDealIntent,
        confidence: intent.confidence,
        fillerWordsRemoved: intent.fillerWordsRemoved,
      },
      suggestions,
    },
  })
}

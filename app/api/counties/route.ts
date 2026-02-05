/**
 * COUNTY SYSTEM BOUNDARY MODULE (Foundational)
 * Public Counties API
 *
 * GET /api/counties - List all active counties
 *
 * This endpoint is PUBLIC and does not require authentication.
 * Used for county selection on landing page and public routing.
 */

import { NextResponse } from 'next/server'
import { listActiveCounties } from '@/lib/county'

/**
 * GET /api/counties
 * List all active counties (public)
 */
export async function GET() {
  const result = await listActiveCounties()

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }

  return NextResponse.json({
    success: true,
    data: result.data,
  })
}

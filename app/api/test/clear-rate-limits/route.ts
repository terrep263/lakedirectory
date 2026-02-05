import { NextResponse } from 'next/server'
import { clearRateLimits } from '@/lib/rate-limit'

// Test-only endpoint to clear rate limits
// Only accessible when NODE_ENV === 'test'
export async function POST() {
  // Security: only allow in test environment
  if (process.env.NODE_ENV !== 'test') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  clearRateLimits()
  
  return NextResponse.json(
    { success: true, message: 'Rate limits cleared' },
    { status: 200 }
  )
}

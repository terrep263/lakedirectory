import { NextRequest, NextResponse } from 'next/server'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

const store: RateLimitStore = {}

let cleanupInterval: NodeJS.Timeout | null = null

const RATE_LIMITS = {
  issue: {
    windowMs: 60000,
    maxRequests: 10
  },
  default: {
    windowMs: 60000,
    maxRequests: 30
  }
}

export function rateLimit(identifier: string, type: 'issue' | 'default' = 'default'): boolean {
  const now = Date.now()
  const limit = RATE_LIMITS[type]
  
  if (!store[identifier]) {
    store[identifier] = {
      count: 1,
      resetAt: now + limit.windowMs
    }
    return true
  }
  
  if (now > store[identifier].resetAt) {
    store[identifier] = {
      count: 1,
      resetAt: now + limit.windowMs
    }
    return true
  }
  
  if (store[identifier].count >= limit.maxRequests) {
    return false
  }
  
  store[identifier].count++
  return true
}

export function clearRateLimits(): void {
  // Only allow clearing rate limits in test environment
  if (process.env.NODE_ENV !== 'test') {
    return // No-op in production
  }
  
  // Clear all entries from the store
  Object.keys(store).forEach(key => {
    delete store[key]
  })
  
  // Clear the cleanup interval to prevent open handles
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

export function shutdownRateLimiter(): void {
  // Force cleanup of interval regardless of environment
  // Used for final teardown
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
  
  // Clear the store
  Object.keys(store).forEach(key => {
    delete store[key]
  })
}

export function getRateLimitIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  return ip
}

// Only start cleanup interval in production
if (process.env.NODE_ENV !== 'test') {
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    Object.keys(store).forEach(key => {
      if (store[key].resetAt < now) {
        delete store[key]
      }
    })
  }, 60000)
}

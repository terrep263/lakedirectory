/**
 * COUNTY SYSTEM BOUNDARY MODULE (Foundational)
 * Middleware utilities for county-scoped request handling.
 *
 * This module provides utilities for enforcing county context
 * in Next.js middleware and route handlers.
 *
 * HARD RULES:
 * - Public routes MUST be county-scoped (except landing page)
 * - API routes MUST resolve county context
 * - County context is immutable for request duration
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractCountySlugFromPath } from './guards'

/**
 * Routes that are exempt from county requirement.
 * These are truly global routes that don't need county context.
 */
const COUNTY_EXEMPT_ROUTES = [
  // Root landing page (county selection)
  '/',
  // Authentication routes
  '/login',
  '/register',
  '/verify-email',
  // Admin routes (handled separately with admin county access)
  '/admin',
  // Global API routes
  '/api/identity',
  '/api/auth',
  '/api/counties', // Public county listing
  '/api/super-admin', // Global SUPER_ADMIN operations
]

/**
 * API route prefixes that handle their own county validation.
 */
const SELF_VALIDATING_API_ROUTES = [
  '/api/identity',
  '/api/auth',
  '/api/counties',
  '/api/super-admin',
]

/**
 * Check if a path is exempt from county requirement.
 */
export function isCountyExemptRoute(pathname: string): boolean {
  // Exact match
  if (COUNTY_EXEMPT_ROUTES.includes(pathname)) {
    return true
  }

  // Static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg')
  ) {
    return true
  }

  // Admin routes are handled with admin county access
  if (pathname.startsWith('/admin')) {
    return true
  }

  // Super Admin routes are global (not county-scoped)
  if (pathname.startsWith('/super-admin')) {
    return true
  }

  // Debug routes in development
  if (pathname.startsWith('/debug')) {
    return true
  }

  return false
}

/**
 * Check if an API route handles its own county validation.
 */
export function isSelfValidatingApiRoute(pathname: string): boolean {
  return SELF_VALIDATING_API_ROUTES.some((prefix) =>
    pathname.startsWith(prefix)
  )
}

/**
 * County validation result for middleware.
 */
export interface CountyMiddlewareResult {
  isValid: boolean
  countySlug?: string
  redirectTo?: string
  error?: string
}

/**
 * Validate county context for middleware.
 * Returns validation result with optional redirect.
 */
export function validateCountyMiddleware(
  request: NextRequest
): CountyMiddlewareResult {
  const pathname = request.nextUrl.pathname

  // Check if route is exempt
  if (isCountyExemptRoute(pathname)) {
    return { isValid: true }
  }

  // API routes - check if self-validating
  if (pathname.startsWith('/api/')) {
    if (isSelfValidatingApiRoute(pathname)) {
      return { isValid: true }
    }

    // Other API routes must have county context
    // Check for county slug in path or header
    const countySlug = extractCountySlugFromPath(pathname) ||
                       request.headers.get('x-county-slug') ||
                       request.cookies.get('county_context')?.value

    if (!countySlug) {
      return {
        isValid: false,
        error: 'County context required for this API endpoint',
      }
    }

    return { isValid: true, countySlug }
  }

  // Public routes must have county slug in URL
  const countySlug = extractCountySlugFromPath(pathname)

  if (!countySlug) {
    // Redirect to landing page for county selection
    return {
      isValid: false,
      redirectTo: '/',
    }
  }

  return { isValid: true, countySlug }
}

/**
 * Create middleware response for county validation failure.
 */
export function createCountyValidationResponse(
  request: NextRequest,
  result: CountyMiddlewareResult
): NextResponse | null {
  if (result.isValid) {
    // Continue with county context set in header
    const response = NextResponse.next()
    if (result.countySlug) {
      response.headers.set('x-county-context', result.countySlug)
    }
    return response
  }

  if (result.redirectTo) {
    return NextResponse.redirect(new URL(result.redirectTo, request.url))
  }

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    )
  }

  // Should not reach here
  return NextResponse.json(
    { error: 'County context required' },
    { status: 400 }
  )
}

/**
 * Build a county-scoped URL.
 */
export function buildCountyUrl(
  countySlug: string,
  path: string
): string {
  // Ensure path doesn't start with slash for clean joining
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `/${countySlug}/${cleanPath}`
}

/**
 * Build a county-scoped API URL.
 * API routes use header-based county context instead of URL prefix.
 */
export function buildCountyApiUrl(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

/**
 * Extract county-relative path from full path.
 * E.g., /lake-county/businesses/123 → /businesses/123
 */
export function extractCountyRelativePath(pathname: string): string | null {
  const countySlug = extractCountySlugFromPath(pathname)
  if (!countySlug) return null

  const prefixLength = countySlug.length + 1 // +1 for leading slash
  return pathname.slice(prefixLength) || '/'
}

/**
 * Get county context from request cookies.
 */
export function getCountyCookie(request: NextRequest): string | null {
  return request.cookies.get('county_context')?.value || null
}

/**
 * Set county context cookie in response.
 */
export function setCountyCookie(
  response: NextResponse,
  countySlug: string
): NextResponse {
  response.cookies.set('county_context', countySlug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return response
}

/**
 * Clear county context cookie.
 */
export function clearCountyCookie(response: NextResponse): NextResponse {
  response.cookies.delete('county_context')
  return response
}

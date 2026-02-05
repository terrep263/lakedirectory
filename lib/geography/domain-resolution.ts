/**
 * GEOGRAPHIC CONTEXT & DISCOVERY BOUNDARY MODULE
 * Domain-to-County Resolution
 *
 * AUTHORITATIVE RULE:
 * County is resolved from request domain ONLY.
 * No cookies, paths, or query params for county resolution.
 * If a request cannot resolve to a valid County → reject request.
 *
 * This is the ONLY mechanism for county resolution.
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { CountyGeoContext, GeoResult, CountyDomainMapping } from './types'
import { normalizeDomain, extractDomain } from './types'

/**
 * ERROR RESPONSES
 * Hard failures for domain resolution.
 */
export const DomainResolutionErrors = {
  DOMAIN_NOT_MAPPED: { error: 'Domain is not mapped to any county', status: 400 },
  COUNTY_NOT_FOUND: { error: 'County not found', status: 404 },
  COUNTY_INACTIVE: { error: 'County is not active', status: 403 },
  DOMAIN_MAPPING_INACTIVE: { error: 'Domain mapping is not active', status: 403 },
  MISSING_HOST_HEADER: { error: 'Cannot determine request domain', status: 400 },
} as const

/**
 * Development domains that bypass production domain checking.
 * These map to a configurable default county or first active county.
 */
const DEV_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
] as const

/**
 * Check if domain is a development domain.
 */
function isDevDomain(domain: string): boolean {
  const normalized = normalizeDomain(domain)
  return DEV_DOMAINS.some(dev =>
    normalized === dev || normalized.startsWith(`${dev}:`)
  )
}

/**
 * Resolve county from request domain.
 *
 * This is the SOLE mechanism for county resolution.
 * Domain → County mapping is authoritative.
 *
 * Resolution order:
 * 1. Extract domain from request Host header
 * 2. Look up domain in CountyDomain table
 * 3. Return county if active, reject otherwise
 *
 * For development domains (localhost), returns the first active county
 * or a configured default.
 */
export async function resolveCountyFromDomain(
  request: NextRequest
): Promise<GeoResult<CountyGeoContext>> {
  // 1. Extract domain from request
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host')

  if (!host) {
    return { success: false, ...DomainResolutionErrors.MISSING_HOST_HEADER }
  }

  const domain = extractDomain(host)

  // 2. Handle development domains
  if (isDevDomain(domain)) {
    return resolveDevCounty()
  }

  // 3. Look up domain mapping
  const domainMapping = await prisma.countyDomain.findUnique({
    where: { domain },
    include: {
      county: true,
    },
  })

  if (!domainMapping) {
    return { success: false, ...DomainResolutionErrors.DOMAIN_NOT_MAPPED }
  }

  if (!domainMapping.isActive) {
    return { success: false, ...DomainResolutionErrors.DOMAIN_MAPPING_INACTIVE }
  }

  const county = domainMapping.county

  if (!county) {
    return { success: false, ...DomainResolutionErrors.COUNTY_NOT_FOUND }
  }

  if (!county.isActive) {
    return { success: false, ...DomainResolutionErrors.COUNTY_INACTIVE }
  }

  return {
    success: true,
    data: {
      id: county.id,
      name: county.name,
      state: county.state,
      slug: county.slug,
      isActive: county.isActive,
    },
  }
}

/**
 * Resolve county for development environments.
 * Returns the first active county in the system.
 */
async function resolveDevCounty(): Promise<GeoResult<CountyGeoContext>> {
  // In development, use the first active county
  const county = await prisma.county.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!county) {
    return { success: false, ...DomainResolutionErrors.COUNTY_NOT_FOUND }
  }

  return {
    success: true,
    data: {
      id: county.id,
      name: county.name,
      state: county.state,
      slug: county.slug,
      isActive: county.isActive,
    },
  }
}

/**
 * Resolve county by ID (for internal use / API routes).
 */
export async function resolveCountyById(
  countyId: string
): Promise<GeoResult<CountyGeoContext>> {
  const county = await prisma.county.findUnique({
    where: { id: countyId },
  })

  if (!county) {
    return { success: false, ...DomainResolutionErrors.COUNTY_NOT_FOUND }
  }

  if (!county.isActive) {
    return { success: false, ...DomainResolutionErrors.COUNTY_INACTIVE }
  }

  return {
    success: true,
    data: {
      id: county.id,
      name: county.name,
      state: county.state,
      slug: county.slug,
      isActive: county.isActive,
    },
  }
}

/**
 * List all domain mappings for a county.
 */
export async function listCountyDomains(
  countyId: string
): Promise<GeoResult<CountyDomainMapping[]>> {
  const domains = await prisma.countyDomain.findMany({
    where: { countyId },
    orderBy: [
      { isPrimary: 'desc' },
      { domain: 'asc' },
    ],
  })

  return {
    success: true,
    data: domains.map(d => ({
      id: d.id,
      domain: d.domain,
      countyId: d.countyId,
      isPrimary: d.isPrimary,
      isActive: d.isActive,
    })),
  }
}

/**
 * Get primary domain for a county.
 */
export async function getPrimaryDomain(
  countyId: string
): Promise<GeoResult<CountyDomainMapping | null>> {
  const domain = await prisma.countyDomain.findFirst({
    where: {
      countyId,
      isPrimary: true,
      isActive: true,
    },
  })

  if (!domain) {
    return { success: true, data: null }
  }

  return {
    success: true,
    data: {
      id: domain.id,
      domain: domain.domain,
      countyId: domain.countyId,
      isPrimary: domain.isPrimary,
      isActive: domain.isActive,
    },
  }
}

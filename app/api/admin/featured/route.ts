/**
 * MODULE 8: Admin Operations
 * GET /api/admin/featured - List featured content
 * POST /api/admin/featured - Feature business or deal
 * DELETE /api/admin/featured - Remove featured content
 *
 * Purpose: Manage featured businesses and deals
 * Authorization:
 *   - ADMIN only (with county access)
 * Rules:
 *   - Only ACTIVE entities can be featured
 *   - Time-bounded featuring
 *   - Action is logged to audit trail
 *   - County-scoped operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { FeaturedType } from '@prisma/client'
import {
  requireAdminContext,
  adminFailure,
  canFeatureEntity,
  logAdminActionInTransaction,
  AdminErrors,
} from '@/lib/admin'
import {
  requireAdminCountyAccess,
  countyFailure,
} from '@/lib/county'

/**
 * GET: List featured content
 */
export async function GET(request: NextRequest) {
  // GUARD: Admin with county access
  const countyResult = await requireAdminCountyAccess(request)
  if (!countyResult.success) {
    return countyFailure(countyResult)
  }

  // Get county context (SUPER_ADMIN has global access, need different handling)
  const adminCtx = countyResult.data
  const countyId = 'activeCounty' in adminCtx ? adminCtx.activeCounty.id : null

  // Parse query params
  const searchParams = request.nextUrl.searchParams
  const entityType = searchParams.get('entityType') as FeaturedType | null
  const activeOnly = searchParams.get('activeOnly') !== 'false'

  // Build where clause - always county-scoped for non-SUPER_ADMIN
  const where: { entityType?: FeaturedType; isActive?: boolean; countyId?: string } = {}
  if (entityType && ['BUSINESS', 'DEAL'].includes(entityType)) {
    where.entityType = entityType
  }
  if (activeOnly) {
    where.isActive = true
  }
  if (countyId) {
    where.countyId = countyId
  }

  const featured = await prisma.featuredContent.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { startAt: 'desc' }],
    include: {
      createdByAdmin: {
        select: { email: true },
      },
      county: {
        select: { name: true, slug: true },
      },
    },
  })

  // Enrich with entity details
  const enriched = await Promise.all(
    featured.map(async (f) => {
      let entityName = 'Unknown'
      if (f.entityType === FeaturedType.BUSINESS) {
        const business = await prisma.business.findUnique({
          where: { id: f.entityId },
          select: { name: true },
        })
        entityName = business?.name || 'Unknown'
      } else {
        const deal = await prisma.deal.findUnique({
          where: { id: f.entityId },
          select: { title: true },
        })
        entityName = deal?.title || 'Unknown'
      }

      return {
        id: f.id,
        entityType: f.entityType,
        entityId: f.entityId,
        entityName,
        startAt: f.startAt,
        endAt: f.endAt,
        priority: f.priority,
        isActive: f.isActive,
        createdAt: f.createdAt,
        createdBy: f.createdByAdmin.email,
        removedAt: f.removedAt,
        county: f.county,
      }
    })
  )

  return NextResponse.json({
    success: true,
    data: enriched,
    totalCount: enriched.length,
  })
}

/**
 * POST: Feature a business or deal
 */
export async function POST(request: NextRequest) {
  // GUARD: Admin with county access
  const countyResult = await requireAdminCountyAccess(request)
  if (!countyResult.success) {
    return countyFailure(countyResult)
  }

  const adminCtx = countyResult.data

  // Require active county context for creating featured content
  if (!('activeCounty' in adminCtx)) {
    return NextResponse.json(
      { error: 'County context required for this operation' },
      { status: 400 }
    )
  }

  const countyId = adminCtx.activeCounty.id
  const admin = adminCtx

  // Parse request body
  let body: {
    entityType: string
    entityId: string
    startAt: string
    endAt: string
    priority?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { entityType, entityId, startAt, endAt, priority } = body

  // Validate entity type
  if (!entityType || !['BUSINESS', 'DEAL'].includes(entityType)) {
    return NextResponse.json(
      { error: 'entityType must be BUSINESS or DEAL' },
      { status: 400 }
    )
  }

  if (!entityId || typeof entityId !== 'string') {
    return NextResponse.json(
      { error: 'entityId is required' },
      { status: 400 }
    )
  }

  // Parse dates
  const startDate = new Date(startAt)
  const endDate = new Date(endAt)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format for startAt or endAt' },
      { status: 400 }
    )
  }

  const featuredType = entityType as FeaturedType

  // GUARD: Can feature entity
  const canFeature = await canFeatureEntity(featuredType, entityId, startDate, endDate)
  if (!canFeature.success) {
    return adminFailure(canFeature)
  }

  const { entity } = canFeature.data

  // ATOMIC: Create featured content and log action
  const result = await prisma.$transaction(async (tx) => {
    const featured = await tx.featuredContent.create({
      data: {
        entityType: featuredType,
        entityId,
        startAt: startDate,
        endAt: endDate,
        priority: priority || 0,
        createdBy: admin.id,
        countyId, // County-scoped
      },
    })

    // Log admin action
    await logAdminActionInTransaction(
      tx,
      admin.id,
      'FEATURED_ADDED',
      'FEATURED_CONTENT',
      featured.id,
      {
        entityType: featuredType,
        entityId,
        entityName: entity.name,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        priority: priority || 0,
      }
    )

    return featured
  })

  return NextResponse.json({
    success: true,
    data: {
      featuredId: result.id,
      entityType: result.entityType,
      entityId: result.entityId,
      entityName: entity.name,
      startAt: result.startAt,
      endAt: result.endAt,
      priority: result.priority,
      isActive: result.isActive,
    },
  })
}

/**
 * DELETE: Remove featured content
 */
export async function DELETE(request: NextRequest) {
  // GUARD: Admin with county access
  const countyResult = await requireAdminCountyAccess(request)
  if (!countyResult.success) {
    return countyFailure(countyResult)
  }

  const adminCtx = countyResult.data
  const admin = adminCtx

  // Parse query params
  const searchParams = request.nextUrl.searchParams
  const featuredId = searchParams.get('id')

  if (!featuredId) {
    return NextResponse.json(
      { error: 'Featured content id is required' },
      { status: 400 }
    )
  }

  // Check if featured content exists
  const existing = await prisma.featuredContent.findUnique({
    where: { id: featuredId },
  })

  if (!existing) {
    return adminFailure({ ...AdminErrors.FEATURED_NOT_FOUND })
  }

  if (!existing.isActive) {
    return NextResponse.json(
      { error: 'Featured content is already removed' },
      { status: 409 }
    )
  }

  // Get entity name for logging
  let entityName = 'Unknown'
  if (existing.entityType === FeaturedType.BUSINESS) {
    const business = await prisma.business.findUnique({
      where: { id: existing.entityId },
      select: { name: true },
    })
    entityName = business?.name || 'Unknown'
  } else {
    const deal = await prisma.deal.findUnique({
      where: { id: existing.entityId },
      select: { title: true },
    })
    entityName = deal?.title || 'Unknown'
  }

  // ATOMIC: Remove featured content and log action
  const result = await prisma.$transaction(async (tx) => {
    const featured = await tx.featuredContent.update({
      where: { id: featuredId },
      data: {
        isActive: false,
        removedAt: new Date(),
        removedBy: admin.id,
      },
    })

    // Log admin action
    await logAdminActionInTransaction(
      tx,
      admin.id,
      'FEATURED_REMOVED',
      'FEATURED_CONTENT',
      featured.id,
      {
        entityType: featured.entityType,
        entityId: featured.entityId,
        entityName,
        originalEndAt: existing.endAt.toISOString(),
        removedEarly: new Date() < existing.endAt,
      }
    )

    return featured
  })

  return NextResponse.json({
    success: true,
    data: {
      featuredId: result.id,
      entityType: result.entityType,
      entityId: result.entityId,
      entityName,
      removedAt: result.removedAt,
      isActive: result.isActive,
    },
  })
}

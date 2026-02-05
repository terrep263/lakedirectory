/**
 * MODULE 8: Admin Operations
 * POST /api/admin/business/featured - Toggle featured status for a business
 *
 * SCHEMA RESOLUTION: Featured status exists ONLY in BusinessPage
 * Purpose: Update BusinessPage.isFeatured and featuredAt (SINGLE SOURCE OF TRUTH)
 * Specification Compliance:
 *   - Updates BusinessPage.isFeatured boolean
 *   - Sets BusinessPage.featuredAt to now() when true
 *   - Clears BusinessPage.featuredAt when false
 *   - Action is logged to audit trail
 *
 * Authorization:
 *   - ADMIN only
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireAdminContext,
  adminFailure,
  logAdminActionInTransaction,
} from '@/lib/admin'
import { getCorrelationId } from '@/lib/http/request-id'

interface FeatureBusinessRequest {
  businessId: string
  isFeatured: boolean
}

interface FeatureBusinessResponse {
  success: boolean
  message?: string
  updatedBusiness?: {
    id: string
    name: string
    isFeatured: boolean
    featuredAt: Date | null
  }
  error?: string
}

export async function POST(
  request: NextRequest
) {
  const correlationId = getCorrelationId(request)
  // GUARD: Admin only
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) {
    return adminFailure(adminResult)
  }

  const admin = adminResult.data

  // Parse request body
  let body: FeatureBusinessRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body', correlationId } as any,
      { status: 400 }
    )
  }

  const { businessId, isFeatured } = body

  // Validate required fields
  if (!businessId || typeof isFeatured !== 'boolean') {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing or invalid required fields: businessId (string), isFeatured (boolean)',
        correlationId,
      },
      { status: 400 }
    )
  }

  try {
    // ATOMIC: Update BusinessPage featured status
    const updatedPage = await prisma.$transaction(async (tx) => {
      // Verify business exists
      const business = await tx.business.findUnique({
        where: { id: businessId },
        select: { id: true, name: true },
      })

      if (!business) {
        throw new Error('Business not found')
      }

      // Find BusinessPage for this business
      const businessPage = await tx.businessPage.findUnique({
        where: { businessId },
      })

      if (!businessPage) {
        throw new Error('BusinessPage not found - page must exist before featuring')
      }

      // Update featured status in BusinessPage ONLY (authoritative source)
      const updated = await tx.businessPage.update({
        where: { id: businessPage.id },
        data: {
          isFeatured,
          // Set featuredAt to now when featured, clear when unfeatured
          featuredAt: isFeatured ? new Date() : null,
        },
        select: {
          id: true,
          businessId: true,
          title: true,
          isFeatured: true,
          featuredAt: true,
        },
      })

      // Log admin action
      await logAdminActionInTransaction(
        tx,
        admin.id,
        isFeatured ? 'BUSINESS_FEATURED' : 'BUSINESS_UNFEATURED',
        'BUSINESS',
        businessId,
        {
          businessId,
          businessName: business.name,
          businessPageId: updated.id,
          isFeatured,
          featuredAt: updated.featuredAt,
        }
      )

      return updated
    })

    return NextResponse.json(
      {
        success: true,
        message: `Business featured status updated successfully`,
        updatedBusiness: {
          id: updatedPage.businessId,
          name: updatedPage.title,
          isFeatured: updatedPage.isFeatured,
          featuredAt: updatedPage.featuredAt,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update featured status'

    if (message === 'Business not found') {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    console.error('Error updating featured status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update featured status', correlationId } as any,
      { status: 500 }
    )
  }
}

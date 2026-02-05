import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/identity'

/**
 * POST /api/admin/business/feature
 * Toggle featured status for a business
 *
 * Body:
 * - businessId: string (required) - ID of business to feature
 * - isFeatured: boolean (required) - Feature status to set
 *
 * Returns:
 * - message: success message
 * - updatedBusiness: updated business record
 */
export async function POST(request: NextRequest) {
  try {
    // GUARD: Admin only
    const adminResult = await requireAdmin(request)
    if (!adminResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: adminResult.status || 403 }
      )
    }

    const body = await request.json()
    const { businessId, isFeatured } = body

    // Validation
    if (!businessId || typeof isFeatured !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: businessId (string), isFeatured (boolean)' },
        { status: 400 }
      )
    }

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })

    if (!business) {
      return NextResponse.json(
        { error: `Business not found: ${businessId}` },
        { status: 404 }
      )
    }

    // SCHEMA TRUTH: featured status exists ONLY on BusinessPage.
    const businessPage = await prisma.businessPage.findUnique({
      where: { businessId },
      select: { id: true },
    })

    if (!businessPage) {
      return NextResponse.json(
        { error: 'BusinessPage not found - page must exist before featuring' },
        { status: 409 }
      )
    }

    const updatedPage = await prisma.businessPage.update({
      where: { id: businessPage.id },
      data: {
        isFeatured,
        featuredAt: isFeatured ? new Date() : null,
      },
      select: {
        businessId: true,
        title: true,
        slug: true,
        isFeatured: true,
        featuredAt: true,
      },
    })

    return NextResponse.json(
      {
        message: 'Business featured status updated successfully',
        updatedBusiness: updatedPage,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating featured status:', error)
    return NextResponse.json(
      { error: 'Failed to update featured status' },
      { status: 500 }
    )
  }
}

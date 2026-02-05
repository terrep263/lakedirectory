import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateVendor } from '@/lib/vendor-auth'

/**
 * GET /api/vendor/vouchers/validations
 * 
 * Layer 3 — Visibility: Read-only list of VoucherValidation records
 * 
 * Purpose: Allow vendors to observe validation history without mutation authority
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 50)
 * 
 * Returns: Paginated list of validations with minimal, safe fields only
 * 
 * DOES NOT EXPOSE:
 * - externalTransactionReference (could be replayed)
 * - Any replayable tokens or references
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateVendor(request)
    if (!authResult.success) {
      return authResult.response
    }

    const { businessId } = authResult.vendor

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const skip = (page - 1) * limit

    // Query validations with read-only fields only
    // NO external transaction references (replayable)
    const [validations, totalCount] = await Promise.all([
      prisma.voucherValidation.findMany({
        where: {
          businessId
        },
        select: {
          id: true,
          validatedAt: true,
          dealId: true,
          deal: {
            select: {
              title: true
            }
          },
          voucher: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          validatedAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.voucherValidation.count({
        where: {
          businessId
        }
      })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: {
        validations: validations.map(v => ({
          validationId: v.id,
          validatedAt: v.validatedAt,
          dealId: v.dealId,
          dealTitle: v.deal.title,
          voucherIssued: !!v.voucher,
          voucherStatus: v.voucher?.status || null
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    })
  } catch (error) {
    console.error('Vendor validation history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

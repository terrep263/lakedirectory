/**
 * API Route: Send Voucher PDF via Email (Admin-Only)
 *
 * POST /api/voucher/send
 * Body: { voucherId: string }
 *
 * Authentication: Admin required
 * Response:
 * - 200: Email sent successfully
 * - 400: Voucher not found or invalid request
 * - 401: Unauthorized (not admin)
 * - 403: Forbidden (insufficient permissions)
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/identity/guards'
import { sendVoucherEmail } from '@/lib/voucher/email'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  // Step 1: Require admin authentication
  const adminResult = await requireAdmin(request)
  if (!adminResult.success) {
    return NextResponse.json(
      { error: 'Unauthorized - admin access required' },
      { status: adminResult.status || 403 }
    )
  }

  try {
    // Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Request body must be an object' },
        { status: 400 }
      )
    }

    const { voucherId } = body as Record<string, unknown>

    // Validate voucherId
    if (typeof voucherId !== 'string' || !voucherId.trim()) {
      return NextResponse.json(
        { error: 'voucherId is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Verify voucher exists
    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
      select: { id: true },
    })

    if (!voucher) {
      return NextResponse.json(
        { error: 'Voucher not found' },
        { status: 400 }
      )
    }

    // Send email (failures logged but not thrown)
    await sendVoucherEmail(voucherId)

    return NextResponse.json(
      {
        success: true,
        message: 'Voucher email sent',
        voucherId,
        adminId: adminResult.data?.id, // Include admin who triggered this
      },
      { status: 200 }
    )
  } catch (error) {
    // Log unexpected error
    const errorMessage =
      error instanceof Error ? error.message : String(error)
    console.error('[Voucher Send API] Unexpected error:', errorMessage)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}

/**
 * MODULE 7: Vendor Operations - Zero-Trust Redemption
 * POST /api/vendor/redeem
 *
 * Purpose: Redeem a voucher for vendor's business
 * Design: Zero-trust, server-authoritative, atomic
 *
 * Authorization:
 *   - Session token required (not identity)
 *   - Session must be active and not expired
 *   - Vendor must own the business
 *
 * Rules:
 *   - All validation is server-side (zero-trust PWA)
 *   - Voucher must belong to vendor's business
 *   - Voucher must be ISSUED (not already redeemed)
 *   - Voucher must not be expired
 *   - Redemption is ATOMIC and IRREVERSIBLE
 *   - First scan wins, subsequent scans fail deterministically
 *
 * Request:
 * {
 *   voucherId: string,
 *   sessionToken: string,
 *   locationId?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { redeemVoucher } from '@/lib/voucher/redemption-engine';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { voucherId, sessionToken, locationId } = body;

    // Validate required fields
    if (!voucherId || !sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          required: ['voucherId', 'sessionToken'],
        },
        { status: 400 }
      );
    }

    // Extract client metadata for audit trail
    const clientMetadata = {
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    // Attempt redemption (zero-trust)
    const result = await redeemVoucher({
      voucherId,
      sessionToken,
      locationId,
      metadata: clientMetadata,
    });

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      // Determine appropriate HTTP status based on failure reason
      let statusCode = 400;
      if (result.failureReason === 'INVALID_SESSION') {
        statusCode = 401;
      }

      return NextResponse.json(result, { status: statusCode });
    }
  } catch (error) {
    console.error('Redemption endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

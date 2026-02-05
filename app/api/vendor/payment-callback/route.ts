/**
 * POST /api/vendor/payment-callback
 *
 * Receives payment callbacks from external payment providers
 * - Provider-agnostic (Stripe, PayPal, Square, Razorpay, etc.)
 * - HMAC signature validation for security
 * - Idempotent using externalTransactionId
 * - Atomic voucher issuance
 *
 * Request format:
 * {
 *   dealId: string,
 *   externalTransactionId: string (unique per provider),
 *   amountPaid: number (in cents or appropriate unit),
 *   currency: string,
 *   paymentStatus: string,
 *   customerReference: string,
 *   callbackSignature: string,
 *   callbackTimestamp: number (unix timestamp in seconds)
 * }
 *
 * Response:
 * - 200: Voucher issued successfully
 * - 400: Invalid request (validation failed)
 * - 409: Already processed (idempotent)
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPaymentCallback, validateCallbackSignature } from '@/lib/voucher/payment-callback';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Extract required fields
    const { dealId, externalTransactionId, amountPaid, currency, paymentStatus, customerReference, callbackSignature, callbackTimestamp, ...callbackPayload } = body;

    // Validate required fields
    if (!dealId || !externalTransactionId || amountPaid === undefined || !currency || !paymentStatus || !customerReference || !callbackSignature || !callbackTimestamp) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: [
            'dealId',
            'externalTransactionId',
            'amountPaid',
            'currency',
            'paymentStatus',
            'customerReference',
            'callbackSignature',
            'callbackTimestamp',
          ],
        },
        { status: 400 }
      );
    }

    // Validate HMAC signature
    const signatureValidation = await validateCallbackSignature(
      dealId,
      {
        dealId,
        externalTransactionId,
        amountPaid,
        currency,
        paymentStatus,
        customerReference,
        callbackSignature,
        callbackTimestamp,
      },
      callbackSignature,
      300 // 5 minute window
    );

    if (!signatureValidation.valid) {
      return NextResponse.json(
        { error: `Signature validation failed: ${signatureValidation.error}` },
        { status: 400 }
      );
    }

    // Process payment callback
    const result = await processPaymentCallback({
      dealId,
      externalTransactionId,
      amountPaid,
      currency,
      paymentStatus,
      customerReference,
      callbackSignature,
      callbackTimestamp,
      callbackPayload,
    });

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          voucherId: result.voucherId,
          message: result.message,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

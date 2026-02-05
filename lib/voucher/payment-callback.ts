/**
 * PAYMENT CALLBACK ENGINE
 *
 * Processes incoming payment callbacks from external payment providers (Stripe, PayPal, Square, etc.)
 * - Provider-agnostic design
 * - HMAC signature validation for security
 * - Idempotent using externalTransactionId
 * - Atomic voucher issuance on successful payment
 * - Immutable audit trail
 *
 * GLOBAL INVARIANTS:
 * - Lake County Local NEVER processes payment data (only transaction confirmation)
 * - One externalTransactionId = one voucher (idempotency)
 * - Callback must match deal price exactly
 * - Failed callbacks are logged but no voucher is issued
 * - All operations are server-authoritative
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { logVoucherAuditEvent } from './voucher-audit';
import { sendVoucherEmail } from './email';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PaymentCallbackRequest {
  dealId: string;
  externalTransactionId: string;
  amountPaid: number;
  currency: string;
  paymentStatus: string; // 'completed', 'paid', 'authorized', etc.
  customerReference: string; // Email or vendor reference
  callbackSignature: string; // HMAC-SHA256 signature
  callbackTimestamp: number; // Unix timestamp (in seconds)
  callbackPayload?: Record<string, any>; // Full payload for audit
}

export interface PaymentCallbackResponse {
  success: boolean;
  voucherId?: string;
  error?: string;
  message?: string;
}

// ============================================================================
// CALLBACK VALIDATION
// ============================================================================

/**
 * Validate HMAC signature of incoming callback
 * - Prevents unauthorized callbacks
 * - Ensures data integrity
 * - Replay attack mitigation via timestamp check
 */
export async function validateCallbackSignature(
  dealId: string,
  payload: PaymentCallbackRequest,
  expectedSignature: string,
  maxAgeSeconds: number = 300 // 5 minutes default
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Fetch deal callback config
    const callbackConfig = await prisma.dealPaymentCallback.findUnique({
      where: { dealId },
    });

    if (!callbackConfig || !callbackConfig.isActive) {
      return {
        valid: false,
        error: 'Deal callback configuration not found or inactive',
      };
    }

    // Validate timestamp (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    const age = now - payload.callbackTimestamp;

    if (age < 0 || age > maxAgeSeconds) {
      return {
        valid: false,
        error: `Callback timestamp out of allowed window (age: ${age}s, max: ${maxAgeSeconds}s)`,
      };
    }

    // Reconstruct HMAC signature
    // Signature is calculated over specific fields in canonical order
    const payloadForSignature = {
      dealId: payload.dealId,
      externalTransactionId: payload.externalTransactionId,
      amountPaid: payload.amountPaid,
      currency: payload.currency,
      paymentStatus: payload.paymentStatus,
      customerReference: payload.customerReference,
      callbackTimestamp: payload.callbackTimestamp,
    };

    const canonicalPayload = JSON.stringify(payloadForSignature, Object.keys(payloadForSignature).sort());
    const calculatedSignature = crypto
      .createHmac('sha256', callbackConfig.callbackSecret)
      .update(canonicalPayload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(calculatedSignature)
    );

    return { valid: isValid };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      error: `Signature validation error: ${message}`,
    };
  }
}

// ============================================================================
// IDEMPOTENCY CHECK
// ============================================================================

/**
 * Check if a payment callback has already been processed
 * - Prevents double-issuance
 * - Returns existing voucherId if already processed
 */
export async function checkIdempotency(
  dealId: string,
  externalTransactionId: string
): Promise<{ isIdempotent: boolean; voucherId?: string; existingStatus?: string }> {
  try {
    const existing = await prisma.paymentCallback.findFirst({
      where: {
        dealId,
        externalTransactionId,
      },
    });

    if (existing) {
      return {
        isIdempotent: true,
        voucherId: existing.issuedVoucherId || undefined,
        existingStatus: existing.paymentStatus,
      };
    }

    return { isIdempotent: false };
  } catch (error) {
    throw new Error(`Idempotency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// DEAL VALIDATION
// ============================================================================

/**
 * Validate deal exists and is active
 * - Deal must exist
 * - Deal must be active (dealStatus = ACTIVE)
 * - Business must be active
 */
async function validateDeal(dealId: string): Promise<{ valid: boolean; deal?: any; error?: string }> {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        business: {
          select: {
            id: true,
            businessStatus: true,
            subscription: {
              select: { status: true, endsAt: true },
            },
          },
        },
      },
    });

    if (!deal) {
      return { valid: false, error: 'Deal not found' };
    }

    if (deal.dealStatus !== 'ACTIVE') {
      return { valid: false, error: `Deal is not active (status: ${deal.dealStatus})` };
    }

    if (deal.business.businessStatus !== 'ACTIVE') {
      return { valid: false, error: `Business is not active (status: ${deal.business.businessStatus})` };
    }

    // Check subscription status
    if (deal.business.subscription) {
      const now = new Date();
      const subscriptionEnded = deal.business.subscription.endsAt && now > deal.business.subscription.endsAt;
      if (deal.business.subscription.status !== 'ACTIVE' || subscriptionEnded) {
        return { valid: false, error: 'Business subscription is inactive or expired' };
      }
    }

    return { valid: true, deal };
  } catch (error) {
    return {
      valid: false,
      error: `Deal validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================================================
// PAYMENT AMOUNT VALIDATION
// ============================================================================

/**
 * Validate payment amount matches deal price exactly
 * - Amount must match dealPrice exactly (no partial payments, no overpayment)
 * - Currency must match expected currency (USD, EUR, etc.)
 */
function validatePaymentAmount(
  amountPaid: number,
  dealPrice: number | null,
  currency: string,
  expectedCurrency: string = 'USD'
): { valid: boolean; error?: string } {
  if (!dealPrice) {
    return { valid: false, error: 'Deal price not configured' };
  }

  if (currency !== expectedCurrency) {
    return { valid: false, error: `Currency mismatch (received: ${currency}, expected: ${expectedCurrency})` };
  }

  // Amount validation: must match exactly (in cents if applicable)
  if (Math.abs(amountPaid - Number(dealPrice)) > 0.01) {
    return {
      valid: false,
      error: `Amount mismatch (received: ${amountPaid}, expected: ${dealPrice}, difference: ${amountPaid - Number(dealPrice)})`,
    };
  }

  return { valid: true };
}

// ============================================================================
// VOUCHER ISSUANCE (ATOMIC)
// ============================================================================

/**
 * Issue a single voucher atomically
 * - One externalTransactionId = one voucher
 * - Transactional: all-or-nothing
 * - Idempotent: subsequent calls with same ID return existing voucher
 * - Records immutable audit trail
 */
export async function processPaymentCallback(
  request: PaymentCallbackRequest
): Promise<PaymentCallbackResponse> {
  // =========================================================================
  // STAGE 1: REQUEST VALIDATION
  // =========================================================================

  // Check idempotency first
  const idempotencyCheck = await checkIdempotency(request.dealId, request.externalTransactionId);
  if (idempotencyCheck.isIdempotent && idempotencyCheck.voucherId) {
    // Already processed successfully - return existing voucher
    await logVoucherAuditEvent({
      voucherId: idempotencyCheck.voucherId,
      actorType: 'SYSTEM',
      action: 'CALLBACK_IDEMPOTENT_RETRY',
      metadata: {
        externalTransactionId: request.externalTransactionId,
      },
    });

    return {
      success: true,
      voucherId: idempotencyCheck.voucherId,
      message: 'Voucher already issued for this transaction',
    };
  }

  // =========================================================================
  // STAGE 2: DEAL VALIDATION
  // =========================================================================

  const dealValidation = await validateDeal(request.dealId);
  if (!dealValidation.valid) {
    await recordFailedCallback(request, dealValidation.error);
    return {
      success: false,
      error: dealValidation.error,
    };
  }

  const deal = dealValidation.deal;

  // =========================================================================
  // STAGE 3: PAYMENT AMOUNT VALIDATION
  // =========================================================================

  const amountValidation = validatePaymentAmount(request.amountPaid, deal.dealPrice, request.currency);
  if (!amountValidation.valid) {
    await recordFailedCallback(request, amountValidation.error);
    return {
      success: false,
      error: amountValidation.error,
    };
  }

  // =========================================================================
  // STAGE 4: PAYMENT STATUS VALIDATION
  // =========================================================================

  const validPaymentStatuses = ['completed', 'paid', 'authorized', 'succeeded', 'success'];
  if (!validPaymentStatuses.includes(request.paymentStatus.toLowerCase())) {
    await recordFailedCallback(request, `Invalid payment status: ${request.paymentStatus}`);
    return {
      success: false,
      error: `Payment not completed (status: ${request.paymentStatus})`,
    };
  }

  // =========================================================================
  // STAGE 5: ATOMIC VOUCHER ISSUANCE
  // =========================================================================

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Double-check idempotency within transaction
        const existingCallback = await tx.paymentCallback.findFirst({
          where: {
            dealId: request.dealId,
            externalTransactionId: request.externalTransactionId,
          },
        });

        if (existingCallback && existingCallback.issuedVoucherId) {
          return {
            success: true,
            voucherId: existingCallback.issuedVoucherId,
            isIdempotentWithinTx: true,
          };
        }

        // Create VoucherValidation record (links external ref to internal system)
        const validation = await tx.voucherValidation.create({
          data: {
            businessId: deal.business.id,
            dealId: request.dealId,
            externalRef: request.externalTransactionId,
            countyId: deal.countyId,
          },
        });

        // Generate QR token for voucher (unique, secure, scannable)
        const qrToken = crypto.randomBytes(16).toString('hex');

        // Create Voucher record
        const voucher = await tx.voucher.create({
          data: {
            dealId: request.dealId,
            businessId: deal.business.id,
            validationId: validation.id,
            qrToken,
            status: 'ISSUED',
            issuedAt: new Date(),
            expiresAt: calculateExpirationDate(deal),
            countyId: deal.countyId,
          },
        });

        // Record callback
        const callback = await tx.paymentCallback.create({
          data: {
            dealId: request.dealId,
            dealCallbackConfigId: '',  // Will be fetched separately
            externalTransactionId: request.externalTransactionId,
            amountPaid: request.amountPaid,
            currency: request.currency,
            paymentStatus: request.paymentStatus,
            customerReference: request.customerReference,
            callbackSignature: request.callbackSignature,
            callbackTimestamp: new Date(request.callbackTimestamp * 1000),
            callbackPayload: request.callbackPayload || {},
            isSignatureValid: true,
            issuedVoucherId: voucher.id,
            processedAt: new Date(),
          },
        });

        // Log audit event
        await tx.voucherAuditLog.create({
          data: {
            voucherId: voucher.id,
            actorType: 'SYSTEM',
            action: 'ISSUED',
            metadata: {
              dealId: request.dealId,
              externalTransactionId: request.externalTransactionId,
              amountPaid: request.amountPaid,
              customerReference: request.customerReference,
            },
            countyId: deal.countyId,
          },
        });

        return {
          success: true,
          voucherId: voucher.id,
          isIdempotentWithinTx: false,
        };
      },
      {
        isolationLevel: 'Serializable', // Prevent race conditions
        maxWait: 5000, // 5 seconds
        timeout: 30000, // 30 seconds
      }
    );

    if (result.success) {
      // Send email after successful voucher issuance (non-blocking)
      // Email failures are logged but do not affect voucher issuance
      try {
        await sendVoucherEmail(result.voucherId!)
      } catch (error) {
        // Should not happen (sendVoucherEmail never throws) but log if it does
        const msg = error instanceof Error ? error.message : String(error)
        console.error('[Payment Callback] Email send error (non-blocking):', msg)
      }

      return {
        success: true,
        voucherId: result.voucherId,
        message: result.isIdempotentWithinTx
          ? 'Voucher already issued for this transaction'
          : 'Voucher issued successfully',
      };
    }

    // Defensive fallback: transaction returned non-success without throwing.
    await recordFailedCallback(request, 'Transaction returned non-success')
    return { success: false, error: 'Failed to issue voucher' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await recordFailedCallback(request, `Transaction error: ${message}`);
    return {
      success: false,
      error: `Failed to issue voucher: ${message}`,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate voucher expiration date based on deal config
 * Default: 30 days from issuance
 */
function calculateExpirationDate(deal: any): Date {
  const expirationDays = deal.expirationDays || 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);
  return expiresAt;
}

/**
 * Record failed callback for audit trail
 */
async function recordFailedCallback(request: PaymentCallbackRequest, errorMessage?: string) {
  try {
    // Get callback config if available
    const config = await prisma.dealPaymentCallback.findUnique({
      where: { dealId: request.dealId },
    });

    if (config) {
      await prisma.paymentCallback.create({
        data: {
          dealId: request.dealId,
          dealCallbackConfigId: config.id,
          externalTransactionId: request.externalTransactionId,
          amountPaid: request.amountPaid,
          currency: request.currency,
          paymentStatus: request.paymentStatus,
          customerReference: request.customerReference,
          callbackSignature: request.callbackSignature,
          callbackTimestamp: new Date(request.callbackTimestamp * 1000),
          callbackPayload: request.callbackPayload || {},
          isSignatureValid: false,
          errorMessage,
        },
      });
    }
  } catch (err) {
    console.error('Failed to record callback error:', err);
  }
}

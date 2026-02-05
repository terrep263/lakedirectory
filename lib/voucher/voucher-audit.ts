/**
 * VOUCHER AUDIT LOG
 *
 * Immutable audit trail for all voucher lifecycle events
 * - Server-side only
 * - Cannot be modified or deleted
 * - Used for admin oversight, dispute resolution, and fraud detection
 */

import { prisma } from '@/lib/prisma';

export interface VoucherAuditEventInput {
  voucherId: string;
  actorType: 'SYSTEM' | 'VENDOR' | 'ADMIN';
  actorId?: string;
  action: string; // 'ISSUED' | 'REDEEMED' | 'VOIDED' | 'EXPIRED' | 'PDF_GENERATED' | 'EMAIL_SENT'
  metadata?: Record<string, any>;
  countyId?: string;
}

/**
 * Log a voucher audit event
 * - All events are immutable once created
 * - Cannot be filtered or hidden
 * - Used for compliance and dispute resolution
 */
export async function logVoucherAuditEvent(event: VoucherAuditEventInput): Promise<void> {
  try {
    await prisma.voucherAuditLog.create({
      data: {
        voucherId: event.voucherId,
        actorType: event.actorType,
        actorId: event.actorId,
        action: event.action,
        metadata: event.metadata,
        countyId: event.countyId,
      },
    });
  } catch (error) {
    console.error('Failed to log voucher audit event:', error);
    throw new Error(`Audit logging failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve complete audit trail for a voucher
 * Used by admin for debugging and dispute resolution
 */
export async function getVoucherAuditTrail(voucherId: string): Promise<any[]> {
  try {
    return await prisma.voucherAuditLog.findMany({
      where: { voucherId },
      orderBy: { createdAt: 'asc' },
    });
  } catch (error) {
    throw new Error(`Failed to retrieve audit trail: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

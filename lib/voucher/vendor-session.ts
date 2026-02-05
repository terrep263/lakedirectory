/**
 * VENDOR SESSION MANAGEMENT
 *
 * Zero-trust PWA authentication for vendor redemption tool
 * - Server-side only (all validation happens server-side)
 * - Scoped to specific businesses/locations
 * - Expires after 8-12 hours
 * - No offline authority
 *
 * Session creation flow:
 * 1. Vendor authenticates (email/password or OAuth)
 * 2. Server validates subscription status
 * 3. Server creates time-limited session token
 * 4. Session is scoped to vendor's businesses/locations
 * 5. PWA uses token for all operations
 * 6. Session expires → no more operations allowed
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface VendorSessionPayload {
  sessionId: string;
  vendorUserId: string;
  businessIds: string[];
  locationIds: string[];
  expiresAt: Date;
}

export interface CreateSessionInput {
  vendorUserId: string;
  businessIds: string[];
  locationIds?: string[];
  durationHours?: number; // 8-12 hours default
}

// ============================================================================
// SESSION CREATION (ATOMIC)
// ============================================================================

/**
 * Create a new vendor session
 * - Validates vendor has permission to access specified businesses
 * - Validates vendor subscription is active
 * - Creates time-limited session token
 * - All validation is server-side
 */
export async function createVendorSession(input: CreateSessionInput): Promise<{ sessionToken: string; expiresAt: Date } | null> {
  try {
    // Fetch vendor user
    const vendor = await prisma.userIdentity.findUnique({
      where: { id: input.vendorUserId },
      include: {
        ownedBusiness: {
          include: {
            subscription: true,
          },
        },
        vendorOwnership: {
          include: {
            business: {
              include: {
                subscription: true,
              },
            },
          },
        },
      },
    });

    if (!vendor || vendor.role !== 'VENDOR') {
      throw new Error('Vendor not found or invalid role');
    }

    // Validate vendor subscription is active
    const businessesForVendor: string[] = [];
    if (vendor.ownedBusiness) {
      businessesForVendor.push(vendor.ownedBusiness.id);

      if (vendor.ownedBusiness.subscription) {
        const now = new Date();
        if (vendor.ownedBusiness.subscription.status !== 'ACTIVE' || (vendor.ownedBusiness.subscription.endsAt && now > vendor.ownedBusiness.subscription.endsAt)) {
          throw new Error('Vendor subscription is inactive or expired');
        }
      }
    }

    if (vendor.vendorOwnership) {
      businessesForVendor.push(vendor.vendorOwnership.business.id);

      if (vendor.vendorOwnership.business.subscription) {
        const now = new Date();
        if (vendor.vendorOwnership.business.subscription.status !== 'ACTIVE' || (vendor.vendorOwnership.business.subscription.endsAt && now > vendor.vendorOwnership.business.subscription.endsAt)) {
          throw new Error('Vendor subscription is inactive or expired');
        }
      }
    }

    // Verify requested business IDs are in vendor's permitted businesses
    const requestedBusinessIds = input.businessIds || businessesForVendor;
    const unauthorizedIds = requestedBusinessIds.filter((id) => !businessesForVendor.includes(id));
    if (unauthorizedIds.length > 0) {
      throw new Error(`Unauthorized access to businesses: ${unauthorizedIds.join(', ')}`);
    }

    // Create session
    const expirationHours = input.durationHours || 10; // Default 10 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    const sessionToken = crypto.randomBytes(32).toString('hex');

    const session = await prisma.vendorSession.create({
      data: {
        vendorUserId: input.vendorUserId,
        sessionToken,
        businessIds: requestedBusinessIds,
        locationIds: input.locationIds || [],
        isActive: true,
        expiresAt,
      },
    });

    return {
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
    };
  } catch (error) {
    console.error('Failed to create vendor session:', error);
    throw new Error(`Session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// SESSION VALIDATION
// ============================================================================

/**
 * Validate and retrieve vendor session
 * - Check session exists and is active
 * - Check session hasn't expired
 * - Return session details for use in redemption
 */
export async function validateVendorSession(sessionToken: string): Promise<VendorSessionPayload | null> {
  try {
    const session = await prisma.vendorSession.findUnique({
      where: { sessionToken },
    });

    if (!session || !session.isActive) {
      return null;
    }

    // Check expiration
    const now = new Date();
    if (now > session.expiresAt) {
      // Session expired - mark inactive
      await prisma.vendorSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      return null;
    }

    // Update last activity
    await prisma.vendorSession.update({
      where: { id: session.id },
      data: { lastActivityAt: now },
    });

    return {
      sessionId: session.id,
      vendorUserId: session.vendorUserId,
      businessIds: session.businessIds,
      locationIds: session.locationIds,
      expiresAt: session.expiresAt,
    };
  } catch (error) {
    console.error('Failed to validate vendor session:', error);
    return null;
  }
}

// ============================================================================
// SESSION REVOCATION
// ============================================================================

/**
 * Revoke a vendor session
 * - Deactivates session immediately
 * - PWA can no longer use this token
 * - Used when vendor logs out or subscription ends
 */
export async function revokeVendorSession(sessionToken: string): Promise<void> {
  try {
    await prisma.vendorSession.update({
      where: { sessionToken },
      data: { isActive: false },
    });
  } catch (error) {
    console.error('Failed to revoke vendor session:', error);
    throw new Error(`Session revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// BATCH REVOCATION (ADMIN OPERATIONS)
// ============================================================================

/**
 * Revoke all sessions for a vendor (e.g., when subscription lapses)
 * - Admin operation
 * - Used when vendor's subscription is cancelled
 */
export async function revokeAllVendorSessions(vendorUserId: string): Promise<number> {
  try {
    const result = await prisma.vendorSession.updateMany({
      where: {
        vendorUserId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return result.count;
  } catch (error) {
    console.error('Failed to revoke all vendor sessions:', error);
    throw new Error(`Batch revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// SESSION EXPIRATION CLEANUP
// ============================================================================

/**
 * Cleanup expired sessions (can run as a cron job)
 * - Marks expired sessions as inactive
 * - Reduces clutter in session table
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.vendorSession.updateMany({
      where: {
        isActive: true,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        isActive: false,
      },
    });

    return result.count;
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
    throw new Error(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

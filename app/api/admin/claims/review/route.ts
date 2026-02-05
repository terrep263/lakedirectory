import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { IdentityRole } from '@/lib/identity/types'
import { logAdminActionInTransaction } from '@/lib/admin'

export async function POST(req: NextRequest) {
  try {
    const { claimId, action, reason } = await req.json();

    // Validation
    if (!claimId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Check admin authentication
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session');
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionValue = sessionToken.value;
    if (!sessionValue.startsWith('admin-')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminAccountId = sessionValue.replace('admin-', '');

    // Verify admin account exists and has ADMIN role
    const adminAccount = await prisma.account.findUnique({
      where: { id: adminAccountId },
      select: { role: true, email: true },
    });

    if (!adminAccount || adminAccount.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminIdentity = await prisma.userIdentity.findUnique({
      where: { email: adminAccount.email },
      select: { id: true },
    })

    if (!adminIdentity) {
      return NextResponse.json(
        { error: 'Admin identity missing' },
        { status: 403 }
      )
    }

    // Get claim with business and applicant
    const claim = await prisma.businessClaim.findUnique({
      where: { id: claimId },
      include: {
        business: true,
        applicant: true,
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    if (claim.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Claim has already been reviewed' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Approve claim: Transfer ownership atomically
      await prisma.$transaction(async (tx) => {
        // Ensure or create applicant UserIdentity (schema truth for vendor ops)
        const applicantEmail = claim.applicant.email
        let applicantIdentity = await tx.userIdentity.findUnique({
          where: { email: applicantEmail },
          select: { id: true, role: true, status: true },
        })

        if (!applicantIdentity) {
          applicantIdentity = await tx.userIdentity.create({
            data: {
              email: applicantEmail,
              role: IdentityRole.VENDOR,
              status: 'ACTIVE',
            },
            select: { id: true, role: true, status: true },
          })
        } else if (applicantIdentity.role !== IdentityRole.VENDOR) {
          // Claim approval is the canonical USER -> VENDOR transition in this system.
          applicantIdentity = await tx.userIdentity.update({
            where: { id: applicantIdentity.id },
            data: { role: IdentityRole.VENDOR },
            select: { id: true, role: true, status: true },
          })
        }

        // Enforce unique vendor ownership binding
        const existingBinding = await tx.vendorOwnership.findUnique({
          where: { userId: applicantIdentity.id },
          select: { businessId: true },
        })

        if (existingBinding && existingBinding.businessId !== claim.businessId) {
          throw new Error('Applicant is already bound to a different business')
        }

        // Update business ownership
        await tx.business.update({
          where: { id: claim.businessId },
          data: {
            // Legacy owner binding (Account-based vendor dashboard)
            ownerId: claim.applicantId,
            // Canonical owner binding (Identity-based enforcement)
            ownerUserId: applicantIdentity.id,
          },
        });

        // Update applicant role to BUSINESS
        await tx.account.update({
          where: { id: claim.applicantId },
          data: {
            role: 'BUSINESS',
          },
        });

        // Create vendor ownership binding (Identity-based enforcement)
        if (!existingBinding) {
          await tx.vendorOwnership.create({
            data: {
              userId: applicantIdentity.id,
              businessId: claim.businessId,
            },
          })
        }

        // Mark claim as approved
        await tx.businessClaim.update({
          where: { id: claimId },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedBy: adminAccountId,
          },
        });

        // Audit log
        await logAdminActionInTransaction(
          tx,
          adminIdentity.id,
          'CLAIM_APPROVED',
          'CLAIM',
          claimId,
          {
            businessId: claim.businessId,
            applicantAccountId: claim.applicantId,
            applicantEmail: claim.applicant.email,
          }
        )
      });

      // TODO: Send approval email to applicant

      return NextResponse.json({
        success: true,
        message: 'Claim approved and ownership transferred',
      });
    } else {
      // Reject claim
      await prisma.$transaction(async (tx) => {
        await tx.businessClaim.update({
          where: { id: claimId },
          data: {
            status: 'REJECTED',
            reviewedAt: new Date(),
            reviewedBy: adminAccountId,
            rejectionReason: reason,
          },
        })

        await logAdminActionInTransaction(
          tx,
          adminIdentity.id,
          'CLAIM_REJECTED',
          'CLAIM',
          claimId,
          {
            businessId: claim.businessId,
            applicantAccountId: claim.applicantId,
            applicantEmail: claim.applicant.email,
            rejectionReason: reason,
          }
        )
      })

      // TODO: Send rejection email to applicant

      return NextResponse.json({
        success: true,
        message: 'Claim rejected',
      });
    }
  } catch (error: any) {
    console.error('Claim review error:', error);
    return NextResponse.json(
      { error: 'Failed to process claim review' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { businessId, ownerName, businessEmail, phone } = await req.json();

    // Validation
    if (!businessId || !ownerName || !businessEmail || !phone) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Get current user from session (simplified - should use proper auth)
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session');
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accountId = sessionToken.value;

    // Verify business exists and is unclaimed
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        ownerId: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (business.ownerId !== null) {
      return NextResponse.json(
        { error: 'This business has already been claimed' },
        { status: 400 }
      );
    }

    // Check for existing pending claim for this business
    const existingClaim = await prisma.businessClaim.findFirst({
      where: {
        businessId,
        status: 'PENDING',
      },
    });

    if (existingClaim) {
      return NextResponse.json(
        { error: 'A claim for this business is already pending review' },
        { status: 400 }
      );
    }

    // Create claim
    const claim = await prisma.businessClaim.create({
      data: {
        businessId,
        applicantId: accountId,
        ownerName,
        businessEmail: businessEmail.toLowerCase(),
        phone,
        status: 'PENDING',
      },
      select: {
        id: true,
        status: true,
        submittedAt: true,
      },
    });

    // TODO: Send notification to admin
    // TODO: Send confirmation email to applicant

    return NextResponse.json({
      success: true,
      claim,
      message: 'Claim submitted successfully. You will be notified when it is reviewed.',
    });
  } catch (error: any) {
    console.error('Claim submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit claim' },
      { status: 500 }
    );
  }
}

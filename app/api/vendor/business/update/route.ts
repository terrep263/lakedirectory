import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      description,
      category,
      address,
      city,
      state,
      zipCode,
      phone,
      website,
      logoUrl,
      coverUrl,
    } = body;

    // Check vendor authentication (simplified - should use proper auth)
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session');
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accountId = sessionToken.value;

    // Get vendor's business
    const business = await prisma.business.findUnique({
      where: {
        ownerId: accountId,
      },
      select: {
        id: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or not owned by you' },
        { status: 404 }
      );
    }

    // Update business (basic fields only - no deals, subscription, etc.)
    const updated = await prisma.business.update({
      where: {
        id: business.id,
      },
      data: {
        description,
        category,
        address,
        city,
        state,
        zipCode,
        phone,
        website,
        logoUrl,
        coverUrl,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return NextResponse.json({
      success: true,
      business: updated,
      message: 'Business updated successfully',
    });
  } catch (error: any) {
    console.error('Business update error:', error);
    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    );
  }
}

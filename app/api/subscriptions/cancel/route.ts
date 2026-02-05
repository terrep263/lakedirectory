import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session');
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accountId = sessionToken.value;

    const business = await prisma.business.findUnique({
      where: {
        ownerId: accountId,
      },
      select: {
        id: true,
        subscription: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (!business.subscription) {
      return NextResponse.json(
        { error: 'No active subscription' },
        { status: 400 }
      );
    }

    const now = new Date();
    const updated = await prisma.subscription.update({
      where: {
        id: business.subscription.id,
      },
      data: {
        status: 'CANCELED',
        endsAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: updated,
    });
  } catch (error: any) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
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
        name: true,
        monthlyVoucherAllowance: true,
        subscription: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            endsAt: true,
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json({
        hasSubscription: false,
        state: 'NONE',
      });
    }

    if (!business.subscription) {
      return NextResponse.json({
        hasSubscription: false,
        state: 'NONE',
        business: {
          id: business.id,
          name: business.name,
        },
      });
    }

    const sub = business.subscription;
    const now = new Date();

    let state = 'NONE';
    if (sub.status === 'ACTIVE') {
      if (!sub.endsAt || sub.endsAt > now) {
        state = 'ACTIVE';
      }
    } else if (sub.status === 'CANCELED') {
      state = 'CANCELED';
    }

    return NextResponse.json({
      hasSubscription: true,
      state,
      subscription: {
        id: sub.id,
        status: sub.status,
        startedAt: sub.startedAt,
        endsAt: sub.endsAt,
      },
      business: {
        id: business.id,
        name: business.name,
        monthlyVoucherAllowance: business.monthlyVoucherAllowance,
      },
    });
  } catch (error: any) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}

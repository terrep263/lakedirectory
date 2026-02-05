import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    if (!plan || !['founders-free', 'basic', 'pro'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

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

    let allowance: number | null = null;
    if (plan === 'founders-free') {
      allowance = 10;
    } else if (plan === 'basic') {
      allowance = 50;
    } else if (plan === 'pro') {
      allowance = 200;
    }

    const now = new Date();

    if (business.subscription) {
      const updated = await prisma.subscription.update({
        where: {
          id: business.subscription.id,
        },
        data: {
          status: 'ACTIVE',
          startedAt: now,
          endsAt: null,
        },
      });

      await prisma.business.update({
        where: {
          id: business.id,
        },
        data: {
          monthlyVoucherAllowance: allowance,
        },
      });

      return NextResponse.json({
        success: true,
        subscription: updated,
      });
    } else {
      const created = await prisma.subscription.create({
        data: {
          businessId: business.id,
          status: 'ACTIVE',
          startedAt: now,
          endsAt: null,
        },
      });

      await prisma.business.update({
        where: {
          id: business.id,
        },
        data: {
          monthlyVoucherAllowance: allowance,
        },
      });

      return NextResponse.json({
        success: true,
        subscription: created,
      });
    }
  } catch (error: any) {
    console.error('Subscription activation error:', error);
    return NextResponse.json(
      { error: 'Failed to activate subscription' },
      { status: 500 }
    );
  }
}

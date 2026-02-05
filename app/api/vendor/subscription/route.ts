import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateVendor } from '@/lib/vendor-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateVendor(request)
    if (!authResult.success) {
      return authResult.response
    }

    const { businessId } = authResult.vendor

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        subscription: true
      }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const subscription = business.subscription

    return NextResponse.json({
      success: true,
      data: {
        hasSubscription: !!subscription,
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              startedAt: subscription.startedAt,
              endsAt: subscription.endsAt,
              isActive: subscription.status === 'ACTIVE'
            }
          : null
      }
    })
  } catch (error) {
    console.error('Vendor subscription status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

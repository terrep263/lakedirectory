import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assignRewardPoints } from '@/lib/rewards';

/**
 * Business Recommendation Endpoint (Rewards System)
 * 
 * POST /api/business/recommend
 * Tracks business recommendations from users and awards reward points
 * Enforces one recommendation per userId per business (lifetime)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, userId } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get IP address for tracking
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Check if this userId already recommended this business (lifetime limit)
    const existingRecommendation = await prisma.recommendation.findFirst({
      where: {
        businessId,
        userId,
      },
    });

    if (existingRecommendation) {
      // Get current count
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { recommendationCount: true },
      });

      return NextResponse.json({
        success: false,
        message: 'You have already recommended this business',
        recommendCount: business?.recommendationCount || 0,
      });
    }

    // Create recommendation, increment counter, and award rewards in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get business and county info for rewards
      const business = await tx.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          recommendationCount: true,
          countyId: true,
        },
      });

      if (!business) {
        throw new Error('Business not found');
      }

      // Create recommendation record
      await tx.recommendation.create({
        data: {
          businessId,
          userId,
          ipAddress,
          userAgent,
        },
      });

      // Increment business recommendation count
      const updatedBusiness = await tx.business.update({
        where: { id: businessId },
        data: {
          recommendationCount: {
            increment: 1,
          },
        },
        select: {
          id: true,
          name: true,
          recommendationCount: true,
        },
      });

      // Award reward points (3 points for recommending)
      const rewardPoints = 3;
      await assignRewardPoints(
        userId,
        rewardPoints,
        'recommendation',
        `Recommended ${business.name}`,
        business.countyId || undefined,
        tx
      );

      return {
        business: updatedBusiness,
        rewardPoints,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Business recommended successfully',
      businessId: result.business.id,
      recommendCount: result.business.recommendationCount,
      rewardPoints: result.rewardPoints,
    });

  } catch (error) {
    console.error('Error recommending business:', error);
    
    // Check if business exists
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to recommend business' },
      { status: 500 }
    );
  }
}

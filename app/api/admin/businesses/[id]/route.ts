import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/identity';

/**
 * PATCH /api/admin/businesses/[id]
 * 
 * Update a specific business
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const adminResult = await requireAdmin(request);
    if (!adminResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate business exists
    const business = await prisma.business.findUnique({
      where: { id },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Allowed fields for update
    const allowedFields = [
      'name',
      'description',
      'category',
      'phone',
      'formattedAddress',
      'city',
      'state',
      'postalCode',
      'latitude',
      'longitude',
      'aggregateRating',
      'totalRatings',
      'businessStatus',
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Handle type conversions
    if ('latitude' in updateData) {
      updateData.latitude = updateData.latitude ? parseFloat(updateData.latitude) : null;
    }
    if ('longitude' in updateData) {
      updateData.longitude = updateData.longitude ? parseFloat(updateData.longitude) : null;
    }
    if ('aggregateRating' in updateData) {
      updateData.aggregateRating = updateData.aggregateRating
        ? parseFloat(updateData.aggregateRating)
        : null;
    }
    if ('totalRatings' in updateData) {
      updateData.totalRatings = updateData.totalRatings ? parseInt(updateData.totalRatings) : null;
    }

    const updated = await prisma.business.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      business: updated,
    });
  } catch (error) {
    console.error('[BUSINESS_EDIT_API]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

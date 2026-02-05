import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/identity';
import { getCorrelationId } from '@/lib/http/request-id';
import { apiError } from '@/lib/http/api-response';

/**
 * GET /api/admin/businesses/management
 * 
 * Fetch businesses for management interface with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request);
  try {
    const adminResult = await requireAdmin(request);
    if (!adminResult.success) {
      return apiError(401, { error: 'Unauthorized', correlationId, errorCode: 'ADMIN_REQUIRED' });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '25'));
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const source = searchParams.get('source'); // 'GOOGLE_PLACES' etc

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status) {
      where.businessStatus = status;
    }

    if (source) {
      where.ingestionSource = source;
    }

    if (city) {
      where.city = city;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { externalPlaceId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.business.count({ where });

    // Get businesses
    const businesses = await prisma.business.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        city: true,
        phone: true,
        aggregateRating: true,
        totalRatings: true,
        businessStatus: true,
        ingestionSource: true,
        externalPlaceId: true,
        coverUrl: true,
        createdAt: true,
        updatedAt: true,
        businessPage: {
          select: {
            id: true,
            isPublished: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Get unique cities for filter
    const cities = await prisma.business.findMany({
      distinct: ['city'],
      select: { city: true },
      where: { city: { not: null } },
    });

    return NextResponse.json({
      businesses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      cities: cities.map(c => c.city).filter(Boolean),
    });
  } catch (error) {
    console.error('[BUSINESS_MANAGEMENT_API]', { correlationId, error });
    return apiError(500, { error: 'Internal server error', correlationId, errorCode: 'INTERNAL' });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/identity';

/**
 * POST /api/admin/pages/feature
 *
 * Toggle featured status for a BusinessPage.
 * Updates isFeatured and featuredAt fields.
 *
 * Payload: { pageId: string, isFeatured: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    // Enforce admin access
    const adminResult = await requireAdmin(request);
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status });
    }

    const body = await request.json();
    const { pageId, isFeatured } = body;

    // Validate payload
    if (!pageId || typeof pageId !== 'string') {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    if (typeof isFeatured !== 'boolean') {
      return NextResponse.json({ error: 'isFeatured must be a boolean' }, { status: 400 });
    }

    // Check if page exists
    const existingPage = await prisma.businessPage.findUnique({
      where: { id: pageId },
    });

    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Update featured status atomically with audit log
    const result = await prisma.$transaction(async (tx) => {
      // Update BusinessPage
      const updatedPage = await tx.businessPage.update({
        where: { id: pageId },
        data: {
          isFeatured,
          featuredAt: isFeatured ? new Date() : null,
        },
        include: {
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Log admin action
      await tx.adminActionLog.create({
        data: {
          adminUserId: adminResult.data.id,
          actionType: isFeatured ? 'PAGE_FEATURED' : 'PAGE_UNFEATURED',
          targetEntityType: 'BusinessPage',
          targetEntityId: pageId,
          metadata: {
            businessId: updatedPage.businessId,
            businessName: updatedPage.business.name,
            slug: updatedPage.slug,
          },
        },
      });

      return updatedPage;
    });

    return NextResponse.json({
      success: true,
      page: {
        id: result.id,
        slug: result.slug,
        title: result.title,
        isFeatured: result.isFeatured,
        featuredAt: result.featuredAt,
      },
    });

  } catch (error) {
    console.error('Error toggling featured status:', error);
    return NextResponse.json(
      { error: 'Failed to update featured status' },
      { status: 500 }
    );
  }
}

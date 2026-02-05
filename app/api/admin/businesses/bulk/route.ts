import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/identity';
import { getCorrelationId } from '@/lib/http/request-id';
import { apiError } from '@/lib/http/api-response';
import { logAdminActionInTransaction } from '@/lib/admin';

/**
 * POST /api/admin/businesses/bulk
 * 
 * Bulk operations on businesses:
 * - delete: Remove businesses
 * - activate: Set businessStatus to ACTIVE
 * - deactivate: Set businessStatus to DRAFT/SUSPENDED
 * - update: Update specific fields
 */
export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request);
  try {
    const adminResult = await requireAdmin(request);
    if (!adminResult.success) {
      return apiError(401, { error: 'Unauthorized', correlationId, errorCode: 'ADMIN_REQUIRED' });
    }

    const admin = adminResult.data

    const body = await request.json();
    const { action, businessIds, data } = body;

    if (!action || !Array.isArray(businessIds) || businessIds.length === 0) {
      return apiError(400, {
        error: 'Missing or invalid action or businessIds',
        correlationId,
        errorCode: 'INVALID_REQUEST',
      });
    }

    let result: any = {};

    switch (action) {
      case 'delete':
        result = await prisma.$transaction(async (tx) => {
          const deleteResult = await tx.business.deleteMany({
            where: { id: { in: businessIds } },
          })

          // Audit: one entry per target businessId (schema stores IDs only)
          await Promise.all(
            businessIds.map((id: string) =>
              logAdminActionInTransaction(tx, admin.id, 'BUSINESS_DELETED', 'BUSINESS', id, {
                correlationId,
                bulk: true,
              })
            )
          )

          return deleteResult
        })
        break;

      case 'activate':
        result = await prisma.$transaction(async (tx) => {
          const updateResult = await tx.business.updateMany({
            where: { id: { in: businessIds } },
            data: { businessStatus: 'ACTIVE' },
          })

          await Promise.all(
            businessIds.map((id: string) =>
              logAdminActionInTransaction(tx, admin.id, 'BUSINESS_ACTIVATED', 'BUSINESS', id, {
                correlationId,
                bulk: true,
                newStatus: 'ACTIVE',
              })
            )
          )

          return updateResult
        })
        break;

      case 'deactivate':
        result = await prisma.$transaction(async (tx) => {
          const updateResult = await tx.business.updateMany({
            where: { id: { in: businessIds } },
            data: { businessStatus: 'DRAFT' },
          })

          await Promise.all(
            businessIds.map((id: string) =>
              logAdminActionInTransaction(tx, admin.id, 'BUSINESS_DEACTIVATED', 'BUSINESS', id, {
                correlationId,
                bulk: true,
                newStatus: 'DRAFT',
              })
            )
          )

          return updateResult
        })
        break;

      case 'update':
        if (!data) {
          return apiError(400, {
            error: 'Missing data for update action',
            correlationId,
            errorCode: 'INVALID_REQUEST',
          });
        }
        result = await prisma.$transaction(async (tx) => {
          const updateResult = await tx.business.updateMany({
            where: { id: { in: businessIds } },
            data,
          })

          await Promise.all(
            businessIds.map((id: string) =>
              logAdminActionInTransaction(tx, admin.id, 'BUSINESS_ENRICHMENT_RUN', 'BUSINESS', id, {
                correlationId,
                bulk: true,
                note: 'Bulk update via /api/admin/businesses/bulk (action=update)',
                data,
              })
            )
          )

          return updateResult
        })
        break;

      default:
        return apiError(400, {
          error: `Unknown action: ${action}`,
          correlationId,
          errorCode: 'INVALID_REQUEST',
        });
    }

    return NextResponse.json({
      success: true,
      action,
      count: result.count,
    });
  } catch (error) {
    console.error('[BULK_BUSINESS_OPS]', { correlationId, error });
    return apiError(500, { error: 'Internal server error', correlationId, errorCode: 'INTERNAL' });
  }
}

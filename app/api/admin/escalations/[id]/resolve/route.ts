/**
 * MODULE 8: Admin Operations
 * POST /api/admin/escalations/:id/resolve
 *
 * Purpose: Resolve an AI escalation with admin decision
 * Authorization:
 *   - ADMIN only
 * Rules:
 *   - Escalation must exist and be unresolved
 *   - Admin must provide resolution notes
 *   - Action is logged to audit trail
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdminContext,
  adminFailure,
  canResolveEscalation,
  resolveEscalation,
  logAdminAction,
} from '@/lib/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: escalationId } = await params

  // GUARD: Admin only (Module 8)
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) {
    return adminFailure(adminResult)
  }

  const admin = adminResult.data

  // Parse request body
  let body: { resolution: string; dismiss?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { resolution, dismiss } = body

  if (!resolution || typeof resolution !== 'string' || resolution.trim().length === 0) {
    return NextResponse.json(
      { error: 'resolution is required' },
      { status: 400 }
    )
  }

  // GUARD: Can resolve escalation
  const canResolve = await canResolveEscalation(escalationId)
  if (!canResolve.success) {
    return adminFailure(canResolve)
  }

  const { escalation } = canResolve.data

  // Resolve the escalation
  const result = await resolveEscalation(
    {
      escalationId,
      resolution: resolution.trim(),
      dismiss: dismiss || false,
    },
    admin.id
  )

  // Log admin action
  await logAdminAction(
    admin.id,
    dismiss ? 'ESCALATION_DISMISSED' : 'ESCALATION_RESOLVED',
    'ESCALATION',
    escalationId,
    {
      escalationType: escalation.escalationType,
      entityType: escalation.entityType,
      entityId: escalation.entityId,
      resolution: resolution.trim(),
      dismissed: dismiss || false,
    }
  )

  return NextResponse.json({
    success: true,
    data: {
      escalationId: result.id,
      resolvedAt: result.resolvedAt,
      resolution: result.resolution,
      dismissed: dismiss || false,
    },
  })
}

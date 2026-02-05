/**
 * NEW COUNTY LAUNCH PLAYBOOK
 * Phase Transition API
 *
 * POST /api/super-admin/launch/counties/[id]/phase
 *
 * Authorization: SUPER_ADMIN only
 *
 * Advances a county to the next phase in the launch playbook.
 * Supports phases 3-7.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, countyFailure } from '@/lib/county'
import {
  LaunchPhase,
  executePhase3MarkIngestionComplete,
  executePhase4MarkVerificationComplete,
  executePhase5SoftLaunch,
  executePhase6EnableVendorClaims,
  executePhase7PublicLaunch,
  getLaunchProgress,
  type PlacesIngestionSummary,
  type AdminVerificationResult,
} from '@/lib/county-launch'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/super-admin/launch/counties/[id]/phase
 * Advance to next launch phase
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { id: countyId } = await context.params

  // GUARD: Require SUPER_ADMIN
  const adminResult = await requireSuperAdmin(request)
  if (!adminResult.success) {
    return countyFailure(adminResult)
  }

  const admin = adminResult.data

  // Parse request body
  let body: {
    phase?: string
    metadata?: unknown
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  if (!body.phase) {
    return NextResponse.json(
      { error: 'Phase is required' },
      { status: 400 }
    )
  }

  // Get current progress
  const progressResult = await getLaunchProgress(countyId)
  if (!progressResult.success) {
    return NextResponse.json(
      { error: progressResult.error },
      { status: progressResult.status }
    )
  }

  const progress = progressResult.data

  // Execute the requested phase
  switch (body.phase) {
    case LaunchPhase.PHASE_3: {
      // Phase 3: Mark Places Ingestion Complete
      const summary = (body.metadata || {}) as PlacesIngestionSummary
      const result = await executePhase3MarkIngestionComplete(countyId, summary, admin.id)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        )
      }
      return NextResponse.json({
        success: true,
        data: {
          phase: 'PHASE_3',
          nextPhase: 'PHASE_4',
          message: 'Places ingestion marked complete. Proceed to admin verification.',
        },
      })
    }

    case LaunchPhase.PHASE_4: {
      // Phase 4: Mark Admin Verification Complete
      const verificationResult = (body.metadata || {}) as AdminVerificationResult
      const result = await executePhase4MarkVerificationComplete(countyId, verificationResult, admin.id)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        )
      }
      return NextResponse.json({
        success: true,
        data: {
          phase: 'PHASE_4',
          nextPhase: 'PHASE_5',
          message: 'Admin verification complete. Ready for soft launch.',
        },
      })
    }

    case LaunchPhase.PHASE_5: {
      // Phase 5: Soft Launch
      const result = await executePhase5SoftLaunch(countyId, admin.id)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        )
      }
      return NextResponse.json({
        success: true,
        data: {
          phase: 'PHASE_5',
          nextPhase: 'PHASE_6',
          message: 'Soft launch complete. County is now LIVE_SOFT. Proceed to enable vendor claims.',
        },
      })
    }

    case LaunchPhase.PHASE_6: {
      // Phase 6: Enable Vendor Claims
      const result = await executePhase6EnableVendorClaims(countyId, admin.id)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        )
      }
      return NextResponse.json({
        success: true,
        data: {
          phase: 'PHASE_6',
          nextPhase: 'PHASE_7',
          message: 'Vendor claims enabled. Founder program active. Ready for public launch.',
        },
      })
    }

    case LaunchPhase.PHASE_7: {
      // Phase 7: Full Public Launch
      const result = await executePhase7PublicLaunch(countyId, admin.id)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        )
      }
      return NextResponse.json({
        success: true,
        data: {
          phase: 'PHASE_7',
          nextPhase: null,
          message: 'Full public launch complete. County is now LIVE_PUBLIC.',
        },
      })
    }

    default:
      return NextResponse.json(
        { error: `Invalid phase: ${body.phase}. Use PHASE_1 and PHASE_2 specific endpoints.` },
        { status: 400 }
      )
  }
}

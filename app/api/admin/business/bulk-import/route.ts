import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/identity'
import { bulkImportFromGooglePlaces } from '@/lib/business/bulk-import'

interface BulkImportRequestBody {
  radiusMeters?: number
}

interface BulkImportResponse {
  success: boolean
  batchId?: string
  stats?: {
    citiesProcessed: string[]
    categoriesProcessed: string[]
    totalQueriesRun: number
    totalFound: number
    createdCount: number
    skippedCount: number
    errorCount: number
    completedAt: string
    duration_seconds: number
  }
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<BulkImportResponse>> {
  // GUARD: Admin only
  const adminResult = await requireAdmin(request)
  if (!adminResult.success) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: adminResult.status || 403 }
    )
  }

  const admin = adminResult.data

  // Parse body
  let body: BulkImportRequestBody = {}
  try {
    body = await request.json()
  } catch {
    // No body is fine
  }

  const radiusMeters = body.radiusMeters ?? 40000
  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  if (!apiKey) {
    console.error('[bulk-import] GOOGLE_PLACES_API_KEY not set')
    return NextResponse.json(
      { success: false, error: 'Google Places API key not configured' },
      { status: 500 }
    )
  }

  try {
    console.log(`[bulk-import] Initiated by admin ${admin.id}`)

    const stats = await bulkImportFromGooglePlaces(apiKey, admin.id, radiusMeters)

    // Log to database
    await prisma.businessImportLog.create({
      data: {
        importBatchId: stats.batchId,
        source: 'GOOGLE',
        location: {
          type: 'MultiCity',
          cities: stats.citiesProcessed,
        },
        category: stats.categoriesProcessed.join(', '),
        radiusMeters,
        createdCount: stats.createdCount,
        skippedCount: stats.skippedCount,
        errorMessage: stats.errorCount > 0 ? `${stats.errorCount} errors during batch` : null,
        completedAt: stats.completedAt,
        params: {
          radiusMeters,
          totalQueriesRun: stats.totalQueriesRun,
          totalFound: stats.totalFound,
          errorCount: stats.errorCount,
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        batchId: stats.batchId,
        stats: {
          citiesProcessed: stats.citiesProcessed,
          categoriesProcessed: stats.categoriesProcessed,
          totalQueriesRun: stats.totalQueriesRun,
          totalFound: stats.totalFound,
          createdCount: stats.createdCount,
          skippedCount: stats.skippedCount,
          errorCount: stats.errorCount,
          completedAt: stats.completedAt.toISOString(),
          duration_seconds: Math.round(stats.duration_ms / 1000),
        },
      },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[bulk-import] Batch failed:', message)

    return NextResponse.json(
      { success: false, error: `Bulk import failed: ${message}` },
      { status: 500 }
    )
  }
}

/**
 * ADMIN BULK IMPORT API
 * POST /api/admin/bulk-import
 * 
 * Initiates a bulk import job for business listings from external location
 * data provider. Import runs asynchronously.
 * 
 * LOCKED RULES:
 * - Imports are automatic
 * - Listings are visible immediately  
 * - Problems are flagged, not blocked
 * - Data source identity is never exposed
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin authentication
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const sessionValue = sessionToken.value
    if (!sessionValue.startsWith('admin-')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const adminAccountId = sessionValue.replace('admin-', '')
    const adminAccount = await prisma.account.findUnique({
      where: { id: adminAccountId },
      select: { id: true, role: true },
    })

    if (!adminAccount || adminAccount.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // 2. Parse request body
    const formData = await request.formData()
    const cityId = formData.get('cityId') as string
    const category = formData.get('category') as string

    if (!cityId || !category) {
      return NextResponse.json(
        { error: 'City and category are required' },
        { status: 400 }
      )
    }

    // 3. Verify city exists and is active
    const city = await prisma.city.findUnique({
      where: { id: cityId },
      include: { county: true },
    })

    if (!city || !city.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive city' },
        { status: 400 }
      )
    }

    // 4. Create import job
    // Note: UserIdentity will be used once the module is integrated
    // For now, we'll create the job without the createdBy reference
    const importJob = await prisma.bulkImportJob.create({
      data: {
        countyId: city.countyId,
        cityId: city.id,
        category,
        status: 'PENDING',
        // TODO: Link to UserIdentity once available
        // createdBy: adminIdentityId,
        createdBy: adminAccountId, // Temporary: using Account ID
      },
    })

    // 5. TODO: Trigger async import processing
    // This would call the external location data provider API
    // For now, just return the job ID
    
    return NextResponse.json({
      success: true,
      jobId: importJob.id,
      message: 'Import job created successfully',
      redirectTo: '/admin/bulk-import',
    })

  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      { error: 'Failed to create import job' },
      { status: 500 }
    )
  }
}

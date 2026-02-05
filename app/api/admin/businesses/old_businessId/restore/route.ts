import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/identity/auth-guards'

export async function POST(
  request: NextRequest
) {
  try {
    await requireAdmin(request)

    const url = new URL(request.url)
    const fromQuery = url.searchParams.get('businessId')
    let fromBody: string | null = null
    try {
      const body = await request.json()
      if (body?.businessId && typeof body.businessId === 'string') fromBody = body.businessId
    } catch {
      // ignore
    }
    const businessId = (fromBody || fromQuery || '').trim()
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const business = await prisma.businessCore.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    await prisma.businessCore.update({
      where: { id: businessId },
      data: { lifecycleState: 'ACTIVE' },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Restore business error:', error)
    return NextResponse.json(
      { error: 'Failed to restore business' },
      { status: 500 }
    )
  }
}

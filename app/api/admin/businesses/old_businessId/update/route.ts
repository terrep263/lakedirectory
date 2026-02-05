import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/identity/auth-guards'

export async function PATCH(
  request: NextRequest
) {
  try {
    await requireAdmin(request)

    const body = await request.json()
    const { businessId, name, category, phone, streetAddress, city, state, postalCode, primaryImagePath } = body

    const id = typeof businessId === 'string' ? businessId.trim() : ''
    if (!id) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    // No external URLs allowed
    if (
      primaryImagePath &&
      typeof primaryImagePath === 'string' &&
      (primaryImagePath.startsWith('http://') || primaryImagePath.startsWith('https://'))
    ) {
      return NextResponse.json(
        { error: 'External URLs not allowed for images' },
        { status: 400 }
      )
    }

    const business = await prisma.businessCore.findUnique({
      where: { id },
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const updatedBusiness = await prisma.businessCore.update({
      where: { id },
      data: {
        name: name.trim(),
        primaryCategory: category,
        phone: phone || null,
        streetAddress: streetAddress || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        primaryImagePath: primaryImagePath || null,
      },
    })

    return NextResponse.json({ success: true, business: updatedBusiness })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Update business error:', error)
    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    )
  }
}

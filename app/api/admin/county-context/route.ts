import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateIdentity } from '@/lib/identity'
import { IdentityRole } from '@/lib/identity/types'

/**
 * POST /api/admin/county-context
 *
 * Sets the active county context cookie (`county_context`) used by county-scoped admin APIs.
 * Requires ADMIN (with access) or SUPER_ADMIN.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateIdentity(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const identity = auth.data
  if (identity.role !== IdentityRole.ADMIN && identity.role !== IdentityRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'ADMIN role required' }, { status: 403 })
  }

  let body: { slug?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const slug = (body.slug || '').trim().toLowerCase()
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  const county = await prisma.county.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, state: true, isActive: true },
  })

  if (!county) {
    return NextResponse.json({ error: 'County not found' }, { status: 404 })
  }
  if (!county.isActive) {
    return NextResponse.json({ error: 'County is not active' }, { status: 403 })
  }

  if (identity.role === IdentityRole.ADMIN) {
    const access = await prisma.adminCountyAccess.findUnique({
      where: {
        adminId_countyId: {
          adminId: identity.id,
          countyId: county.id,
        },
      },
      select: { adminId: true },
    })

    if (!access) {
      return NextResponse.json({ error: 'Access denied to this county' }, { status: 403 })
    }
  }

  const res = NextResponse.json({
    success: true,
    data: {
      county: {
        id: county.id,
        name: county.name,
        state: county.state,
        slug: county.slug,
      },
    },
  })

  res.cookies.set('county_context', county.slug, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return res
}


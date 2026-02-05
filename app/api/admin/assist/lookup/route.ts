import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminContext, adminFailure } from '@/lib/admin'

export async function GET(request: NextRequest) {
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) return adminFailure(adminResult)

  const url = new URL(request.url)
  const emailRaw = url.searchParams.get('email') || ''
  const email = emailRaw.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const identity = await prisma.userIdentity.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, status: true, dealViolationCount: true },
  })

  if (!identity) return NextResponse.json({ error: 'Identity not found' }, { status: 404 })

  let vendor = null as null | { businessId: string; businessName: string | null }
  if (identity.role === 'VENDOR') {
    const ownership = await prisma.vendorOwnership.findUnique({
      where: { userId: identity.id },
      select: { businessId: true },
    })
    if (ownership) {
      const business = await prisma.business.findUnique({
        where: { id: ownership.businessId },
        select: { id: true, name: true },
      })
      vendor = { businessId: ownership.businessId, businessName: business?.name ?? null }
    }
  }

  return NextResponse.json({ identity, vendor })
}


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminContext, adminFailure, logAdminAction } from '@/lib/admin'

type Body = {
  vendorEmail: string
  businessId: string
  reason?: string
}

export async function POST(request: NextRequest) {
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) return adminFailure(adminResult)

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const vendorEmail = (body.vendorEmail || '').trim().toLowerCase()
  const businessId = (body.businessId || '').trim()
  const reason = (body.reason || '').trim()

  if (!vendorEmail) return NextResponse.json({ error: 'vendorEmail is required' }, { status: 400 })
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

  const vendor = await prisma.userIdentity.findUnique({
    where: { email: vendorEmail },
    select: { id: true, email: true, role: true, status: true },
  })
  if (!vendor || vendor.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Vendor identity not found' }, { status: 404 })
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, ownerUserId: true },
  })
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  // If business is already bound to a different vendor, do not override here.
  if (business.ownerUserId && business.ownerUserId !== vendor.id) {
    return NextResponse.json(
      { error: 'Business already bound to a different vendor identity' },
      { status: 409 }
    )
  }

  const existing = await prisma.vendorOwnership.findUnique({
    where: { userId: vendor.id },
    select: { businessId: true },
  })
  if (existing && existing.businessId !== businessId) {
    return NextResponse.json(
      { error: 'Vendor is already bound to a different business' },
      { status: 409 }
    )
  }

  // Create ownership binding if missing
  if (!existing) {
    await prisma.vendorOwnership.create({
      data: { userId: vendor.id, businessId },
    })
  }

  // Ensure business.ownerUserId is set (schema-truth)
  await prisma.business.update({
    where: { id: businessId },
    data: { ownerUserId: vendor.id },
  })

  await logAdminAction(
    adminResult.data.id,
    'ADMIN_ASSIST_VENDOR_BINDING_FIXED',
    'BUSINESS',
    businessId,
    {
      vendorIdentityId: vendor.id,
      vendorEmail: vendor.email,
      businessName: business.name,
      reason: reason || undefined,
    }
  )

  return NextResponse.json({ success: true })
}


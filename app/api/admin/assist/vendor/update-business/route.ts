import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminContext, adminFailure, logAdminAction } from '@/lib/admin'

type Body = {
  vendorEmail: string
  reason?: string
  updates: {
    name?: string
    phone?: string
    website?: string
    category?: string
    description?: string
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    postalCode?: string
  }
}

function cleanString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t.length > 0 ? t : undefined
}

export async function PATCH(request: NextRequest) {
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) return adminFailure(adminResult)

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const vendorEmail = cleanString(body.vendorEmail)?.toLowerCase()
  if (!vendorEmail) return NextResponse.json({ error: 'vendorEmail is required' }, { status: 400 })

  const vendor = await prisma.userIdentity.findUnique({
    where: { email: vendorEmail },
    select: { id: true, email: true, role: true },
  })
  if (!vendor || vendor.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Vendor identity not found' }, { status: 404 })
  }

  const ownership = await prisma.vendorOwnership.findUnique({
    where: { userId: vendor.id },
    select: { businessId: true },
  })
  if (!ownership) return NextResponse.json({ error: 'Vendor has no business binding' }, { status: 409 })

  const before = await prisma.business.findUnique({
    where: { id: ownership.businessId },
    select: {
      id: true,
      name: true,
      phone: true,
      website: true,
      category: true,
      description: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
    },
  })
  if (!before) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const updates = body.updates || ({} as any)
  const data = {
    name: cleanString(updates.name),
    phone: cleanString(updates.phone),
    website: cleanString(updates.website),
    category: cleanString(updates.category),
    description: cleanString(updates.description),
    addressLine1: cleanString(updates.addressLine1),
    addressLine2: cleanString(updates.addressLine2),
    city: cleanString(updates.city),
    state: cleanString(updates.state),
    postalCode: cleanString(updates.postalCode),
  }

  // Drop undefined keys
  const cleaned: Record<string, any> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) cleaned[k] = v
  }
  if (Object.keys(cleaned).length === 0) {
    return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
  }

  const after = await prisma.business.update({
    where: { id: before.id },
    data: cleaned,
    select: {
      id: true,
      name: true,
      phone: true,
      website: true,
      category: true,
      description: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
    },
  })

  await logAdminAction(
    adminResult.data.id,
    'ADMIN_ASSIST_VENDOR_BUSINESS_UPDATED',
    'BUSINESS',
    before.id,
    {
      vendorIdentityId: vendor.id,
      vendorEmail: vendor.email,
      reason: cleanString(body.reason),
      before,
      after,
    }
  )

  return NextResponse.json({ success: true, business: after })
}


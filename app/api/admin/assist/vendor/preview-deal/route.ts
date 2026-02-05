import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminContext, adminFailure, logAdminAction } from '@/lib/admin'
import { generateSeoDealFromBrief, validateBriefText } from '@/lib/deal-guard'

type Body = {
  vendorEmail: string
  brief: string
  dealCategory: string
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
  const brief = (body.brief || '').trim()
  const dealCategory = (body.dealCategory || '').trim()

  if (!vendorEmail) return NextResponse.json({ error: 'vendorEmail is required' }, { status: 400 })
  if (!brief) return NextResponse.json({ error: 'brief is required' }, { status: 400 })
  if (!dealCategory) return NextResponse.json({ error: 'dealCategory is required' }, { status: 400 })

  const briefViolation = validateBriefText(brief)
  if (briefViolation) return NextResponse.json({ error: briefViolation }, { status: 400 })

  const vendorIdentity = await prisma.userIdentity.findUnique({
    where: { email: vendorEmail },
    select: { id: true, email: true, role: true },
  })

  if (!vendorIdentity || vendorIdentity.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Vendor identity not found' }, { status: 404 })
  }

  const ownership = await prisma.vendorOwnership.findUnique({
    where: { userId: vendorIdentity.id },
    select: { businessId: true },
  })
  if (!ownership) {
    return NextResponse.json({ error: 'Vendor has no business ownership binding' }, { status: 409 })
  }

  const business = await prisma.business.findUnique({
    where: { id: ownership.businessId },
    select: { id: true, name: true, city: true, state: true },
  })
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const generated = await generateSeoDealFromBrief({
    brief,
    businessName: business.name,
    businessCity: business.city,
    businessState: business.state,
    dealCategory,
  })

  // Audit (read-only preview; no money-path mutation)
  await logAdminAction(
    adminResult.data.id,
    'BUSINESS_ENRICHMENT_RUN', // reuse an existing safe action type to avoid new governance types
    'BUSINESS',
    business.id,
    {
      kind: 'ADMIN_ASSIST_VENDOR_DEAL_PREVIEW',
      vendorIdentityId: vendorIdentity.id,
      vendorEmail: vendorIdentity.email,
      brief,
      locked: generated.raw,
    }
  )

  return NextResponse.json({
    success: true,
    vendor: { id: vendorIdentity.id, email: vendorIdentity.email },
    business,
    parsed: generated.parsed,
    draft: generated.draft,
  })
}


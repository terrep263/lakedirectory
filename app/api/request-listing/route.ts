import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const honeypot = typeof body?.companyWebsite === 'string' ? body.companyWebsite.trim() : ''
    if (honeypot) {
      return NextResponse.json({ success: true })
    }

    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const businessName = typeof body?.businessName === 'string' ? body.businessName.trim() : ''
    const city = typeof body?.city === 'string' ? body.city.trim() : ''
    const category = typeof body?.category === 'string' ? body.category.trim() : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''

    if (!name || !email || !businessName) {
      return NextResponse.json(
        { error: 'Name, email, and business name are required.' },
        { status: 400 }
      )
    }

    if (!email.includes('@') || email.length > 254) {
      return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message is too long.' }, { status: 400 })
    }

    await prisma.adminEscalation.create({
      data: {
        escalationType: 'LISTING_REQUEST',
        severity: 'MEDIUM',
        entityType: 'PUBLIC',
        entityId: 'request-listing',
        description: `Listing request from ${name} (${email}) for "${businessName}".`,
        metadata: {
          name,
          email,
          phone: phone || undefined,
          businessName,
          city: city || undefined,
          category: category || undefined,
          message: message || undefined,
          source: 'public_request_form',
        } as any,
      },
    })

    return NextResponse.json({
      success: true,
      message:
        "Thanks — we received your request. Our team reviews submissions and will reach out if it’s a fit.",
    })
  } catch (error) {
    console.error('request-listing error:', error)
    return NextResponse.json({ error: 'Failed to submit request.' }, { status: 500 })
  }
}


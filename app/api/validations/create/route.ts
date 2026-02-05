import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCUID } from '@/lib/voucher-utils'

export async function POST(request: NextRequest) {
  try {
    const { externalRef, businessId, dealId } = await request.json()

    if (!externalRef || !businessId || !dealId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const deal = await prisma.deal.findUnique({
      where: { id: dealId }
    })

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    if (deal.businessId !== businessId) {
      return NextResponse.json(
        { error: 'Deal does not belong to this business' },
        { status: 400 }
      )
    }

    const existingValidation = await prisma.voucherValidation.findUnique({
      where: { externalRef }
    })

    if (existingValidation) {
      return NextResponse.json({
        success: true,
        message: 'Validation already exists',
        validation: {
          id: existingValidation.id,
          externalRef: existingValidation.externalRef,
          validatedAt: existingValidation.validatedAt
        }
      })
    }

    const validation = await prisma.voucherValidation.create({
      data: {
        id: generateCUID(),
        externalRef,
        businessId,
        dealId,
        validatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Validation created successfully',
      validation: {
        id: validation.id,
        externalRef: validation.externalRef,
        validatedAt: validation.validatedAt
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Validation creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create validation' },
      { status: 500 }
    )
  }
}

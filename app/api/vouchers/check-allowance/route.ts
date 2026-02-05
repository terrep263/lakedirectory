import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Voucher Issuance Allowance Enforcement
 * 
 * Purpose: Enforce monthly voucher issuance limits per vendor
 * 
 * Scope:
 * - Controls voucher creation only
 * - Does NOT affect voucher validity, redemption, or enforcement
 * - Allowances reset automatically at start of each month
 * - No rollover - unused allowance disappears
 * - No pre-generation of vouchers
 * - No stored rollover state
 * 
 * Business Rule:
 * - If vendor has no allowance set (null): unlimited issuance
 * - If vendor has allowance set: enforce monthly limit
 * - Count resets automatically each calendar month (no migration needed)
 */

interface AllowanceCheckRequest {
  businessId: string
  requestedCount?: number
}

interface AllowanceCheckResponse {
  allowed: boolean
  currentMonthIssued: number
  monthlyAllowance: number | null
  remaining: number | null
  message: string
}

/**
 * Get the count of vouchers issued by a business in the current calendar month
 */
export async function getCurrentMonthIssuedCount(businessId: string): Promise<number> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const count = await prisma.voucher.count({
    where: {
      businessId,
      issuedAt: {
        gte: monthStart,
        lte: monthEnd
      }
    }
  })

  return count
}

/**
 * Check if a business can issue vouchers based on monthly allowance
 */
export async function checkVoucherAllowance(
  businessId: string,
  requestedCount: number = 1
): Promise<AllowanceCheckResponse> {
  // Get business with allowance
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { monthlyVoucherAllowance: true }
  })

  if (!business) {
    return {
      allowed: false,
      currentMonthIssued: 0,
      monthlyAllowance: null,
      remaining: null,
      message: 'Business not found'
    }
  }

  // If no allowance is set, allow unlimited issuance
  if (business.monthlyVoucherAllowance === null) {
    return {
      allowed: true,
      currentMonthIssued: 0,
      monthlyAllowance: null,
      remaining: null,
      message: 'No monthly allowance set. Unlimited issuance allowed.'
    }
  }

  // Get current month's issued count
  const currentMonthIssued = await getCurrentMonthIssuedCount(businessId)
  const allowance = business.monthlyVoucherAllowance
  const remaining = Math.max(0, allowance - currentMonthIssued)

  // Check if request would exceed allowance
  const allowed = (currentMonthIssued + requestedCount) <= allowance

  let message = ''
  if (allowed) {
    if (requestedCount === 1) {
      message = `Issuance allowed. ${remaining - requestedCount} vouchers remaining this month.`
    } else {
      message = `Issuance allowed. ${remaining - requestedCount} vouchers remaining after this issuance.`
    }
  } else {
    const excess = (currentMonthIssued + requestedCount) - allowance
    message = `Monthly allowance exceeded. Requested ${requestedCount}, but only ${remaining} remaining. Would exceed by ${excess}.`
  }

  return {
    allowed,
    currentMonthIssued,
    monthlyAllowance: allowance,
    remaining,
    message
  }
}

/**
 * API endpoint to check voucher allowance before issuance
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')
    const requestedCount = parseInt(searchParams.get('requestedCount') || '1')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId query parameter is required' },
        { status: 400 }
      )
    }

    if (requestedCount < 1) {
      return NextResponse.json(
        { error: 'requestedCount must be at least 1' },
        { status: 400 }
      )
    }

    const result = await checkVoucherAllowance(businessId, requestedCount)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Allowance check error:', error)
    return NextResponse.json(
      { error: 'Internal server error during allowance check' },
      { status: 500 }
    )
  }
}

/**
 * API endpoint to get current month statistics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId } = body

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { 
        monthlyVoucherAllowance: true,
        name: true
      }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const currentMonthIssued = await getCurrentMonthIssuedCount(businessId)
    const now = new Date()
    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    return NextResponse.json({
      businessName: business.name,
      month: monthName,
      currentMonthIssued,
      monthlyAllowance: business.monthlyVoucherAllowance,
      remaining: business.monthlyVoucherAllowance 
        ? Math.max(0, business.monthlyVoucherAllowance - currentMonthIssued)
        : null,
      unlimited: business.monthlyVoucherAllowance === null
    }, { status: 200 })
  } catch (error) {
    console.error('Month statistics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

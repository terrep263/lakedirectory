import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateVendor } from '@/lib/vendor-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateVendor(request)
    if (!authResult.success) {
      return authResult.response
    }

    const { businessId } = authResult.vendor

    const vouchersIssued = await prisma.voucher.count({
      where: {
        businessId,
        status: 'ISSUED'
      }
    })

    const vouchersRedeemed = await prisma.voucher.count({
      where: {
        businessId,
        status: 'REDEEMED'
      }
    })

    const totalVouchers = vouchersIssued + vouchersRedeemed

    return NextResponse.json({
      success: true,
      data: {
        totalVouchers,
        vouchersIssued,
        vouchersRedeemed,
        activeVouchers: vouchersIssued
      }
    })
  } catch (error) {
    console.error('Vendor voucher activity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

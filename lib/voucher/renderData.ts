/**
 * Voucher Render Data
 *
 * Converts database models to render-safe objects for PDF generation.
 * Contains NO business logic, formatting, or assumptions.
 * Purely data transformation.
 */

import { prisma } from '@/lib/prisma'

export interface VoucherRenderData {
  voucherId: string
  businessName: string
  businessLogo: string | null
  dealTitle: string
  dealDescription: string | null
  expiresAt: Date
  qrToken: string
}

/**
 * Fetch all data required to render a voucher PDF
 * Read-only access only
 */
export async function getVoucherRenderData(
  voucherId: string
): Promise<VoucherRenderData | null> {
  // Fetch voucher with relationships
  const voucher = await prisma.voucher.findUnique({
    where: { id: voucherId },
    select: {
      id: true,
      qrToken: true,
      expiresAt: true,
      deal: {
        select: {
          id: true,
          title: true,
          description: true,
          business: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
      },
    },
  })

  if (!voucher) {
    return null
  }

  // Prefer Business.logoUrl (note: PDF generator only embeds data: URLs; http(s) URLs are skipped for determinism)
  const logo = voucher.deal.business.logoUrl || null

  return {
    voucherId: voucher.id,
    businessName: voucher.deal.business.name,
    businessLogo: logo,
    dealTitle: voucher.deal.title,
    dealDescription: voucher.deal.description,
    expiresAt: voucher.expiresAt || new Date(),
    qrToken: voucher.qrToken,
  }
}

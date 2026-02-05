import type { Prisma } from '@prisma/client'

export type BusinessWithPage = Prisma.BusinessGetPayload<{
  include: { businessPage: { select: { slug: true; title: true; aiDescription: true; heroImageUrl: true; isFeatured: true; isPublished: true } } }
}>

export type NormalizedAddress = {
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  formattedAddress: string | null
}

/**
 * Canonical normalization rules for Business-as-truth.
 * NOTE: No schema changes; this is an adapter over existing fields.
 */
export const BusinessDTO = {
  publicSlug(b: { id: string; slug: string | null; businessPage?: { slug: string } | null }): string {
    return b.businessPage?.slug || b.slug || b.id
  },

  displayName(b: { name: string; businessPage?: { title: string | null } | null }): string {
    return b.businessPage?.title || b.name
  },

  displayDescription(b: { description: string | null; businessPage?: { aiDescription: string | null } | null }): string | null {
    return b.businessPage?.aiDescription || b.description || null
  },

  heroImageUrl(b: { coverUrl: string | null; logoUrl: string | null; businessPage?: { heroImageUrl: string | null } | null }): string | null {
    return b.businessPage?.heroImageUrl || b.coverUrl || b.logoUrl || null
  },

  /**
   * Address normalization:
   * - Prefer structured fields (addressLine1/addressLine2/postalCode)
   * - Fall back to legacy (address/zipCode)
   * - Keep formattedAddress if present
   */
  address(b: {
    addressLine1: string | null
    addressLine2: string | null
    address: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    zipCode: string | null
    formattedAddress: string | null
  }): NormalizedAddress {
    return {
      line1: b.addressLine1 || b.address || null,
      line2: b.addressLine2 || null,
      city: b.city || null,
      state: b.state || null,
      postalCode: b.postalCode || b.zipCode || null,
      formattedAddress: b.formattedAddress || null,
    }
  },

  /**
   * Featured status truth:
   * - Businesses: `BusinessPage.isFeatured` is authoritative.
   * - If BusinessPage missing, treat as not featured.
   */
  isFeatured(b: { businessPage?: { isFeatured: boolean } | null }): boolean {
    return b.businessPage?.isFeatured || false
  },
} as const


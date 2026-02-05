import type { Prisma } from '@prisma/client'
import { BusinessDTO } from '@/lib/dto/business.dto'

export type BusinessSelectForDisplay = Prisma.BusinessGetPayload<{
  include: {
    businessPage: {
      select: {
        slug: true
        title: true
        aiDescription: true
        heroImageUrl: true
        isFeatured: true
        isPublished: true
      }
    }
  }
}>

/**
 * Adapter helpers to keep UI/API responses consistent with schema truth.
 * These functions are intentionally small and composable.
 */
export function toPublicBusinessSlug(business: BusinessSelectForDisplay): string {
  return BusinessDTO.publicSlug(business)
}

export function toDisplayName(business: BusinessSelectForDisplay): string {
  return BusinessDTO.displayName(business)
}

export function toDisplayDescription(business: BusinessSelectForDisplay): string | null {
  return BusinessDTO.displayDescription(business)
}

export function toIsFeatured(business: BusinessSelectForDisplay): boolean {
  return BusinessDTO.isFeatured(business)
}


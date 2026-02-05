import { prisma } from '@/lib/prisma'

export async function validatePriceCap(
  price: number,
  category: string
): Promise<string | null> {
  const cat = category.trim().toLowerCase() || 'other'

  const cap = await prisma.dealPriceCap.findUnique({
    where: { category: cat },
    select: { minPrice: true, maxPrice: true },
  })

  const chosen = cap
    ? cap
    : await prisma.dealPriceCap.findUnique({
        where: { category: 'other' },
        select: { minPrice: true, maxPrice: true },
      })

  if (!chosen) return null

  const min = Number(chosen.minPrice)
  const max = Number(chosen.maxPrice)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null

  if (price < min || price > max) {
    return `Price $${price} outside ${cap ? cat : 'other'} range ($${min} - $${max})`
  }

  return null
}


import { PrismaClient, DealStatus, DealGuardStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed default Deal Guard price caps (idempotent)
  const caps: Array<{ category: string; minPrice: number; maxPrice: number }> = [
    { category: 'restaurant', minPrice: 5.0, maxPrice: 75.0 },
    { category: 'auto', minPrice: 20.0, maxPrice: 300.0 },
    { category: 'beauty', minPrice: 15.0, maxPrice: 200.0 },
    { category: 'fitness', minPrice: 10.0, maxPrice: 150.0 },
    { category: 'entertainment', minPrice: 5.0, maxPrice: 100.0 },
    { category: 'retail', minPrice: 5.0, maxPrice: 500.0 },
    { category: 'services', minPrice: 10.0, maxPrice: 300.0 },
    { category: 'other', minPrice: 5.0, maxPrice: 200.0 },
  ]

  for (const cap of caps) {
    await prisma.dealPriceCap.upsert({
      where: { category: cap.category },
      create: {
        category: cap.category,
        minPrice: cap.minPrice,
        maxPrice: cap.maxPrice,
      },
      update: {
        minPrice: cap.minPrice,
        maxPrice: cap.maxPrice,
      },
    })
  }

  // Backfill: keep existing ACTIVE deals visible by default
  await prisma.deal.updateMany({
    where: {
      dealStatus: DealStatus.ACTIVE,
      guardStatus: DealGuardStatus.PENDING,
    },
    data: { guardStatus: DealGuardStatus.APPROVED },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


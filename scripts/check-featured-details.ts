import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const featured = await prisma.businessCore.findMany({
    where: { isFeatured: true },
    select: {
      id: true,
      name: true,
      city: true,
      primaryCategory: true,
      rating: true,
      reviewCount: true,
      primaryImagePath: true,
      streetAddress: true,
      state: true,
      phone: true,
    },
    take: 4,
  })

  console.log('Featured businesses with all details:')
  console.log(JSON.stringify(featured, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

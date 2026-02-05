import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check if there are any businesses in BusinessCore
  const allBusinesses = await prisma.businessCore.findMany({
    select: {
      id: true,
      name: true,
      isFeatured: true,
      lifecycleState: true,
    },
    take: 10,
  })

  console.log('Total businesses found:', allBusinesses.length)
  console.log('Businesses:', JSON.stringify(allBusinesses, null, 2))

  // Check featured businesses
  const featuredCount = await prisma.businessCore.count({
    where: { isFeatured: true },
  })

  console.log('\nFeatured businesses count:', featuredCount)

  // If no featured businesses, mark some as featured
  if (featuredCount === 0 && allBusinesses.length > 0) {
    console.log('\nNo featured businesses found. Marking first 3 as featured...')
    
    for (let i = 0; i < Math.min(3, allBusinesses.length); i++) {
      await prisma.businessCore.update({
        where: { id: allBusinesses[i].id },
        data: { isFeatured: true },
      })
      console.log(`✓ Marked "${allBusinesses[i].name}" as featured`)
    }
  }

  const updated = await prisma.businessCore.findMany({
    where: { isFeatured: true },
    select: {
      id: true,
      name: true,
      city: true,
      primaryCategory: true,
      isFeatured: true,
    },
  })

  console.log('\nFeatured businesses after update:')
  console.log(JSON.stringify(updated, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

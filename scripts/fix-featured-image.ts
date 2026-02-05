import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Use first existing image for the problematic business
  const updated = await prisma.businessCore.update({
    where: { id: '7217d0ba-9925-4a16-9b51-8ff13777d12d' },
    data: { primaryImagePath: '/business-assets/08896182-6afd-4633-81d1-9637505c81c1.jpg' },
  })

  console.log('Updated primaryImagePath for:', updated.name)
  console.log('New path:', updated.primaryImagePath)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

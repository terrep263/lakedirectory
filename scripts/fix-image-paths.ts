import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Fix the invalid primaryImagePath for D & G Auto Repair
  const updated = await prisma.businessCore.update({
    where: { id: '7217d0ba-9925-4a16-9b51-8ff13777d12d' },
    data: { primaryImagePath: '/business-assets/7217d0ba-9925-4a16-9b51-8ff13777d12d.jpg' },
  })

  console.log('Fixed invalid path for:', updated.name)
  console.log('New primaryImagePath:', updated.primaryImagePath)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

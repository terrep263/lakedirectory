import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Normalizes category labels to consistent Title Case.
 * Example: car_repair -> Car Repair
 */
async function run() {
  const replacements: Record<string, string> = {
    'car_repair': 'Car Repair',
    'car repair': 'Car Repair',
    'Car_repair': 'Car Repair',
  }

  let updated = 0

  for (const [from, to] of Object.entries(replacements)) {
    const result = await prisma.business.updateMany({
      where: { category: from },
      data: { category: to },
    })
    updated += result.count
  }

  console.log(`Updated categories -> Car Repair: ${updated}`)
}

run()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

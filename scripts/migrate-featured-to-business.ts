import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Find all featured businesses in BusinessCore
    const featuredCore = await prisma.businessCore.findMany({
      where: { isFeatured: true },
      select: { id: true, name: true },
    })

    if (featuredCore.length === 0) {
      console.log('No featured businesses found in BusinessCore')
      return
    }

    console.log(`Found ${featuredCore.length} featured businesses in BusinessCore`)

    // For each BusinessCore featured business, find matching Business and mark as featured
    let updatedCount = 0
    for (const core of featuredCore) {
      const business = await prisma.business.findFirst({
        where: { name: { equals: core.name, mode: 'insensitive' } },
        select: { id: true, name: true },
      })

      if (business) {
        await prisma.business.update({
          where: { id: business.id },
          data: {
            isFeatured: true,
            featuredAt: new Date(),
          },
        })
        console.log(`✓ Updated ${business.name} (${business.id})`)
        updatedCount++
      } else {
        console.log(`✗ No Business record found for ${core.name}`)
      }
    }

    console.log(`\nMigration complete: ${updatedCount} businesses updated`)
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

import { prisma } from '@/lib/prisma'

/**
 * Generate slugs for all businesses that don't have one
 * This ensures all businesses are accessible via /business/[slug] routing
 */
async function generateSlugs() {
  try {
    // Get all businesses without slugs
    const businessesWithoutSlugs = await prisma.business.findMany({
      where: {
        slug: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    })

    console.log(`Found ${businessesWithoutSlugs.length} businesses without slugs`)

    if (businessesWithoutSlugs.length === 0) {
      console.log('All businesses already have slugs!')
      return
    }

    // Generate slug from business name
    function generateSlug(name: string): string {
      return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .slice(0, 100) // Limit length
    }

    // Update each business
    for (const business of businessesWithoutSlugs) {
      let slug = generateSlug(business.name)
      let counter = 1

      // Ensure slug is unique
      while (true) {
        const existingBusiness = await prisma.business.findUnique({
          where: { slug },
          select: { id: true },
        })

        if (!existingBusiness || existingBusiness.id === business.id) {
          break
        }

        // Append counter if slug already exists
        const baseSlugs = slug.split('-')
        slug = `${baseSlugs.slice(0, -1).join('-')}-${counter}`
        counter++
      }

      await prisma.business.update({
        where: { id: business.id },
        data: { slug },
      })

      console.log(`✓ Updated ${business.name} → /business/${slug}`)
    }

    // Verify all businesses now have slugs
    const allBusinesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      },
    })

    const stillMissing = allBusinesses.filter((b) => !b.slug)
    console.log(`\n✅ Complete! Total businesses: ${allBusinesses.length}`)
    console.log(`   Businesses without slugs: ${stillMissing.length}`)

    if (stillMissing.length === 0) {
      console.log('\n🎉 All businesses are now accessible at /business/[slug]!')
    }
  } catch (error) {
    console.error('Error generating slugs:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

generateSlugs()

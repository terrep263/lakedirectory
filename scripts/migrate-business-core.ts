/**
 * Migration: Move BusinessCore entries to Business table with proper slugs
 * 
 * Purpose: Convert 51 businesses from BusinessCore to Business model
 * to enable dynamic page generation at /business/[slug]
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)
}

async function migrateBusinesses() {
  try {
    console.log('🔄 Starting BusinessCore → Business migration...\n')

    // Get all BusinessCore entries
    const businessCoreEntries = await prisma.businessCore.findMany({
      orderBy: { name: 'asc' },
    })

    console.log(`📊 Found ${businessCoreEntries.length} businesses in BusinessCore`)

    let created = 0
    let skipped = 0
    let errors = 0

    for (const core of businessCoreEntries) {
      try {
        // Check if business already exists
        const existing = await prisma.business.findUnique({
          where: { id: core.id },
        })

        if (existing) {
          console.log(`⏭️  Skipped: ${core.name} (already exists)`)
          skipped++
          continue
        }

        // Generate slug
        let slug = generateSlug(core.name)
        let counter = 1

        // Ensure unique slug
        while (true) {
          const existingSlug = await prisma.business.findUnique({
            where: { slug },
          })
          if (!existingSlug) break
          slug = `${generateSlug(core.name)}-${counter}`
          counter++
        }

        // Create Business record
        await prisma.business.create({
          data: {
            id: core.id,
            name: core.name,
            slug,
            description: `${core.name} - ${core.primaryCategory}`, // Auto-description
            category: core.primaryCategory,
            address: core.streetAddress,
            city: core.city,
            state: core.state,
            zipCode: core.postalCode,
            phone: core.phone || undefined,
            latitude: core.latitude || undefined,
            longitude: core.longitude || undefined,
            // Set default/draft status
            businessStatus: 'DRAFT',
          },
        })

        console.log(`✅ Created: ${core.name}`)
        console.log(`   → /business/${slug}`)
        created++
      } catch (err) {
        console.error(`❌ Error migrating ${core.name}:`, err)
        errors++
      }
    }

    console.log(`\n📈 Migration Results:`)
    console.log(`   ✅ Created: ${created}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    console.log(`   ❌ Errors: ${errors}`)

    // Verify
    const allBusinesses = await prisma.business.findMany({
      select: { id: true, name: true, slug: true },
    })

    console.log(
      `\n✨ Total businesses now accessible: ${allBusinesses.length}`
    )
    console.log(`🎉 All businesses are accessible at /business/[slug]!\n`)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrateBusinesses()

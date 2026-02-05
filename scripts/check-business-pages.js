#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Get all businesses
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        countyId: true,
        description: true,
        addressLine1: true,
        city: true,
      },
      orderBy: { name: 'asc' },
    })

    console.log(`\n📊 BUSINESS PAGE STATUS REPORT`)
    console.log(`================================`)
    console.log(`Total businesses: ${businesses.length}\n`)

    const withSlug = businesses.filter((b) => b.slug)
    const withoutSlug = businesses.filter((b) => !b.slug)
    const withCounty = businesses.filter((b) => b.countyId)
    const withDescription = businesses.filter((b) => b.description)

    console.log(`✓ Businesses with slug: ${withSlug.length}/${businesses.length}`)
    console.log(`✗ Businesses without slug: ${withoutSlug.length}/${businesses.length}`)
    console.log(`✓ Businesses with countyId: ${withCounty.length}/${businesses.length}`)
    console.log(`✓ Businesses with description: ${withDescription.length}/${businesses.length}`)

    if (withoutSlug.length > 0) {
      console.log(`\n⚠️  Businesses needing slugs:`)
      withoutSlug.slice(0, 10).forEach((b) => {
        console.log(`   - ${b.name}`)
      })
      if (withoutSlug.length > 10) {
        console.log(`   ... and ${withoutSlug.length - 10} more`)
      }
    }

    console.log(`\n📝 Sample businesses:`)
    businesses.slice(0, 5).forEach((b) => {
      const status = b.slug ? `✓` : `✗`
      console.log(`   ${status} ${b.name}`)
      if (b.slug) console.log(`      → /business/${b.slug}`)
    })

    if (businesses.length > 5) {
      console.log(`   ... and ${businesses.length - 5} more`)
    }

    // Next steps
    console.log(`\n📋 NEXT STEPS:`)
    console.log(`1. Run: npx ts-node scripts/generate-business-slugs.ts`)
    console.log(`2. All ${businesses.length} businesses will be accessible at /business/[slug]`)
    console.log(`3. Pages generate on-demand via Next.js dynamic routing\n`)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

import { prisma } from '@/lib/prisma'
import { fetchEligibleBusinesses } from '@/lib/admin/enrichmentQueries'

async function test() {
  console.log('Testing enrichment system...\n')

  // 1. Check eligible businesses
  console.log('1. Fetching eligible businesses...')
  try {
    const eligible = await fetchEligibleBusinesses()
    console.log(`   ✓ Found ${eligible.length} eligible businesses`)
    if (eligible.length > 0) {
      console.log(`   Sample: ${eligible[0].name} (${eligible[0].id})`)
      console.log(`   - externalPlaceId: ${eligible[0].externalPlaceId}`)
      console.log(`   - description: ${eligible[0].description ? 'present' : 'empty'}`)
      console.log(`   - logoUrl: ${eligible[0].logoUrl ? 'present' : 'empty'}`)
    }
  } catch (err) {
    console.error('   ✗ Error fetching eligible businesses:', err)
    return
  }

  // 2. Check database query directly
  console.log('\n2. Raw database check (GOOGLE source with no description/logoUrl)...')
  try {
    const count = await prisma.business.count({
      where: {
        ingestionSource: 'GOOGLE',
        externalPlaceId: { not: null },
        OR: [
          { description: null },
          { description: '' },
          { logoUrl: null },
          { logoUrl: '' },
        ],
      },
    })
    console.log(`   ✓ Database query returns ${count} matches`)
  } catch (err) {
    console.error('   ✗ Error:', err)
    return
  }

  // 3. Check Google Places API key
  console.log('\n3. Checking Google Places API key...')
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (apiKey) {
    console.log('   ✓ API key is configured')
  } else {
    console.warn('   ✗ WARNING: GOOGLE_PLACES_API_KEY not set')
  }

  console.log('\n✓ Enrichment system is ready')
  process.exit(0)
}

test().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

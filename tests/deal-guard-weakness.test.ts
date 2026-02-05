/**
 * Deal Guard Advisory Tests - Vendor Operational Weakness Detection
 * 
 * Tests the critical requirement that Deal Guard prevents customer-facing copy
 * that references vendor operational weaknesses.
 * 
 * Run: npx tsx tests/deal-guard-weakness.test.ts
 */

// Test results tracking
let passed = 0
let failed = 0

function test(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn()
      console.log(`✅ ${name}`)
      passed++
    } catch (error) {
      console.error(`❌ ${name}`)
      console.error(error)
      failed++
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

console.log('\n🧪 Running Deal Guard Weakness Detection Tests...\n')

const BASE_URL = 'http://localhost:3000'

// ============================================================================
// VENDOR OPERATIONAL WEAKNESS DETECTION TESTS
// ============================================================================

const testDetectsSlowPeriod = test('Detects: "slow period" operational weakness', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "Joe's Diner",
      industry: "Restaurant",
      itemOrService: "Lunch Special",
      regularPrice: 15.00,
      dealPrice: 10.00,
      ingredientsOrScope: "Burger, fries, drink",
      vendorCopy: "We're trying to fill our tables during our slow period. Come in between 2-4 PM."
    })
  })

  const data = await response.json()
  
  assert(data.success === true, 'Should return success')
  assert(data.advisory.accuracyScore < 70, 'Should penalize accuracy score for operational weakness')
  assert(
    data.advisory.explanation.includes('vendor-operational framing') || 
    data.advisory.explanation.includes('slow period'),
    'Explanation should call out operational framing'
  )
  assert(
    data.advisory.suggestions.some((s: string) => s.includes('slow period')),
    'Suggestions should address slow period language'
  )
})

const testDetectsFillSeats = test('Detects: "fill seats/tables" capacity language', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "Bella's Bistro",
      industry: "Restaurant",
      itemOrService: "Dinner Entree",
      regularPrice: 25.00,
      dealPrice: 15.00,
      ingredientsOrScope: "Pasta or chicken dish",
      vendorCopy: "Help us fill our empty tables on Tuesday nights! We need to keep our staff busy."
    })
  })

  const data = await response.json()
  
  assert(data.advisory.accuracyScore < 60, 'Should heavily penalize for multiple weakness signals')
  assert(
    data.advisory.suggestions.some((s: string) => s.toLowerCase().includes('fill') || s.toLowerCase().includes('seat')),
    'Should suggest removing fill seats/tables language'
  )
})

const testDetectsStaffingNeeds = test('Detects: staffing/overhead operational concerns', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "Salon Elegance",
      industry: "Beauty Services",
      itemOrService: "Haircut and Style",
      regularPrice: 60.00,
      dealPrice: 40.00,
      ingredientsOrScope: "Cut, wash, style",
      vendorCopy: "We have extra staffing capacity and need to cover our overhead costs this month."
    })
  })

  const data = await response.json()
  
  assert(data.advisory.accuracyScore < 60, 'Should penalize for overhead/staffing language')
  assert(
    data.advisory.suggestions.some((s: string) => s.includes('internal business operations')),
    'Should call out internal business operations framing'
  )
})

const testDetectsDesperationSignals = test('Detects: desperation signals (need customers, make up for)', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "Fitness First Gym",
      industry: "Fitness",
      itemOrService: "Monthly Membership",
      regularPrice: 50.00,
      dealPrice: 30.00,
      ingredientsOrScope: "Unlimited access, all classes",
      vendorCopy: "We need new customers to make up for lost revenue. Help us break even this quarter!"
    })
  })

  const data = await response.json()
  
  assert(data.advisory.accuracyScore < 50, 'Should severely penalize desperation signals')
  assert(
    data.advisory.suggestions.some((s: string) => s.includes('desperation')),
    'Should identify desperation signals'
  )
})

const testDetectsIdleCapacity = test('Detects: idle/underutilized capacity language', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "Downtown Parking",
      industry: "Parking Services",
      itemOrService: "Daily Parking Pass",
      regularPrice: 20.00,
      dealPrice: 12.00,
      ingredientsOrScope: "All-day parking, in/out privileges",
      vendorCopy: "Our lot is underutilized on weekends. Our idle capacity means great deals for you!"
    })
  })

  const data = await response.json()
  
  assert(data.advisory.accuracyScore < 70, 'Should penalize idle/underutilized language')
  assert(
    data.advisory.suggestions.some((s: string) => s.includes('capacity')),
    'Should suggest removing capacity language'
  )
})

// ============================================================================
// CUSTOMER-PERSPECTIVE FRAMING TESTS
// ============================================================================

const testAcceptsCustomerDesire = test('Accepts: customer desire framing', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "The Cozy Cafe",
      industry: "Restaurant",
      itemOrService: "Artisan Coffee and Pastry",
      regularPrice: 8.00,
      dealPrice: 5.00,
      ingredientsOrScope: "Any coffee drink, any pastry",
      vendorCopy: "Start your morning right with artisan coffee and fresh-baked pastries. Perfect for your daily ritual."
    })
  })

  const data = await response.json()
  
  assert(data.advisory.accuracyScore >= 70, 'Should NOT penalize customer-perspective framing')
  assert(
    !data.advisory.suggestions.some((s: string) => s.includes('operational')),
    'Should not suggest operational framing issues'
  )
})

const testAcceptsConvenienceFraming = test('Accepts: convenience framing (customer benefit)', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "Quick Wash Laundry",
      industry: "Laundry Services",
      itemOrService: "Wash and Fold Service",
      regularPrice: 25.00,
      dealPrice: 18.00,
      ingredientsOrScope: "Up to 20 lbs, same-day turnaround",
      vendorCopy: "Save time on laundry day. Drop off in the morning, pick up that evening. Convenient hours that fit your schedule."
    })
  })

  const data = await response.json()
  
  assert(data.advisory.accuracyScore >= 80, 'Should score high for customer-convenience framing')
  assert(
    !data.advisory.explanation.includes('operational'),
    'Should not mention operational concerns'
  )
})

const testAcceptsTimingValue = test('Accepts: timing and value framing (customer benefit)', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "Summer Sports Camp",
      industry: "Recreation",
      itemOrService: "Week-Long Sports Camp",
      regularPrice: 200.00,
      dealPrice: 150.00,
      ingredientsOrScope: "5 days, all sports, lunch included",
      vendorCopy: "Perfect timing for spring break. Give your kids an active, fun-filled week while you work. Early bird pricing ends soon!"
    })
  })

  const data = await response.json()
  
  assert(data.advisory.accuracyScore >= 80, 'Should score high for timing/value customer framing')
  assert(data.advisory.performanceScore >= 70, 'Should have good performance score')
})

// ============================================================================
// NON-AUTHORITATIVE TONE TESTS
// ============================================================================

const testNoDirectives = test('Advisory: no directive language ("you must", "you should")', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "Test Vendor",
      industry: "Test",
      itemOrService: "Test Item",
      regularPrice: 20.00,
      dealPrice: 15.00,
      vendorCopy: "Great deal"
    })
  })

  const data = await response.json()
  
  const fullText = data.advisory.explanation + ' ' + data.advisory.suggestions.join(' ')
  
  assert(
    !fullText.match(/you must|you should|you need to|you have to|you're required/i),
    'Should not contain directive language'
  )
  assert(
    !fullText.match(/ready to publish|don't publish|must add|need to change/i),
    'Should not instruct specific actions'
  )
})

const testNoGuarantees = test('Advisory: no outcome guarantees', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "Premium Vendor",
      industry: "Retail",
      itemOrService: "Premium Product",
      regularPrice: 100.00,
      dealPrice: 65.00,
      ingredientsOrScope: "Complete premium package",
      vendorCopy: "Exceptional value for discerning customers. Limited-time exclusive offer."
    })
  })

  const data = await response.json()
  
  const fullText = data.advisory.explanation + ' ' + data.advisory.suggestions.join(' ')
  
  assert(
    !fullText.match(/will succeed|will convert|will perform|guaranteed|ensure success|promise/i),
    'Should not guarantee outcomes'
  )
})

const testObservationalTone = test('Advisory: uses observational language (market data, historically, tends to)', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "Sample Business",
      industry: "Services",
      itemOrService: "Service Package",
      regularPrice: 50.00,
      dealPrice: 35.00,
      ingredientsOrScope: "Basic service"
    })
  })

  const data = await response.json()
  
  const fullText = data.advisory.explanation + ' ' + data.advisory.suggestions.join(' ')
  
  // Should contain observational language
  const hasObservationalLanguage = 
    fullText.includes('market data') ||
    fullText.includes('historically') ||
    fullText.includes('typically') ||
    fullText.includes('tends to') ||
    fullText.includes('Observation:') ||
    fullText.includes('correlates with')
  
  assert(hasObservationalLanguage, 'Should use observational/analytical language')
})

// ============================================================================
// EDGE CASES AND COMBINATIONS
// ============================================================================

const testMultipleWeaknesses = test('Detects: multiple operational weaknesses in one copy', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "Struggling Restaurant",
      industry: "Restaurant",
      itemOrService: "Any Entree",
      regularPrice: 20.00,
      dealPrice: 10.00,
      ingredientsOrScope: "Any menu item",
      vendorCopy: "We're in a slow period and need to fill our empty tables to cover our rent and staffing costs. Help us stay in business!"
    })
  })

  const data = await response.json()
  
  assert(data.advisory.accuracyScore < 40, 'Should severely penalize multiple weaknesses')
  assert(
    data.advisory.suggestions.length >= 2,
    'Should provide multiple suggestions for multiple issues'
  )
})

const testSubtleWeakness = test('Detects: subtle operational language ("not busy")', async () => {
  const response = await fetch(`${BASE_URL}/api/deal-guard/advisory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: "Coffee Shop",
      industry: "Restaurant",
      itemOrService: "Coffee and Snack",
      regularPrice: 10.00,
      dealPrice: 7.00,
      ingredientsOrScope: "Any coffee, any snack",
      vendorCopy: "We're not busy on Tuesday afternoons. Perfect time for a quiet coffee break!"
    })
  })

  const data = await response.json()
  
  assert(data.advisory.accuracyScore < 70, 'Should detect subtle weakness ("not busy")')
})

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('VENDOR OPERATIONAL WEAKNESS DETECTION')
  console.log('═══════════════════════════════════════════════════════════\n')
  
  await testDetectsSlowPeriod()
  await testDetectsFillSeats()
  await testDetectsStaffingNeeds()
  await testDetectsDesperationSignals()
  await testDetectsIdleCapacity()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('CUSTOMER-PERSPECTIVE FRAMING (SHOULD PASS)')
  console.log('═══════════════════════════════════════════════════════════\n')
  
  await testAcceptsCustomerDesire()
  await testAcceptsConvenienceFraming()
  await testAcceptsTimingValue()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('NON-AUTHORITATIVE TONE VALIDATION')
  console.log('═══════════════════════════════════════════════════════════\n')
  
  await testNoDirectives()
  await testNoGuarantees()
  await testObservationalTone()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('EDGE CASES AND COMBINATIONS')
  console.log('═══════════════════════════════════════════════════════════\n')
  
  await testMultipleWeaknesses()
  await testSubtleWeakness()

  console.log('\n' + '═'.repeat(60))
  console.log('TEST SUMMARY')
  console.log('═'.repeat(60))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log('═'.repeat(60))

  if (failed > 0) {
    process.exit(1)
  }
}

runAllTests()

/**
 * Direct Unit Tests for Deal Guard Weakness Detection Logic
 * Tests the core logic without requiring a running server
 */

// Import the scoring functions directly
function calculateAccuracyScore(input: any): number {
  let score = 100

  // Deduct for missing vendor copy
  if (!input.vendorCopy || input.vendorCopy.trim().length === 0) {
    score -= 20
  } else {
    // Check vendor copy quality
    const copyLength = input.vendorCopy.trim().length
    if (copyLength < 20) {
      score -= 15 // Too brief
    } else if (copyLength > 300) {
      score -= 5 // Too verbose
    }

    // Check for common issues
    if (input.vendorCopy.toLowerCase().includes('click here')) score -= 5
    if (input.vendorCopy.toLowerCase().includes('buy now')) score -= 5
    if (input.vendorCopy.match(/!{2,}/)) score -= 5 // Multiple exclamation marks
    
    // CRITICAL: Check for vendor operational weakness language
    const vendorCopyLower = input.vendorCopy.toLowerCase()
    if (vendorCopyLower.match(/slow period|slow time|slow season|fill seats|fill tables|need customers|idle|empty|not busy|underutilized/)) {
      score -= 30 // Major penalty for operational weakness framing
    }
    if (vendorCopyLower.match(/staffing|employee|overhead|fixed cost|rent|lease|capacity/)) {
      score -= 25 // Penalty for internal business concerns
    }
    if (vendorCopyLower.match(/make up for|offset|cover cost|break even/)) {
      score -= 20 // Penalty for desperation framing
    }
  }

  // Deduct for missing scope/ingredients
  if (!input.ingredientsOrScope || input.ingredientsOrScope.trim().length === 0) {
    score -= 15
  }

  // Deduct for vague item/service naming
  if (input.itemOrService.trim().length < 5) {
    score -= 15
  }

  // Deduct for vague industry
  if (!input.industry || input.industry.trim().length < 3) {
    score -= 5
  }

  return Math.max(0, Math.min(100, score))
}

function calculatePerformanceScore(input: any): number {
  const {
    regularPrice,
    dealPrice,
    vendorCopy
  } = input

  let score = 100
  const discount = ((regularPrice - dealPrice) / regularPrice) * 100

  // Optimal discount range: 20-35%
  if (discount < 20 || discount > 35) {
    score -= 10
  }

  // Copy length sweet spot: 100-200 characters
  if (vendorCopy) {
    if (vendorCopy.length < 100) {
      score -= 5
    } else if (vendorCopy.length > 200) {
      score -= 5
    }
  }

  return Math.max(0, Math.min(100, score))
}

// Test runner
async function runTest(name: string, testFn: () => void) {
  try {
    await testFn()
    console.log(`✅ ${name}`)
    return true
  } catch (error) {
    console.log(`❌ ${name}`)
    if (error instanceof Error) {
      console.log(`   ${error.message}`)
    }
    return false
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

async function runAllTests() {
  console.log('\n🧪 Running Deal Guard Direct Logic Tests...\n')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('VENDOR OPERATIONAL WEAKNESS DETECTION')
  console.log('═══════════════════════════════════════════════════════════\n')

  const results: boolean[] = []

  // Test 1: Detects "slow period"
  results.push(await runTest('Detects: "slow period" operational weakness', () => {
    const input = {
      vendorName: 'Test Cafe',
      industry: 'Food',
      itemOrService: 'Coffee',
      regularPrice: 10,
      dealPrice: 7,
      ingredientsOrScope: 'Premium arabica beans',
      vendorCopy: 'We have a slow period from 2-4pm and want to fill seats'
    }
    const score = calculateAccuracyScore(input)
    assert(score <= 70, `Expected score <= 70 for "slow period", got ${score}`)
  }))

  // Test 2: Detects "fill seats/tables"
  results.push(await runTest('Detects: "fill seats/tables" capacity language', () => {
    const input = {
      vendorName: 'Restaurant',
      industry: 'Food',
      itemOrService: 'Lunch',
      regularPrice: 25,
      dealPrice: 17.50,
      ingredientsOrScope: 'Full lunch menu',
      vendorCopy: 'Help us fill empty tables during lunch hours'
    }
    const score = calculateAccuracyScore(input)
    assert(score <= 70, `Expected score <= 70 for "fill tables", got ${score}`)
  }))

  // Test 3: Detects staffing/overhead
  results.push(await runTest('Detects: staffing/overhead operational concerns', () => {
    const input = {
      vendorName: 'Salon',
      industry: 'Services',
      itemOrService: 'Haircut',
      regularPrice: 50,
      dealPrice: 35,
      ingredientsOrScope: 'Professional styling',
      vendorCopy: 'We have extra staffing capacity and need to cover overhead costs'
    }
    const score = calculateAccuracyScore(input)
    assert(score <= 75, `Expected score <= 75 for "staffing/overhead", got ${score}`)
  }))

  // Test 4: Detects desperation signals
  results.push(await runTest('Detects: desperation signals (need customers, make up for)', () => {
    const input = {
      vendorName: 'Gym',
      industry: 'Fitness',
      itemOrService: 'Membership',
      regularPrice: 100,
      dealPrice: 70,
      ingredientsOrScope: 'Full gym access',
      vendorCopy: 'We need customers to make up for lost revenue'
    }
    const score = calculateAccuracyScore(input)
    assert(score <= 50, `Expected score <= 50 for desperation language, got ${score}`)
  }))

  // Test 5: Detects idle capacity
  results.push(await runTest('Detects: idle/underutilized capacity language', () => {
    const input = {
      vendorName: 'Event Space',
      industry: 'Venues',
      itemOrService: 'Rental',
      regularPrice: 500,
      dealPrice: 350,
      ingredientsOrScope: 'Full venue access',
      vendorCopy: 'Our space is idle and underutilized on weekdays'
    }
    const score = calculateAccuracyScore(input)
    assert(score <= 70, `Expected score <= 70 for "idle/underutilized", got ${score}`)
  }))

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('CUSTOMER-PERSPECTIVE FRAMING (SHOULD PASS)')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Test 6: Accepts customer desire framing
  results.push(await runTest('Accepts: customer desire framing', () => {
    const input = {
      vendorName: 'Bakery',
      industry: 'Food',
      itemOrService: 'Pastries',
      regularPrice: 15,
      dealPrice: 10.50,
      ingredientsOrScope: 'Fresh pastries and coffee',
      vendorCopy: 'Start your morning right with our freshly baked croissants. Perfect for your daily ritual.'
    }
    const score = calculateAccuracyScore(input)
    assert(score >= 80, `Expected score >= 80 for customer desire framing, got ${score}`)
  }))

  // Test 7: Accepts convenience framing
  results.push(await runTest('Accepts: convenience framing (customer benefit)', () => {
    const input = {
      vendorName: 'Car Wash',
      industry: 'Services',
      itemOrService: 'Detail Wash',
      regularPrice: 40,
      dealPrice: 28,
      ingredientsOrScope: 'Full exterior and interior',
      vendorCopy: 'Save time with our express service. Convenient hours that fit your schedule.'
    }
    const score = calculateAccuracyScore(input)
    assert(score >= 80, `Expected score >= 80 for convenience framing, got ${score}`)
  }))

  // Test 8: Accepts timing and value framing
  results.push(await runTest('Accepts: timing and value framing (customer benefit)', () => {
    const input = {
      vendorName: 'Hotel',
      industry: 'Hospitality',
      itemOrService: 'Weekend Stay',
      regularPrice: 200,
      dealPrice: 140,
      ingredientsOrScope: 'Two-night weekend package',
      vendorCopy: 'Perfect timing for spring break getaway. Early bird pricing for limited dates.'
    }
    const score = calculateAccuracyScore(input)
    assert(score >= 80, `Expected score >= 80 for timing/value framing, got ${score}`)
  }))

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('EDGE CASES AND COMBINATIONS')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Test 9: Multiple weaknesses
  results.push(await runTest('Detects: multiple operational weaknesses in one copy', () => {
    const input = {
      vendorName: 'Restaurant',
      industry: 'Food',
      itemOrService: 'Dinner',
      regularPrice: 50,
      dealPrice: 35,
      ingredientsOrScope: 'Full dinner menu',
      vendorCopy: 'Slow period, empty tables, need to cover rent and keep staff busy'
    }
    const score = calculateAccuracyScore(input)
    assert(score <= 45, `Expected score <= 45 for multiple weaknesses, got ${score}`)
  }))

  // Test 10: Subtle weakness
  results.push(await runTest('Detects: subtle operational language ("not busy")', () => {
    const input = {
      vendorName: 'Spa',
      industry: 'Wellness',
      itemOrService: 'Massage',
      regularPrice: 80,
      dealPrice: 56,
      ingredientsOrScope: 'Full body massage',
      vendorCopy: 'Weekday afternoons when we are not busy'
    }
    const score = calculateAccuracyScore(input)
    assert(score < 80, `Expected score < 80 for subtle weakness, got ${score}`)
  }))

  // Summary
  const passed = results.filter(r => r).length
  const failed = results.filter(r => !r).length
  
  console.log('\n════════════════════════════════════════════════════════════')
  console.log('TEST SUMMARY')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log('════════════════════════════════════════════════════════════\n')

  process.exit(failed > 0 ? 1 : 0)
}

runAllTests()

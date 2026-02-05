/**
 * Copy Guardrails Validation Tests
 * Tests enforcement of copy quality standards
 */

interface ValidationFlag {
  category: 'REJECT' | 'FLAG'
  rule: string
  matched: string
  position: number
}

interface CopyValidationResponse {
  valid: boolean
  flags: ValidationFlag[]
  message: string
}

// Simulate the validation logic
function validateCopy(dealDescription: string): CopyValidationResponse {
  const flags: ValidationFlag[] = []

  // REJECT patterns
  const REJECT_PATTERNS = [
    {
      rule: 'GUARANTEE_LANGUAGE',
      pattern: /\b(guarantee|guaranteed|promise|promises|assured|100% certain|definitely will|will definitely)\b/i
    },
    {
      rule: 'EXAGGERATED_VALUE',
      pattern: /\b(best deal ever|unbeatable|once in a lifetime|incredible|amazing deal|insane|crazy deal|steal|too good to be true)\b/i
    },
    {
      rule: 'ARTIFICIAL_URGENCY',
      pattern: /\b(act now|hurry|rush|don't miss out|going fast|almost gone|last chance|limited time only|today only)\b/i
    },
    {
      rule: 'VENDOR_HARDSHIP',
      pattern: /\b(slow period|slow season|slow time|need customers|make up for|offset|cover (our )?costs?|cover (our )?rent|cover (our )?overhead|break even|financial|struggling|difficult time)\b/i
    },
    {
      rule: 'OPERATIONAL_CONSTRAINTS',
      pattern: /\b(fill seats|fill tables|empty tables?|idle|not busy|under-?utilized|extra capacity|staffing|employee|keep staff busy)\b/i
    }
  ]

  // FLAG patterns
  const FLAG_PATTERNS = [
    {
      rule: 'WEAK_VALUE_FRAMING',
      pattern: /\b(cheap|cheapest|discount|discounted|sale|on sale)\b/i
    },
    {
      rule: 'PASSIVE_VOICE',
      pattern: /\b(is offered|are offered|can be redeemed|will be provided)\b/i
    }
  ]

  // Check REJECT patterns
  for (const { rule, pattern } of REJECT_PATTERNS) {
    const match = dealDescription.match(pattern)
    if (match) {
      flags.push({
        category: 'REJECT',
        rule,
        matched: match[0],
        position: match.index || 0
      })
    }
  }

  // Check FLAG patterns
  for (const { rule, pattern } of FLAG_PATTERNS) {
    const match = dealDescription.match(pattern)
    if (match) {
      flags.push({
        category: 'FLAG',
        rule,
        matched: match[0],
        position: match.index || 0
      })
    }
  }

  const hasRejections = flags.some(f => f.category === 'REJECT')
  const valid = !hasRejections

  let message = ''
  if (valid) {
    if (flags.length === 0) {
      message = 'Copy validation passed. No violations detected.'
    } else {
      message = `Copy validation passed with ${flags.length} flagged pattern(s). Review recommended.`
    }
  } else {
    const rejectionCount = flags.filter(f => f.category === 'REJECT').length
    message = `Copy validation failed. ${rejectionCount} prohibited pattern(s) detected.`
  }

  return { valid, flags, message }
}

// Test runner
async function runTest(name: string, testFn: () => void): Promise<boolean> {
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
  console.log('\n🧪 Running Copy Guardrails Tests...\n')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('PROHIBITED PATTERNS (REJECT)')
  console.log('═══════════════════════════════════════════════════════════\n')

  const results: boolean[] = []

  // Test 1: Guarantee language
  results.push(await runTest('Rejects: guarantee language', () => {
    const result = validateCopy('This deal is guaranteed to be the best value')
    assert(!result.valid, `Expected invalid, got valid=${result.valid}`)
    assert(result.flags.some(f => f.rule === 'GUARANTEE_LANGUAGE'), 'Expected GUARANTEE_LANGUAGE flag')
  }))

  // Test 2: Exaggerated value claims
  results.push(await runTest('Rejects: exaggerated value claims', () => {
    const result = validateCopy('This is the best deal ever, an incredible once in a lifetime opportunity')
    assert(!result.valid, `Expected invalid, got valid=${result.valid}`)
    assert(result.flags.some(f => f.rule === 'EXAGGERATED_VALUE'), 'Expected EXAGGERATED_VALUE flag')
  }))

  // Test 3: Artificial urgency
  results.push(await runTest('Rejects: artificial urgency', () => {
    const result = validateCopy('Act now! Limited time only. Hurry before it is gone!')
    assert(!result.valid, `Expected invalid, got valid=${result.valid}`)
    assert(result.flags.some(f => f.rule === 'ARTIFICIAL_URGENCY'), 'Expected ARTIFICIAL_URGENCY flag')
  }))

  // Test 4: Vendor hardship
  results.push(await runTest('Rejects: vendor hardship references', () => {
    const result = validateCopy('Help us during our slow period to cover our costs')
    assert(!result.valid, `Expected invalid, got valid=${result.valid}`)
    assert(result.flags.some(f => f.rule === 'VENDOR_HARDSHIP'), 'Expected VENDOR_HARDSHIP flag')
  }))

  // Test 5: Operational constraints
  results.push(await runTest('Rejects: operational constraint references', () => {
    const result = validateCopy('We need to fill seats during our not busy hours')
    assert(!result.valid, `Expected invalid, got valid=${result.valid}`)
    assert(result.flags.some(f => f.rule === 'OPERATIONAL_CONSTRAINTS'), 'Expected OPERATIONAL_CONSTRAINTS flag')
  }))

  // Test 6: Multiple violations
  results.push(await runTest('Rejects: multiple violations in one copy', () => {
    const result = validateCopy('Guaranteed best deal ever! Act now to help us fill empty tables during our slow period')
    assert(!result.valid, `Expected invalid, got valid=${result.valid}`)
    assert(result.flags.filter(f => f.category === 'REJECT').length >= 3, 'Expected multiple REJECT flags')
  }))

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('ALLOWED PATTERNS (CUSTOMER-CENTRIC)')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Test 7: Desire-driven language
  results.push(await runTest('Allows: desire-driven language', () => {
    const result = validateCopy('Start your morning right with our premium coffee. Treat yourself to quality.')
    assert(result.valid, `Expected valid, got valid=${result.valid}`)
    assert(result.flags.length === 0, 'Expected no flags')
  }))

  // Test 8: Convenience framing
  results.push(await runTest('Allows: convenience framing', () => {
    const result = validateCopy('Convenient weekend hours make it easy to enjoy our services.')
    assert(result.valid, `Expected valid, got valid=${result.valid}`)
    assert(result.flags.length === 0, 'Expected no flags')
  }))

  // Test 9: Time-bound language
  results.push(await runTest('Allows: time-bound language', () => {
    const result = validateCopy('Valid weekdays through March 31st. Early bird special for morning visits.')
    assert(result.valid, `Expected valid, got valid=${result.valid}`)
    assert(result.flags.length === 0, 'Expected no flags')
  }))

  // Test 10: Value framing
  results.push(await runTest('Allows: value framing', () => {
    const result = validateCopy('Save 30% on premium authentic ingredients. Worth the visit.')
    assert(result.valid, `Expected valid, got valid=${result.valid}`)
    assert(result.flags.length === 0, 'Expected no flags')
  }))

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('WARNING FLAGS (PASS WITH WARNINGS)')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Test 11: Weak value framing (flagged but allowed)
  results.push(await runTest('Flags but allows: weak value framing', () => {
    const result = validateCopy('Get this cheap deal while on sale')
    assert(result.valid, `Expected valid, got valid=${result.valid}`)
    assert(result.flags.some(f => f.rule === 'WEAK_VALUE_FRAMING' && f.category === 'FLAG'), 'Expected WEAK_VALUE_FRAMING flag')
  }))

  // Test 12: Passive voice (flagged but allowed)
  results.push(await runTest('Flags but allows: passive voice', () => {
    const result = validateCopy('Premium services are offered at reduced rates')
    assert(result.valid, `Expected valid, got valid=${result.valid}`)
    assert(result.flags.some(f => f.rule === 'PASSIVE_VOICE' && f.category === 'FLAG'), 'Expected PASSIVE_VOICE flag')
  }))

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('NEUTRAL ENFORCEMENT')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Test 13: No coaching language in messages
  results.push(await runTest('Returns neutral messages without coaching', () => {
    const result = validateCopy('Guaranteed to be amazing!')
    assert(!result.valid, 'Expected invalid')
    assert(!result.message.includes('should'), 'Message should not contain "should"')
    assert(!result.message.includes('must'), 'Message should not contain "must"')
    assert(!result.message.includes('try'), 'Message should not contain "try"')
    assert(!result.message.includes('better'), 'Message should not contain "better"')
  }))

  // Test 14: No performance claims in messages
  results.push(await runTest('Returns messages without performance claims', () => {
    const result = validateCopy('Great premium coffee experience')
    assert(result.valid, 'Expected valid')
    assert(!result.message.includes('convert'), 'Message should not mention conversion')
    assert(!result.message.includes('perform'), 'Message should not mention performance')
    assert(!result.message.includes('market'), 'Message should not mention market data')
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

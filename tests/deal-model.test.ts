/**
 * Deal Model Logic Tests
 * 
 * Tests for deal configuration validation, expiration enforcement, and validity windows.
 * 
 * Run: npx tsx tests/deal-model.test.ts
 */

import { 
  validateDealConfig, 
  isValidIssuanceTime, 
  calculateVoucherExpiration, 
  isVoucherExpired,
  MAX_VOUCHER_EXPIRATION_HOURS,
  type DealConfig,
  DayOfWeek 
} from '../lib/deal-config'

// Test results tracking
let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (error) {
    console.error(`❌ ${name}`)
    console.error(error)
    failed++
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertArrayEquals(actual: string[], expected: string[], message: string) {
  if (actual.length !== expected.length || !actual.every((v, i) => v === expected[i])) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`)
  }
}

console.log('\n🧪 Running Deal Model Logic Tests...\n')

// ============================================================================
// VALIDATION TESTS
// ============================================================================

test('validateDealConfig: accepts valid configuration with all fields', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Get 50% off all entrees from 5-7 PM on weekdays. Valid for dine-in only.',
    voucherExpirationHours: 720, // 30 days
    validityWindows: [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '17:00', endTime: '19:00' },
      { dayOfWeek: DayOfWeek.TUESDAY, startTime: '17:00', endTime: '19:00' }
    ]
  }

  const result = validateDealConfig(config)
  assert(result.valid === true, 'Should be valid')
  assert(result.errors.length === 0, 'Should have no errors')
})

test('validateDealConfig: accepts valid configuration without validity windows', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Buy one pizza, get one free. Valid for carryout orders.',
    voucherExpirationHours: 168 // 7 days
  }

  const result = validateDealConfig(config)
  assert(result.valid === true, 'Should be valid')
  assert(result.errors.length === 0, 'Should have no errors')
})

test('validateDealConfig: rejects missing canonical description', () => {
  const config: Partial<DealConfig> = {
    voucherExpirationHours: 720
  }

  const result = validateDealConfig(config)
  assert(result.valid === false, 'Should be invalid')
  assert(result.errors.includes('Canonical description is required'), 'Should have description error')
})

test('validateDealConfig: rejects empty canonical description', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: '',
    voucherExpirationHours: 720
  }

  const result = validateDealConfig(config)
  assert(result.valid === false, 'Should be invalid')
  assert(result.errors.includes('Canonical description is required'), 'Should have description error')
})

test('validateDealConfig: rejects short canonical description (< 10 chars)', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Too short',
    voucherExpirationHours: 720
  }

  const result = validateDealConfig(config)
  assert(result.valid === false, 'Should be invalid')
  assert(result.errors.includes('Canonical description must be at least 10 characters'), 'Should have length error')
})

test('validateDealConfig: rejects missing expiration hours', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Valid description here'
  }

  const result = validateDealConfig(config)
  assert(result.valid === false, 'Should be invalid')
  assert(result.errors.includes('Voucher expiration hours is required'), 'Should have expiration error')
})

test('validateDealConfig: rejects zero expiration hours (no indefinite vouchers)', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Valid description here',
    voucherExpirationHours: 0
  }

  const result = validateDealConfig(config)
  assert(result.valid === false, 'Should be invalid')
  assert(result.errors.includes('Voucher expiration must be greater than 0 (no indefinite vouchers)'), 'Should reject zero')
})

test('validateDealConfig: rejects negative expiration hours', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Valid description here',
    voucherExpirationHours: -24
  }

  const result = validateDealConfig(config)
  assert(result.valid === false, 'Should be invalid')
  assert(result.errors.includes('Voucher expiration must be greater than 0 (no indefinite vouchers)'), 'Should reject negative')
})

test('validateDealConfig: rejects expiration exceeding platform maximum', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Valid description here',
    voucherExpirationHours: 3000 // Exceeds 2160 hour maximum
  }

  const result = validateDealConfig(config)
  assert(result.valid === false, 'Should be invalid')
  assert(result.errors.includes(`Voucher expiration cannot exceed ${MAX_VOUCHER_EXPIRATION_HOURS} hours (90 days)`), 'Should reject exceeding maximum')
})

test('validateDealConfig: accepts expiration at platform maximum (2160 hours)', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Valid description here',
    voucherExpirationHours: MAX_VOUCHER_EXPIRATION_HOURS
  }

  const result = validateDealConfig(config)
  assert(result.valid === true, 'Should be valid at maximum')
  assert(result.errors.length === 0, 'Should have no errors')
})

test('validateDealConfig: rejects non-whole number expiration hours', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Valid description here',
    voucherExpirationHours: 24.5
  }

  const result = validateDealConfig(config)
  assert(result.valid === false, 'Should be invalid')
  assert(result.errors.includes('Voucher expiration must be a whole number of hours'), 'Should reject decimal')
})

test('validateDealConfig: rejects invalid time format in validity windows', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Valid description here',
    voucherExpirationHours: 720,
    validityWindows: [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '5:00 PM', endTime: '7:00 PM' } // Invalid format
    ]
  }

  const result = validateDealConfig(config)
  assert(result.valid === false, 'Should be invalid')
  assert(result.errors.some(e => e.includes('must be in HH:MM format')), 'Should have time format error')
})

test('validateDealConfig: rejects end time before start time', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Valid description here',
    voucherExpirationHours: 720,
    validityWindows: [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '19:00', endTime: '17:00' } // End before start
    ]
  }

  const result = validateDealConfig(config)
  assert(result.valid === false, 'Should be invalid')
  assert(result.errors.some(e => e.includes('End time must be after start time')), 'Should have time order error')
})

test('validateDealConfig: rejects same start and end time', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Valid description here',
    voucherExpirationHours: 720,
    validityWindows: [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '17:00', endTime: '17:00' } // Same time
    ]
  }

  const result = validateDealConfig(config)
  assert(result.valid === false, 'Should be invalid')
  assert(result.errors.some(e => e.includes('End time must be after start time')), 'Should have time order error')
})

test('validateDealConfig: collects multiple validation errors', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Short', // Too short
    voucherExpirationHours: 0, // Zero (indefinite)
    validityWindows: [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '19:00', endTime: '17:00' } // Invalid order
    ]
  }

  const result = validateDealConfig(config)
  assert(result.valid === false, 'Should be invalid')
  assert(result.errors.length >= 3, 'Should have multiple errors')
})

// ============================================================================
// ISSUANCE TIME VALIDATION TESTS
// ============================================================================

test('isValidIssuanceTime: allows issuance when no validity windows defined', () => {
  const config: DealConfig = {
    canonicalDescription: 'Valid description',
    voucherExpirationHours: 720
  }

  const result = isValidIssuanceTime(config)
  assert(result === true, 'Should allow issuance without validity windows')
})

test('isValidIssuanceTime: allows issuance during valid window (Monday 17:00-19:00)', () => {
  const config: DealConfig = {
    canonicalDescription: 'Valid description',
    voucherExpirationHours: 720,
    validityWindows: [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '17:00', endTime: '19:00' }
    ]
  }

  // Monday at 18:00
  const monday6pm = new Date('2024-01-08T18:00:00') // Known Monday
  const result = isValidIssuanceTime(config, monday6pm)
  assert(result === true, 'Should allow issuance during window')
})

test('isValidIssuanceTime: blocks issuance outside valid window (Monday 16:00 before 17:00 start)', () => {
  const config: DealConfig = {
    canonicalDescription: 'Valid description',
    voucherExpirationHours: 720,
    validityWindows: [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '17:00', endTime: '19:00' }
    ]
  }

  // Monday at 16:00 (before window)
  const monday4pm = new Date('2024-01-08T16:00:00')
  const result = isValidIssuanceTime(config, monday4pm)
  assert(result === false, 'Should block issuance before window')
})

test('isValidIssuanceTime: blocks issuance after valid window (Monday 20:00 after 19:00 end)', () => {
  const config: DealConfig = {
    canonicalDescription: 'Valid description',
    voucherExpirationHours: 720,
    validityWindows: [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '17:00', endTime: '19:00' }
    ]
  }

  // Monday at 20:00 (after window)
  const monday8pm = new Date('2024-01-08T20:00:00')
  const result = isValidIssuanceTime(config, monday8pm)
  assert(result === false, 'Should block issuance after window')
})

test('isValidIssuanceTime: blocks issuance on wrong day (Tuesday when only Monday defined)', () => {
  const config: DealConfig = {
    canonicalDescription: 'Valid description',
    voucherExpirationHours: 720,
    validityWindows: [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '17:00', endTime: '19:00' }
    ]
  }

  // Tuesday at 18:00 (right time, wrong day)
  const tuesday6pm = new Date('2024-01-09T18:00:00')
  const result = isValidIssuanceTime(config, tuesday6pm)
  assert(result === false, 'Should block issuance on wrong day')
})

test('isValidIssuanceTime: allows issuance on any valid day with multiple windows', () => {
  const config: DealConfig = {
    canonicalDescription: 'Valid description',
    voucherExpirationHours: 720,
    validityWindows: [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '17:00', endTime: '19:00' },
      { dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '12:00', endTime: '14:00' },
      { dayOfWeek: DayOfWeek.FRIDAY, startTime: '17:00', endTime: '21:00' }
    ]
  }

  // Wednesday at 13:00
  const wednesday1pm = new Date('2024-01-10T13:00:00')
  const result = isValidIssuanceTime(config, wednesday1pm)
  assert(result === true, 'Should allow issuance on any valid day/time')
})

// ============================================================================
// EXPIRATION CALCULATION TESTS
// ============================================================================

test('calculateVoucherExpiration: calculates correct expiration (24 hours)', () => {
  const config: DealConfig = {
    canonicalDescription: 'Valid description',
    voucherExpirationHours: 24
  }

  const issuedAt = new Date('2024-01-15T12:00:00')
  const expiresAt = calculateVoucherExpiration(config, issuedAt)

  const expected = new Date('2024-01-16T12:00:00')
  assert(expiresAt.getTime() === expected.getTime(), 'Should add 24 hours to issued time')
})

test('calculateVoucherExpiration: calculates correct expiration (720 hours / 30 days)', () => {
  const config: DealConfig = {
    canonicalDescription: 'Valid description',
    voucherExpirationHours: 720
  }

  const issuedAt = new Date('2024-01-01T00:00:00')
  const expiresAt = calculateVoucherExpiration(config, issuedAt)

  const expected = new Date('2024-01-31T00:00:00')
  assert(expiresAt.getTime() === expected.getTime(), 'Should add 720 hours (30 days) to issued time')
})

test('calculateVoucherExpiration: uses current time when issuedAt not provided', () => {
  const config: DealConfig = {
    canonicalDescription: 'Valid description',
    voucherExpirationHours: 1
  }

  const before = Date.now()
  const expiresAt = calculateVoucherExpiration(config)
  const after = Date.now()

  const expectedMin = before + (1 * 60 * 60 * 1000)
  const expectedMax = after + (1 * 60 * 60 * 1000)

  assert(expiresAt.getTime() >= expectedMin && expiresAt.getTime() <= expectedMax, 
    'Should use current time when not provided')
})

// ============================================================================
// EXPIRATION CHECK TESTS
// ============================================================================

test('isVoucherExpired: returns false for voucher not yet expired', () => {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour in future
  const result = isVoucherExpired(expiresAt)
  assert(result === false, 'Should not be expired')
})

test('isVoucherExpired: returns true for expired voucher', () => {
  const expiresAt = new Date(Date.now() - 1000 * 60 * 60) // 1 hour in past
  const result = isVoucherExpired(expiresAt)
  assert(result === true, 'Should be expired')
})

test('isVoucherExpired: returns true for voucher expiring exactly now', () => {
  const now = new Date()
  const result = isVoucherExpired(now, now)
  assert(result === true, 'Should be expired at exact expiration time')
})

test('isVoucherExpired: uses provided timestamp for checking', () => {
  const expiresAt = new Date('2024-01-15T12:00:00')
  const checkTime = new Date('2024-01-15T13:00:00') // 1 hour after expiration

  const result = isVoucherExpired(expiresAt, checkTime)
  assert(result === true, 'Should be expired when checked after expiration')
})

// ============================================================================
// EDGE CASES AND BOUNDARY TESTS
// ============================================================================

test('validateDealConfig: accepts minimum valid expiration (1 hour)', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Valid description here',
    voucherExpirationHours: 1
  }

  const result = validateDealConfig(config)
  assert(result.valid === true, 'Should accept minimum expiration')
  assert(result.errors.length === 0, 'Should have no errors')
})

test('validateDealConfig: accepts expiration just below maximum (2159 hours)', () => {
  const config: Partial<DealConfig> = {
    canonicalDescription: 'Valid description here',
    voucherExpirationHours: 2159
  }

  const result = validateDealConfig(config)
  assert(result.valid === true, 'Should accept just below maximum')
  assert(result.errors.length === 0, 'Should have no errors')
})

test('isValidIssuanceTime: handles midnight crossing (23:00-01:00)', () => {
  const config: DealConfig = {
    canonicalDescription: 'Valid description',
    voucherExpirationHours: 720,
    validityWindows: [
      { dayOfWeek: DayOfWeek.FRIDAY, startTime: '23:00', endTime: '23:59' }
    ]
  }

  // Friday at 23:30
  const friday1130pm = new Date('2024-01-12T23:30:00')
  const result = isValidIssuanceTime(config, friday1130pm)
  assert(result === true, 'Should handle late night hours')
})

test('calculateVoucherExpiration: handles leap year correctly', () => {
  const config: DealConfig = {
    canonicalDescription: 'Valid description',
    voucherExpirationHours: 24 * 29 // 29 days
  }

  const issuedAt = new Date('2024-02-01T00:00:00') // 2024 is leap year
  const expiresAt = calculateVoucherExpiration(config, issuedAt)

  const expected = new Date('2024-03-01T00:00:00') // Should reach March 1
  assert(expiresAt.getTime() === expected.getTime(), 'Should handle leap year correctly')
})

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60))
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log('='.repeat(60))

if (failed > 0) {
  process.exit(1)
}

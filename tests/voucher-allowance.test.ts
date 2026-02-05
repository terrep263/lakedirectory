/**
 * Voucher Allowance Enforcement Tests
 * Tests monthly voucher issuance limits
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Simulate the allowance logic
async function getCurrentMonthIssuedCount(businessId: string): Promise<number> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const count = await prisma.voucher.count({
    where: {
      businessId,
      issuedAt: {
        gte: monthStart,
        lte: monthEnd
      }
    }
  })

  return count
}

async function checkVoucherAllowance(businessId: string, requestedCount: number = 1) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { monthlyVoucherAllowance: true }
  })

  if (!business) {
    return {
      allowed: false,
      currentMonthIssued: 0,
      monthlyAllowance: null,
      remaining: null,
      message: 'Business not found'
    }
  }

  if (business.monthlyVoucherAllowance === null) {
    return {
      allowed: true,
      currentMonthIssued: 0,
      monthlyAllowance: null,
      remaining: null,
      message: 'No monthly allowance set. Unlimited issuance allowed.'
    }
  }

  const currentMonthIssued = await getCurrentMonthIssuedCount(businessId)
  const allowance = business.monthlyVoucherAllowance
  const remaining = Math.max(0, allowance - currentMonthIssued)
  const allowed = (currentMonthIssued + requestedCount) <= allowance

  let message = ''
  if (allowed) {
    message = `Issuance allowed. ${remaining - requestedCount} vouchers remaining.`
  } else {
    const excess = (currentMonthIssued + requestedCount) - allowance
    message = `Monthly allowance exceeded. Requested ${requestedCount}, but only ${remaining} remaining. Would exceed by ${excess}.`
  }

  return {
    allowed,
    currentMonthIssued,
    monthlyAllowance: allowance,
    remaining,
    message
  }
}

// Test helpers
async function createTestBusiness(allowance: number | null = null): Promise<string> {
  const account = await prisma.account.create({
    data: {
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      role: 'BUSINESS'
    }
  })

  const business = await prisma.business.create({
    data: {
      name: 'Test Business',
      ownerId: account.id,
      monthlyVoucherAllowance: allowance
    }
  })

  return business.id
}

async function createTestDeal(businessId: string): Promise<string> {
  const deal = await prisma.deal.create({
    data: {
      businessId,
      title: 'Test Deal'
    }
  })

  return deal.id
}

async function createTestVoucher(businessId: string, dealId: string, issuedAt?: Date): Promise<string> {
  const validation = await prisma.voucherValidation.create({
    data: {
      businessId,
      dealId,
      externalRef: `test-${Date.now()}-${Math.random()}`
    }
  })

  const voucher = await prisma.voucher.create({
    data: {
      validationId: validation.id,
      dealId,
      businessId,
      qrToken: `qr-${Date.now()}-${Math.random()}`,
      issuedAt: issuedAt || new Date()
    }
  })

  return voucher.id
}

async function cleanupTestData(businessId: string) {
  await prisma.voucher.deleteMany({ where: { businessId } })
  await prisma.voucherValidation.deleteMany({ where: { businessId } })
  await prisma.deal.deleteMany({ where: { businessId } })
  
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { ownerId: true }
  })
  
  if (business) {
    await prisma.business.delete({ where: { id: businessId } })
    await prisma.account.delete({ where: { id: business.ownerId } })
  }
}

// Test runner
async function runTest(name: string, testFn: () => Promise<void>): Promise<boolean> {
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
  console.log('\n🧪 Running Voucher Allowance Tests...\n')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('ALLOWANCE ENFORCEMENT')
  console.log('═══════════════════════════════════════════════════════════\n')

  const results: boolean[] = []

  // Test 1: Unlimited issuance when no allowance set
  results.push(await runTest('Allows unlimited issuance when allowance is null', async () => {
    const businessId = await createTestBusiness(null)
    try {
      const result = await checkVoucherAllowance(businessId, 1)
      assert(result.allowed === true, 'Expected allowed=true for unlimited')
      assert(result.monthlyAllowance === null, 'Expected null allowance')
      assert(result.remaining === null, 'Expected null remaining')
    } finally {
      await cleanupTestData(businessId)
    }
  }))

  // Test 2: Allow issuance within allowance
  results.push(await runTest('Allows issuance within monthly allowance', async () => {
    const businessId = await createTestBusiness(10)
    const dealId = await createTestDeal(businessId)
    try {
      // Issue 3 vouchers
      await createTestVoucher(businessId, dealId)
      await createTestVoucher(businessId, dealId)
      await createTestVoucher(businessId, dealId)

      const result = await checkVoucherAllowance(businessId, 1)
      assert(result.allowed === true, 'Expected allowed=true within limit')
      assert(result.currentMonthIssued === 3, `Expected 3 issued, got ${result.currentMonthIssued}`)
      assert(result.monthlyAllowance === 10, 'Expected allowance=10')
      assert(result.remaining === 7, `Expected 7 remaining, got ${result.remaining}`)
    } finally {
      await cleanupTestData(businessId)
    }
  }))

  // Test 3: Reject issuance exceeding allowance
  results.push(await runTest('Rejects issuance exceeding monthly allowance', async () => {
    const businessId = await createTestBusiness(5)
    const dealId = await createTestDeal(businessId)
    try {
      // Issue 5 vouchers (at limit)
      for (let i = 0; i < 5; i++) {
        await createTestVoucher(businessId, dealId)
      }

      const result = await checkVoucherAllowance(businessId, 1)
      assert(result.allowed === false, 'Expected allowed=false at limit')
      assert(result.currentMonthIssued === 5, 'Expected 5 issued')
      assert(result.remaining === 0, 'Expected 0 remaining')
    } finally {
      await cleanupTestData(businessId)
    }
  }))

  // Test 4: Batch issuance check
  results.push(await runTest('Validates batch issuance requests', async () => {
    const businessId = await createTestBusiness(10)
    const dealId = await createTestDeal(businessId)
    try {
      // Issue 7 vouchers
      for (let i = 0; i < 7; i++) {
        await createTestVoucher(businessId, dealId)
      }

      // Try to issue 5 more (would exceed by 2)
      const result = await checkVoucherAllowance(businessId, 5)
      assert(result.allowed === false, 'Expected allowed=false for batch exceeding limit')
      assert(result.currentMonthIssued === 7, 'Expected 7 issued')
      assert(result.remaining === 3, 'Expected 3 remaining')
    } finally {
      await cleanupTestData(businessId)
    }
  }))

  // Test 5: Exact allowance usage
  results.push(await runTest('Allows issuance up to exact allowance', async () => {
    const businessId = await createTestBusiness(10)
    const dealId = await createTestDeal(businessId)
    try {
      // Issue 9 vouchers
      for (let i = 0; i < 9; i++) {
        await createTestVoucher(businessId, dealId)
      }

      // Try to issue 1 more (exactly at limit)
      const result = await checkVoucherAllowance(businessId, 1)
      assert(result.allowed === true, 'Expected allowed=true at exact limit')
      assert(result.currentMonthIssued === 9, 'Expected 9 issued')
      assert(result.remaining === 1, 'Expected 1 remaining')
    } finally {
      await cleanupTestData(businessId)
    }
  }))

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('AUTOMATIC MONTHLY RESET')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Test 6: Previous month vouchers don't count
  results.push(await runTest('Ignores vouchers from previous months', async () => {
    const businessId = await createTestBusiness(5)
    const dealId = await createTestDeal(businessId)
    try {
      // Issue 3 vouchers last month
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      
      for (let i = 0; i < 3; i++) {
        await createTestVoucher(businessId, dealId, lastMonth)
      }

      // Issue 2 vouchers this month
      await createTestVoucher(businessId, dealId)
      await createTestVoucher(businessId, dealId)

      const result = await checkVoucherAllowance(businessId, 1)
      assert(result.allowed === true, 'Expected allowed=true (only current month counts)')
      assert(result.currentMonthIssued === 2, `Expected 2 current month, got ${result.currentMonthIssued}`)
      assert(result.remaining === 3, 'Expected 3 remaining')
    } finally {
      await cleanupTestData(businessId)
    }
  }))

  // Test 7: Future month vouchers don't count
  results.push(await runTest('Ignores vouchers from future months', async () => {
    const businessId = await createTestBusiness(5)
    const dealId = await createTestDeal(businessId)
    try {
      // Issue 2 vouchers next month (edge case)
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      
      for (let i = 0; i < 2; i++) {
        await createTestVoucher(businessId, dealId, nextMonth)
      }

      // Issue 1 voucher this month
      await createTestVoucher(businessId, dealId)

      const result = await checkVoucherAllowance(businessId, 1)
      assert(result.allowed === true, 'Expected allowed=true (only current month counts)')
      assert(result.currentMonthIssued === 1, `Expected 1 current month, got ${result.currentMonthIssued}`)
      assert(result.remaining === 4, 'Expected 4 remaining')
    } finally {
      await cleanupTestData(businessId)
    }
  }))

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('VOUCHER VALIDITY NOT AFFECTED')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Test 8: Allowance doesn't affect existing voucher validity
  results.push(await runTest('Existing vouchers remain valid after allowance reached', async () => {
    const businessId = await createTestBusiness(3)
    const dealId = await createTestDeal(businessId)
    try {
      // Issue 3 vouchers (at limit)
      const voucher1 = await createTestVoucher(businessId, dealId)
      const voucher2 = await createTestVoucher(businessId, dealId)
      const voucher3 = await createTestVoucher(businessId, dealId)

      // Check that allowance is exhausted
      const allowanceCheck = await checkVoucherAllowance(businessId, 1)
      assert(allowanceCheck.allowed === false, 'Allowance should be exhausted')

      // Verify all vouchers still exist and are ISSUED
      const vouchers = await prisma.voucher.findMany({
        where: { businessId },
        select: { id: true, status: true }
      })

      assert(vouchers.length === 3, 'Expected 3 vouchers to exist')
      assert(vouchers.every(v => v.status === 'ISSUED'), 'All vouchers should have ISSUED status')
    } finally {
      await cleanupTestData(businessId)
    }
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

  await prisma.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

runAllTests()

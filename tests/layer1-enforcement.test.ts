import { PrismaClient } from '@prisma/client'
import { signToken } from '@/lib/auth'

const testPrisma = new PrismaClient()

async function cleanupTestData() {
  // Clean all test vouchers and validations
  await testPrisma.voucher.deleteMany({})
  await testPrisma.voucherValidation.deleteMany({})
  await testPrisma.deal.deleteMany({})
  await testPrisma.subscription.deleteMany({})
  await testPrisma.business.deleteMany({})
  await testPrisma.user.deleteMany({})
  await testPrisma.account.deleteMany({})
}

async function setupTestFixture() {
  const businessAccount = await testPrisma.account.upsert({
    where: { email: 'enforcement-biz@test.com' },
    update: {},
    create: {
      id: 'enforcement_biz_account',
      email: 'enforcement-biz@test.com',
      role: 'BUSINESS'
    }
  })

  const business = await testPrisma.business.upsert({
    where: { id: 'enforcement_test_biz' },
    update: {},
    create: {
      id: 'enforcement_test_biz',
      name: 'Enforcement Test Business',
      ownerId: businessAccount.id,
      isVerified: true
    }
  })

  const subscription = await testPrisma.subscription.upsert({
    where: { businessId: business.id },
    update: { status: 'ACTIVE' },
    create: {
      id: 'enforcement_test_sub',
      businessId: business.id,
      status: 'ACTIVE',
      startedAt: new Date()
    }
  })

  const deal = await testPrisma.deal.upsert({
    where: { id: 'enforcement_test_deal' },
    update: { isActive: true },
    create: {
      id: 'enforcement_test_deal',
      businessId: business.id,
      title: 'Enforcement Test Deal',
      isActive: true
    }
  })

  const userAccount = await testPrisma.account.upsert({
    where: { email: 'enforcement-user@test.com' },
    update: {},
    create: {
      id: 'enforcement_user_account',
      email: 'enforcement-user@test.com',
      role: 'USER'
    }
  })

  const user = await testPrisma.user.upsert({
    where: { id: 'enforcement_test_user' },
    update: {},
    create: {
      id: 'enforcement_test_user',
      accountId: userAccount.id
    }
  })

  const adminAccount = await testPrisma.account.upsert({
    where: { email: 'enforcement-admin@test.com' },
    update: {},
    create: {
      id: 'enforcement_admin_account',
      email: 'enforcement-admin@test.com',
      role: 'ADMIN'
    }
  })

  return { businessAccount, business, subscription, deal, user, userAccount, adminAccount }
}

function generateToken(accountId: string, businessId: string, email: string) {
  return signToken({ accountId, businessId, email })
}

async function issueVoucher(token: string, externalRef: string, dealId: string) {
  return await fetch('http://localhost:3000/api/enforcement/vouchers/issue', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      externalTransactionReference: externalRef,
      dealId
    })
  })
}

async function redeemVoucher(token: string, qrToken: string) {
  return await fetch('http://localhost:3000/api/redeem', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ qrToken })
  })
}

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║   LAYER 1 — ENFORCEMENT TESTING SUITE                  ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')

  let passed = 0
  let failed = 0
  const failures: string[] = []

  try {
    // Setup
    console.log('⚙️  Setting up test fixture...')
    await cleanupTestData()
    const fixture = await setupTestFixture()
    const businessToken = generateToken(
      fixture.businessAccount.id,
      fixture.business.id,
      fixture.businessAccount.email
    )
    console.log('✓ Test fixture ready\n')

    // TEST 1: ISSUANCE — VALID PATH
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 1: ISSUANCE — VALID PATH')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const validRef = `REF-VALID-${Date.now()}`
    const response1 = await issueVoucher(businessToken, validRef, fixture.deal.id)
    const data1 = await response1.json()

    if (response1.status !== 201) {
      failed++
      failures.push('TEST 1: Expected 201, got ' + response1.status)
      console.log('✗ FAIL: Expected status 201, got', response1.status)
    } else if (!data1.success) {
      failed++
      failures.push('TEST 1: Response missing success flag')
      console.log('✗ FAIL: Response missing success flag')
    } else {
      const validation = await testPrisma.voucherValidation.findUnique({
        where: { externalRef: validRef }
      })
      const voucher = await testPrisma.voucher.findUnique({
        where: { validationId: validation!.id }
      })

      if (!validation) {
        failed++
        failures.push('TEST 1: VoucherValidation not created')
        console.log('✗ FAIL: VoucherValidation not created')
      } else if (!voucher) {
        failed++
        failures.push('TEST 1: Voucher not created')
        console.log('✗ FAIL: Voucher not created')
      } else if (voucher.validationId !== validation.id) {
        failed++
        failures.push('TEST 1: Voucher not bound to validation')
        console.log('✗ FAIL: Voucher not correctly bound to validation')
      } else if (voucher.status !== 'ISSUED') {
        failed++
        failures.push('TEST 1: Voucher status not ISSUED')
        console.log('✗ FAIL: Voucher status is', voucher.status, 'expected ISSUED')
      } else {
        passed++
        console.log('✓ PASS: Valid issuance successful')
        console.log('  → VoucherValidation created:', validation.id)
        console.log('  → Voucher created:', voucher.id)
        console.log('  → Status:', voucher.status)
        console.log('  → QR Token:', voucher.qrToken)
      }
    }
    console.log()

    // TEST 2: ISSUANCE — DUPLICATE TRANSACTION REFERENCE
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 2: ISSUANCE — DUPLICATE TRANSACTION REFERENCE')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const dupRef = `REF-DUP-${Date.now()}`
    await issueVoucher(businessToken, dupRef, fixture.deal.id)
    
    const countBefore = await testPrisma.voucher.count({
      where: { businessId: fixture.business.id }
    })

    const response2 = await issueVoucher(businessToken, dupRef, fixture.deal.id)
    const data2 = await response2.json()
    
    const countAfter = await testPrisma.voucher.count({
      where: { businessId: fixture.business.id }
    })

    if (response2.status !== 409) {
      failed++
      failures.push('TEST 2: Expected 409, got ' + response2.status)
      console.log('✗ FAIL: Expected status 409, got', response2.status)
    } else if (!data2.error || !data2.error.includes('already issued')) {
      failed++
      failures.push('TEST 2: Wrong error message')
      console.log('✗ FAIL: Wrong error message:', data2.error)
    } else if (countAfter !== countBefore) {
      failed++
      failures.push('TEST 2: Duplicate created additional voucher')
      console.log('✗ FAIL: Additional voucher created despite duplicate')
    } else {
      passed++
      console.log('✓ PASS: Duplicate transaction reference rejected')
      console.log('  → Status: 409')
      console.log('  → Error:', data2.error)
      console.log('  → No additional vouchers created')
    }
    console.log()

    // TEST 3: ISSUANCE — NO VALIDATION, NO VOUCHER
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 3: ISSUANCE — NO VALIDATION, NO VOUCHER')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    let directCreateFailed = false
    try {
      await testPrisma.voucher.create({
        data: {
          id: 'orphan_voucher',
          validationId: 'nonexistent_validation_id',
          dealId: fixture.deal.id,
          businessId: fixture.business.id,
          qrToken: 'ORPHAN-TOKEN-123',
          status: 'ISSUED'
        }
      })
    } catch (error: any) {
      if (error.code === 'P2003') {
        directCreateFailed = true
      }
    }

    const orphanExists = await testPrisma.voucher.findUnique({
      where: { id: 'orphan_voucher' }
    })

    if (!directCreateFailed) {
      failed++
      failures.push('TEST 3: Direct voucher creation did not fail')
      console.log('✗ FAIL: Direct voucher creation should have failed')
    } else if (orphanExists) {
      failed++
      failures.push('TEST 3: Orphan voucher exists in database')
      console.log('✗ FAIL: Orphan voucher exists in database')
    } else {
      passed++
      console.log('✓ PASS: Voucher cannot exist without validation')
      console.log('  → Direct creation rejected by database')
      console.log('  → Foreign key constraint enforced')
    }
    console.log()

    // TEST 4: ISSUANCE — AUTHORITY ENFORCEMENT
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 4: ISSUANCE — AUTHORITY ENFORCEMENT')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    let test4Passed = true
    const test4Ref = `REF-AUTH-${Date.now()}`

    // Case 4a: Unauthenticated
    const response4a = await fetch('http://localhost:3000/api/enforcement/vouchers/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalTransactionReference: test4Ref + '-1',
        dealId: fixture.deal.id
      })
    })
    if (response4a.status !== 401) {
      test4Passed = false
      console.log('✗ FAIL: Unauthenticated request should return 401, got', response4a.status)
    } else {
      console.log('✓ Case 4a: Unauthenticated request rejected (401)')
    }

    // Case 4b: Non-business role (USER)
    const userToken = generateToken(
      fixture.userAccount.id,
      fixture.business.id,
      fixture.userAccount.email
    )
    const response4b = await issueVoucher(userToken, test4Ref + '-2', fixture.deal.id)
    if (response4b.status !== 403) {
      test4Passed = false
      console.log('✗ FAIL: User role should be rejected with 403, got', response4b.status)
    } else {
      console.log('✓ Case 4b: User role rejected (403)')
    }

    // Case 4c: Inactive subscription
    await testPrisma.subscription.update({
      where: { businessId: fixture.business.id },
      data: { status: 'INACTIVE' }
    })
    const response4c = await issueVoucher(businessToken, test4Ref + '-3', fixture.deal.id)
    await testPrisma.subscription.update({
      where: { businessId: fixture.business.id },
      data: { status: 'ACTIVE' }
    })
    
    if (response4c.status !== 403) {
      test4Passed = false
      console.log('✗ FAIL: Inactive subscription should be rejected with 403, got', response4c.status)
    } else {
      console.log('✓ Case 4c: Inactive subscription rejected (403)')
    }

    // Verify no vouchers created
    const unauthorizedVouchers = await testPrisma.voucher.count({
      where: {
        validation: {
          externalRef: {
            startsWith: test4Ref
          }
        }
      }
    })

    if (unauthorizedVouchers > 0) {
      test4Passed = false
      console.log('✗ FAIL: Unauthorized requests created vouchers')
    }

    if (test4Passed) {
      passed++
      console.log('✓ PASS: All unauthorized access attempts rejected')
    } else {
      failed++
      failures.push('TEST 4: Authority enforcement failed')
    }
    console.log()

    // TEST 5: REDEMPTION — VALID PATH
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 5: REDEMPTION — VALID PATH')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const redeemRef = `REF-REDEEM-${Date.now()}`
    const issueResponse5 = await issueVoucher(businessToken, redeemRef, fixture.deal.id)
    const issueData5 = await issueResponse5.json()
    const qrToken5 = issueData5.data.qrToken

    const redeemResponse5 = await redeemVoucher(businessToken, qrToken5)
    const redeemData5 = await redeemResponse5.json()

    const redeemedVoucher = await testPrisma.voucher.findUnique({
      where: { qrToken: qrToken5 }
    })

    if (redeemResponse5.status !== 200) {
      failed++
      failures.push('TEST 5: Expected 200, got ' + redeemResponse5.status)
      console.log('✗ FAIL: Expected status 200, got', redeemResponse5.status)
    } else if (!redeemData5.redeemed) {
      failed++
      failures.push('TEST 5: Redemption flag not set')
      console.log('✗ FAIL: Redemption flag not set in response')
    } else if (!redeemedVoucher) {
      failed++
      failures.push('TEST 5: Voucher not found after redemption')
      console.log('✗ FAIL: Voucher not found')
    } else if (redeemedVoucher.status !== 'REDEEMED') {
      failed++
      failures.push('TEST 5: Status not REDEEMED')
      console.log('✗ FAIL: Status is', redeemedVoucher.status, 'expected REDEEMED')
    } else if (!redeemedVoucher.redeemedAt) {
      failed++
      failures.push('TEST 5: redeemedAt not set')
      console.log('✗ FAIL: redeemedAt timestamp not set')
    } else {
      passed++
      console.log('✓ PASS: Valid redemption successful')
      console.log('  → Status: ISSUED → REDEEMED')
      console.log('  → redeemedAt:', redeemedVoucher.redeemedAt)
      console.log('  → Atomic transition complete')
    }
    console.log()

    // TEST 6: REDEMPTION — DOUBLE REDEEM ATTEMPT
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 6: REDEMPTION — DOUBLE REDEEM ATTEMPT')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const doubleRef = `REF-DOUBLE-${Date.now()}`
    const issueResponse6 = await issueVoucher(businessToken, doubleRef, fixture.deal.id)
    const issueData6 = await issueResponse6.json()
    const qrToken6 = issueData6.data.qrToken

    await redeemVoucher(businessToken, qrToken6)
    
    const voucherBefore = await testPrisma.voucher.findUnique({
      where: { qrToken: qrToken6 }
    })

    const response6 = await redeemVoucher(businessToken, qrToken6)
    const data6 = await response6.json()

    const voucherAfter = await testPrisma.voucher.findUnique({
      where: { qrToken: qrToken6 }
    })

    if (response6.status === 200 && data6.redeemed === true) {
      failed++
      failures.push('TEST 6: Double redemption succeeded')
      console.log('✗ FAIL: Second redemption should have been rejected')
    } else if (voucherAfter?.status !== voucherBefore?.status) {
      failed++
      failures.push('TEST 6: Voucher state changed on double redeem')
      console.log('✗ FAIL: Voucher state changed on second redemption')
    } else if (voucherAfter?.redeemedAt?.getTime() !== voucherBefore?.redeemedAt?.getTime()) {
      failed++
      failures.push('TEST 6: redeemedAt changed on double redeem')
      console.log('✗ FAIL: redeemedAt timestamp changed')
    } else {
      passed++
      console.log('✓ PASS: Double redemption prevented')
      console.log('  → Second attempt rejected')
      console.log('  → Voucher state unchanged')
      console.log('  → Status remains: REDEEMED')
    }
    console.log()

    // TEST 7: REDEMPTION — INVALID STATE PROTECTION
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 7: REDEMPTION — INVALID STATE PROTECTION')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    let test7Passed = true

    // Case 7a: Non-existent voucher
    const response7a = await redeemVoucher(businessToken, 'NONEXISTENT-TOKEN')
    if (response7a.status === 200) {
      test7Passed = false
      console.log('✗ FAIL: Non-existent voucher redemption succeeded')
    } else {
      console.log('✓ Case 7a: Non-existent voucher rejected')
    }

    // Case 7b: Wrong business
    const otherBizAccount = await testPrisma.account.upsert({
      where: { email: 'other-biz@test.com' },
      update: {},
      create: {
        id: 'other_biz_account',
        email: 'other-biz@test.com',
        role: 'BUSINESS'
      }
    })
    const otherBusiness = await testPrisma.business.upsert({
      where: { id: 'other_test_biz' },
      update: {},
      create: {
        id: 'other_test_biz',
        name: 'Other Business',
        ownerId: otherBizAccount.id
      }
    })
    const otherToken = generateToken(otherBizAccount.id, otherBusiness.id, otherBizAccount.email)

    const wrongBizRef = `REF-WRONG-${Date.now()}`
    const issueResponse7b = await issueVoucher(businessToken, wrongBizRef, fixture.deal.id)
    const issueData7b = await issueResponse7b.json()
    const qrToken7b = issueData7b.data.qrToken

    const response7b = await redeemVoucher(otherToken, qrToken7b)
    const data7b = await response7b.json()
    
    if (response7b.status !== 403 && !data7b.error?.includes('Invalid for this business')) {
      test7Passed = false
      console.log('✗ FAIL: Wrong business redemption not properly rejected')
    } else {
      console.log('✓ Case 7b: Wrong business redemption rejected (403)')
    }

    const voucher7b = await testPrisma.voucher.findUnique({
      where: { qrToken: qrToken7b }
    })
    if (voucher7b?.status !== 'ISSUED') {
      test7Passed = false
      console.log('✗ FAIL: Voucher state mutated despite rejection')
    }

    if (test7Passed) {
      passed++
      console.log('✓ PASS: All invalid redemption attempts blocked')
    } else {
      failed++
      failures.push('TEST 7: Invalid state protection failed')
    }
    console.log()

    // TEST 8: TRANSACTIONAL INTEGRITY
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 8: TRANSACTIONAL INTEGRITY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Attempt issuance with non-existent deal to force transaction rollback
    const integrityRef = `REF-INTEGRITY-${Date.now()}`
    const response8 = await issueVoucher(businessToken, integrityRef, 'nonexistent_deal_id')

    const orphanValidation = await testPrisma.voucherValidation.findUnique({
      where: { externalRef: integrityRef }
    })

    const orphanVoucher = await testPrisma.voucher.findFirst({
      where: {
        validation: {
          externalRef: integrityRef
        }
      }
    })

    if (response8.status === 201) {
      failed++
      failures.push('TEST 8: Invalid deal issuance succeeded')
      console.log('✗ FAIL: Issuance with invalid deal should have failed')
    } else if (orphanValidation) {
      failed++
      failures.push('TEST 8: Orphan validation exists')
      console.log('✗ FAIL: VoucherValidation exists without voucher (transaction not rolled back)')
    } else if (orphanVoucher) {
      failed++
      failures.push('TEST 8: Orphan voucher exists')
      console.log('✗ FAIL: Voucher exists after transaction failure')
    } else {
      passed++
      console.log('✓ PASS: Transactional integrity maintained')
      console.log('  → Failed issuance rejected')
      console.log('  → No partial records created')
      console.log('  → Database state clean')
    }
    console.log()

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('ENFORCEMENT TEST SUITE SUMMARY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Total Tests: ${passed + failed}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    
    if (failed > 0) {
      console.log('\n❌ ENFORCEMENT TEST SUITE FAILED\n')
      console.log('Failed Tests:')
      failures.forEach(f => console.log('  • ' + f))
      console.log()
    } else {
      console.log('\n✅ ALL ENFORCEMENT TESTS PASSED\n')
      console.log('Enforcement guarantees verified:')
      console.log('  ✓ Exactly one voucher per validation')
      console.log('  ✓ Duplicate references rejected at database level')
      console.log('  ✓ No voucher exists without validation')
      console.log('  ✓ No voucher redeems more than once')
      console.log('  ✓ Unauthorized access blocked')
      console.log('  ✓ Transactional atomicity enforced')
      console.log('  ✓ Invalid states structurally impossible')
      console.log()
    }

  } catch (error) {
    console.error('\n💥 TEST SUITE ERROR:', error)
    failed++
  } finally {
    await testPrisma.$disconnect()
  }

  process.exit(failed > 0 ? 1 : 0)
}

runTests()

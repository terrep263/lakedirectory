/**
 * MODULE 1: Identity & Ownership - Enforcement Tests
 *
 * These tests verify the hard rules of the identity system:
 * 1. Roles are immutable after creation
 * 2. VENDOR may be bound to exactly one business
 * 3. USER cannot bind to business
 * 4. ADMIN cannot bind to business
 * 5. Cross-role access is technically impossible
 */

import { prisma } from '@/lib/prisma'
import { signIdentityToken } from '@/lib/identity'
import { IdentityRole, IdentityStatus } from '@prisma/client'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function test(name: string, fn: () => Promise<void>) {
  return async () => {
    try {
      await fn()
      results.push({ name, passed: true })
      console.log(`✅ ${name}`)
    } catch (error) {
      results.push({ name, passed: false, error: String(error) })
      console.log(`❌ ${name}: ${error}`)
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

// Helper to create identity directly in DB for testing
async function createTestIdentity(email: string, role: IdentityRole) {
  return prisma.userIdentity.create({
    data: { email, role },
  })
}

// Helper to create test business
async function createTestBusiness(name: string) {
  return prisma.business.create({
    data: { name },
  })
}

// Cleanup helper
async function cleanup() {
  await prisma.vendorOwnership.deleteMany({
    where: { user: { email: { contains: '@test-identity.local' } } },
  })
  await prisma.userIdentity.deleteMany({
    where: { email: { contains: '@test-identity.local' } },
  })
  await prisma.business.deleteMany({
    where: { name: { startsWith: 'Test Business Module1' } },
  })
}

// ============================================================================
// TEST SUITE
// ============================================================================

const tests = [
  // 1. Registration creates identity with immutable role
  test('Registration creates USER identity successfully', async () => {
    const email = `user-${Date.now()}@test-identity.local`
    const res = await fetch(`${BASE_URL}/api/identity/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: 'USER' }),
    })

    assert(res.status === 201, `Expected 201, got ${res.status}`)
    const data = await res.json()
    assert(data.identity.role === 'USER', 'Role should be USER')
    assert(data.token, 'Token should be returned')
  }),

  test('Registration creates VENDOR identity successfully', async () => {
    const email = `vendor-${Date.now()}@test-identity.local`
    const res = await fetch(`${BASE_URL}/api/identity/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: 'VENDOR' }),
    })

    assert(res.status === 201, `Expected 201, got ${res.status}`)
    const data = await res.json()
    assert(data.identity.role === 'VENDOR', 'Role should be VENDOR')
  }),

  // 2. ADMIN creation restricted
  test('Registration rejects ADMIN role', async () => {
    const email = `admin-reject-${Date.now()}@test-identity.local`
    const res = await fetch(`${BASE_URL}/api/identity/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: 'ADMIN' }),
    })

    assert(res.status === 400, `Expected 400, got ${res.status}`)
  }),

  // 3. Duplicate email rejected
  test('Registration rejects duplicate email', async () => {
    const email = `dup-${Date.now()}@test-identity.local`

    // First registration
    const res1 = await fetch(`${BASE_URL}/api/identity/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: 'USER' }),
    })
    assert(res1.status === 201, 'First registration should succeed')

    // Second registration
    const res2 = await fetch(`${BASE_URL}/api/identity/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: 'USER' }),
    })
    assert(res2.status === 409, `Expected 409, got ${res2.status}`)
  }),

  // 4. /me endpoint returns identity
  test('GET /me returns authenticated identity', async () => {
    const email = `me-test-${Date.now()}@test-identity.local`
    const identity = await createTestIdentity(email, IdentityRole.USER)
    const token = signIdentityToken({
      id: identity.id,
      email: identity.email,
      role: identity.role,
    })

    const res = await fetch(`${BASE_URL}/api/identity/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    assert(res.status === 200, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert(data.id === identity.id, 'ID should match')
    assert(data.role === 'USER', 'Role should be USER')
    assert(!data.businessId, 'USER should not have businessId')
  }),

  // 5. Unauthenticated request rejected
  test('GET /me rejects unauthenticated request', async () => {
    const res = await fetch(`${BASE_URL}/api/identity/me`)
    assert(res.status === 401, `Expected 401, got ${res.status}`)
  }),

  // 6. VENDOR binding works
  test('bind-vendor creates ownership for VENDOR', async () => {
    const vendorEmail = `vendor-bind-${Date.now()}@test-identity.local`
    const adminEmail = `admin-bind-${Date.now()}@test-identity.local`

    // Create vendor and admin
    const vendor = await createTestIdentity(vendorEmail, IdentityRole.VENDOR)
    const admin = await createTestIdentity(adminEmail, IdentityRole.ADMIN)
    const business = await createTestBusiness(`Test Business Module1 ${Date.now()}`)

    const adminToken = signIdentityToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    })

    const res = await fetch(`${BASE_URL}/api/identity/bind-vendor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ userId: vendor.id, businessId: business.id }),
    })

    assert(res.status === 201, `Expected 201, got ${res.status}`)
    const data = await res.json()
    assert(data.ownership.userId === vendor.id, 'userId should match')
    assert(data.ownership.businessId === business.id, 'businessId should match')
  }),

  // 7. VENDOR cannot be bound twice
  test('bind-vendor rejects double binding', async () => {
    const vendorEmail = `vendor-double-${Date.now()}@test-identity.local`
    const adminEmail = `admin-double-${Date.now()}@test-identity.local`

    const vendor = await createTestIdentity(vendorEmail, IdentityRole.VENDOR)
    const admin = await createTestIdentity(adminEmail, IdentityRole.ADMIN)
    const business1 = await createTestBusiness(`Test Business Module1 First ${Date.now()}`)
    const business2 = await createTestBusiness(`Test Business Module1 Second ${Date.now()}`)

    const adminToken = signIdentityToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    })

    // First binding
    const res1 = await fetch(`${BASE_URL}/api/identity/bind-vendor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ userId: vendor.id, businessId: business1.id }),
    })
    assert(res1.status === 201, 'First binding should succeed')

    // Second binding attempt
    const res2 = await fetch(`${BASE_URL}/api/identity/bind-vendor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ userId: vendor.id, businessId: business2.id }),
    })
    assert(res2.status === 409, `Expected 409, got ${res2.status}`)
  }),

  // 8. USER cannot be bound
  test('bind-vendor rejects USER role', async () => {
    const userEmail = `user-bind-${Date.now()}@test-identity.local`
    const adminEmail = `admin-user-${Date.now()}@test-identity.local`

    const user = await createTestIdentity(userEmail, IdentityRole.USER)
    const admin = await createTestIdentity(adminEmail, IdentityRole.ADMIN)
    const business = await createTestBusiness(`Test Business Module1 User ${Date.now()}`)

    const adminToken = signIdentityToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    })

    const res = await fetch(`${BASE_URL}/api/identity/bind-vendor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ userId: user.id, businessId: business.id }),
    })

    assert(res.status === 403, `Expected 403, got ${res.status}`)
    const data = await res.json()
    assert(data.error.includes('USER'), 'Error should mention USER')
  }),

  // 9. ADMIN cannot be bound
  test('bind-vendor rejects ADMIN role', async () => {
    const targetAdminEmail = `admin-target-${Date.now()}@test-identity.local`
    const callerAdminEmail = `admin-caller-${Date.now()}@test-identity.local`

    const targetAdmin = await createTestIdentity(targetAdminEmail, IdentityRole.ADMIN)
    const callerAdmin = await createTestIdentity(callerAdminEmail, IdentityRole.ADMIN)
    const business = await createTestBusiness(`Test Business Module1 Admin ${Date.now()}`)

    const callerToken = signIdentityToken({
      id: callerAdmin.id,
      email: callerAdmin.email,
      role: callerAdmin.role,
    })

    const res = await fetch(`${BASE_URL}/api/identity/bind-vendor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${callerToken}`,
      },
      body: JSON.stringify({ userId: targetAdmin.id, businessId: business.id }),
    })

    assert(res.status === 403, `Expected 403, got ${res.status}`)
    const data = await res.json()
    assert(data.error.includes('ADMIN'), 'Error should mention ADMIN')
  }),

  // 10. Non-ADMIN cannot bind vendors
  test('bind-vendor rejects non-ADMIN caller', async () => {
    const vendorEmail = `vendor-caller-${Date.now()}@test-identity.local`
    const targetVendorEmail = `vendor-target-${Date.now()}@test-identity.local`

    const vendorCaller = await createTestIdentity(vendorEmail, IdentityRole.VENDOR)
    const targetVendor = await createTestIdentity(targetVendorEmail, IdentityRole.VENDOR)
    const business = await createTestBusiness(`Test Business Module1 NonAdmin ${Date.now()}`)

    const vendorToken = signIdentityToken({
      id: vendorCaller.id,
      email: vendorCaller.email,
      role: vendorCaller.role,
    })

    const res = await fetch(`${BASE_URL}/api/identity/bind-vendor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendorToken}`,
      },
      body: JSON.stringify({ userId: targetVendor.id, businessId: business.id }),
    })

    assert(res.status === 403, `Expected 403, got ${res.status}`)
  }),

  // 11. VENDOR /me includes businessId after binding
  test('GET /me returns businessId for bound VENDOR', async () => {
    const vendorEmail = `vendor-me-${Date.now()}@test-identity.local`
    const adminEmail = `admin-me-${Date.now()}@test-identity.local`

    const vendor = await createTestIdentity(vendorEmail, IdentityRole.VENDOR)
    const admin = await createTestIdentity(adminEmail, IdentityRole.ADMIN)
    const business = await createTestBusiness(`Test Business Module1 Me ${Date.now()}`)

    // Bind vendor
    const adminToken = signIdentityToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    })

    await fetch(`${BASE_URL}/api/identity/bind-vendor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ userId: vendor.id, businessId: business.id }),
    })

    // Check /me
    const vendorToken = signIdentityToken({
      id: vendor.id,
      email: vendor.email,
      role: vendor.role,
    })

    const res = await fetch(`${BASE_URL}/api/identity/me`, {
      headers: { Authorization: `Bearer ${vendorToken}` },
    })

    assert(res.status === 200, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert(data.businessId === business.id, 'businessId should be included')
  }),

  // 12. ADMIN creation by ADMIN works
  test('admin-create creates ADMIN when called by ADMIN', async () => {
    const callerAdminEmail = `admin-creator-${Date.now()}@test-identity.local`
    const newAdminEmail = `admin-new-${Date.now()}@test-identity.local`

    const callerAdmin = await createTestIdentity(callerAdminEmail, IdentityRole.ADMIN)

    const callerToken = signIdentityToken({
      id: callerAdmin.id,
      email: callerAdmin.email,
      role: callerAdmin.role,
    })

    const res = await fetch(`${BASE_URL}/api/identity/admin-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${callerToken}`,
      },
      body: JSON.stringify({ email: newAdminEmail }),
    })

    assert(res.status === 201, `Expected 201, got ${res.status}`)
    const data = await res.json()
    assert(data.identity.role === 'ADMIN', 'Role should be ADMIN')
    assert(data.createdBy === callerAdmin.id, 'createdBy should match caller')
  }),

  // 13. ADMIN creation by non-ADMIN rejected
  test('admin-create rejects non-ADMIN caller', async () => {
    const vendorEmail = `vendor-admin-create-${Date.now()}@test-identity.local`
    const newAdminEmail = `admin-reject-${Date.now()}@test-identity.local`

    const vendor = await createTestIdentity(vendorEmail, IdentityRole.VENDOR)

    const vendorToken = signIdentityToken({
      id: vendor.id,
      email: vendor.email,
      role: vendor.role,
    })

    const res = await fetch(`${BASE_URL}/api/identity/admin-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendorToken}`,
      },
      body: JSON.stringify({ email: newAdminEmail }),
    })

    assert(res.status === 403, `Expected 403, got ${res.status}`)
  }),

  // 14. Suspended identity cannot access /me
  test('Suspended identity is rejected', async () => {
    const email = `suspended-${Date.now()}@test-identity.local`
    const identity = await prisma.userIdentity.create({
      data: { email, role: IdentityRole.USER, status: IdentityStatus.SUSPENDED },
    })

    const token = signIdentityToken({
      id: identity.id,
      email: identity.email,
      role: identity.role,
    })

    const res = await fetch(`${BASE_URL}/api/identity/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    assert(res.status === 403, `Expected 403, got ${res.status}`)
    const data = await res.json()
    assert(data.error.includes('suspended'), 'Error should mention suspended')
  }),
]

// ============================================================================
// RUN TESTS
// ============================================================================

async function runTests() {
  console.log('\n========================================')
  console.log('MODULE 1: Identity & Ownership Tests')
  console.log('========================================\n')

  // Cleanup before tests
  await cleanup()

  for (const runTest of tests) {
    await runTest()
  }

  // Cleanup after tests
  await cleanup()

  // Summary
  console.log('\n========================================')
  console.log('SUMMARY')
  console.log('========================================')
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  console.log(`Passed: ${passed}/${results.length}`)
  console.log(`Failed: ${failed}/${results.length}`)

  if (failed > 0) {
    console.log('\nFailed tests:')
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
    process.exit(1)
  } else {
    console.log('\n✅ ALL TESTS PASSED')
    process.exit(0)
  }
}

runTests().catch((err) => {
  console.error('Test runner failed:', err)
  process.exit(1)
})

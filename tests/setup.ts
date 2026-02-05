import { PrismaClient } from '@prisma/client'
import { signToken } from '@/lib/auth'
import { clearRateLimits, shutdownRateLimiter } from '@/lib/rate-limit'

// Force NODE_ENV to 'test' for test environment
if (typeof process.env.NODE_ENV === 'undefined' || process.env.NODE_ENV !== 'test') {
  // @ts-ignore - Allow setting NODE_ENV in test environment
  process.env.NODE_ENV = 'test'
}

export const testPrisma = new PrismaClient()

// Global beforeEach to reset rate limits for all tests
beforeEach(async () => {
  // Clear rate limits in the test process
  clearRateLimits()
  
  // Clear rate limits in the Next.js server process via API
  try {
    await fetch('http://localhost:3000/api/test/clear-rate-limits', {
      method: 'POST'
    })
  } catch (e) {
    // Server might not be ready yet, that's ok
  }
})

// Global afterAll to close all resources and ensure clean exit
afterAll(async () => {
  // Shutdown rate limiter completely (clears interval)
  shutdownRateLimiter()
  
  // Close database connection
  await testPrisma.$disconnect()
  
  // Give a moment for all resources to fully close
  await new Promise(resolve => setTimeout(resolve, 100))
})

export async function cleanupDatabase() {
  await testPrisma.voucher.deleteMany()
  await testPrisma.voucherValidation.deleteMany()
  await testPrisma.deal.deleteMany()
  await testPrisma.subscription.deleteMany()
  await testPrisma.business.deleteMany()
  await testPrisma.account.deleteMany()
}

export async function setupTestData() {
  const adminAccount = await testPrisma.account.create({
    data: {
      id: 'test_admin_account',
      email: 'admin@test.com',
      role: 'ADMIN',
    }
  })

  const businessAccount = await testPrisma.account.create({
    data: {
      id: 'test_business_account',
      email: 'business@test.com',
      role: 'BUSINESS',
    }
  })

  const business = await testPrisma.business.create({
    data: {
      id: 'test_business',
      name: 'Test Business',
      ownerId: businessAccount.id,
      isVerified: true,
    }
  })

  const deal = await testPrisma.deal.create({
    data: {
      id: 'test_deal',
      businessId: business.id,
      title: 'Test Deal',
      isActive: true,
    }
  })

  const userAccount = await testPrisma.account.create({
    data: {
      id: 'test_user_account',
      email: 'user@test.com',
      role: 'USER',
    }
  })

  return {
    adminAccount,
    businessAccount,
    business,
    deal,
    userAccount,
  }
}

export function generateTestToken(accountId: string, businessId?: string, email?: string) {
  return signToken({
    accountId,
    businessId: businessId || 'test_business',
    email: email || 'test@test.com',
  })
}

export async function createTestValidation(externalRef: string) {
  return await testPrisma.voucherValidation.create({
    data: {
      id: `validation_${externalRef}`,
      externalRef,
      businessId: 'test_business',
      dealId: 'test_deal',
    }
  })
}

export async function getVoucherByQRToken(qrToken: string) {
  return await testPrisma.voucher.findUnique({
    where: { qrToken }
  })
}

export async function getVoucherCount() {
  return await testPrisma.voucher.count()
}

export async function getValidationCount() {
  return await testPrisma.voucherValidation.count()
}

beforeAll(async () => {
  await cleanupDatabase()
})

afterAll(async () => {
  await cleanupDatabase()
  await testPrisma.$disconnect()
})

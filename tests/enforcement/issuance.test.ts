import { testPrisma, cleanupDatabase, setupTestData, generateTestToken, createTestValidation, getVoucherCount } from '../setup'

describe('Issuance Enforcement Tests', () => {
  beforeEach(async () => {
    await cleanupDatabase()
    await setupTestData()
  })

  describe('Single Voucher Per Validation', () => {
    test('ENFORCE: Exactly one voucher created for valid validation', async () => {
      const validation = await createTestValidation('external_ref_001')
      const token = generateTestToken('test_business_account')

      const response = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalRef: 'external_ref_001',
          userId: 'test_user',
        }),
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.voucher).toBeDefined()
      expect(data.voucher.qrToken).toBeTruthy()

      const voucherCount = await testPrisma.voucher.count({
        where: { validationId: validation.id }
      })
      expect(voucherCount).toBe(1)
    })

    test('ENFORCE: Duplicate issuance returns same voucher (idempotent)', async () => {
      const validation = await createTestValidation('external_ref_002')
      const token = generateTestToken('test_business_account')

      const response1 = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalRef: 'external_ref_002',
          userId: 'test_user',
        }),
      })

      expect(response1.status).toBe(201)
      const data1 = await response1.json()
      expect(data1.voucher).toBeDefined()
      const firstVoucherId = data1.voucher.id

      // Database verification after first issuance
      const countAfterFirst = await testPrisma.voucher.count({
        where: { validationId: validation.id }
      })
      expect(countAfterFirst).toBe(1)

      const response2 = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalRef: 'external_ref_002',
          userId: 'test_user',
        }),
      })

      expect(response2.status).toBe(200)
      const data2 = await response2.json()
      expect(data2.voucher).toBeDefined()
      
      // Idempotency: same voucher ID returned
      expect(data2.voucher.id).toBe(firstVoucherId)

      // Database verification: still exactly 1 voucher
      const countAfterSecond = await testPrisma.voucher.count({
        where: { validationId: validation.id }
      })
      expect(countAfterSecond).toBe(1)

      // Verify it's the same voucher in database
      const voucher = await testPrisma.voucher.findUnique({
        where: { id: firstVoucherId }
      })
      expect(voucher).toBeDefined()
      expect(voucher!.validationId).toBe(validation.id)
    })

    test('ENFORCE: Cannot issue without validation record', async () => {
      const token = generateTestToken('test_business_account')

      const response = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalRef: 'nonexistent_ref',
          userId: 'test_user',
        }),
      })

      expect(response.status).not.toBe(200)
      const voucherCount = await getVoucherCount()
      expect(voucherCount).toBe(0) // No vouchers created
    })
  })

  describe('Deal State Enforcement', () => {
    test('ENFORCE: Inactive deal prevents issuance', async () => {
      await testPrisma.deal.update({
        where: { id: 'test_deal' },
        data: { isActive: false }
      })

      await createTestValidation('external_ref_003')
      const token = generateTestToken('test_business_account')

      const response = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalRef: 'external_ref_003',
          userId: 'test_user',
        }),
      })

      expect(response.status).not.toBe(200)
      const voucherCount = await getVoucherCount()
      expect(voucherCount).toBe(0) // No vouchers created for inactive deal
    })

    test('ENFORCE: Deal reactivation allows issuance', async () => {
      await testPrisma.deal.update({
        where: { id: 'test_deal' },
        data: { isActive: false }
      })

      await createTestValidation('external_ref_004')
      const token = generateTestToken('test_business_account')

      const response1 = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalRef: 'external_ref_004',
          userId: 'test_user',
        }),
      })

      expect(response1.status).not.toBe(200)
      const countAfterFail = await getVoucherCount()
      expect(countAfterFail).toBe(0)

      await testPrisma.deal.update({
        where: { id: 'test_deal' },
        data: { isActive: true }
      })

      const response2 = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalRef: 'external_ref_004',
          userId: 'test_user',
        }),
      })

      expect(response2.status).toBe(201)
      const voucherCount = await getVoucherCount()
      expect(voucherCount).toBe(1)
    })
  })

  describe('Foreign Key and Constraint Enforcement', () => {
    test('ENFORCE: Voucher cannot exist without validation (FK constraint)', async () => {
      const attemptDirectCreate = async () => {
        await testPrisma.voucher.create({
          data: {
            id: 'orphan_voucher',
            validationId: 'nonexistent_validation',
            dealId: 'test_deal',
            businessId: 'test_business',
            qrToken: 'ORPHAN-TOKEN',
            status: 'ISSUED',
          }
        })
      }

      await expect(attemptDirectCreate()).rejects.toThrow()
      const voucherCount = await getVoucherCount()
      expect(voucherCount).toBe(0)
    })

    test('ENFORCE: QR token must be unique', async () => {
      await createTestValidation('external_ref_005')
      await createTestValidation('external_ref_006')

      const validation1 = await testPrisma.voucherValidation.findUnique({
        where: { externalRef: 'external_ref_005' }
      })
      const validation2 = await testPrisma.voucherValidation.findUnique({
        where: { externalRef: 'external_ref_006' }
      })

      await testPrisma.voucher.create({
        data: {
          id: 'voucher_1',
          validationId: validation1!.id,
          dealId: 'test_deal',
          businessId: 'test_business',
          qrToken: 'DUPLICATE-TOKEN',
          status: 'ISSUED',
        }
      })

      const attemptDuplicate = async () => {
        await testPrisma.voucher.create({
          data: {
            id: 'voucher_2',
            validationId: validation2!.id,
            dealId: 'test_deal',
            businessId: 'test_business',
            qrToken: 'DUPLICATE-TOKEN',
            status: 'ISSUED',
          }
        })
      }

      await expect(attemptDuplicate()).rejects.toThrow()
      const voucherCount = await getVoucherCount()
      expect(voucherCount).toBe(1)
    })

    test('ENFORCE: ValidationId must be unique per voucher', async () => {
      await createTestValidation('external_ref_007')

      const validation = await testPrisma.voucherValidation.findUnique({
        where: { externalRef: 'external_ref_007' }
      })

      await testPrisma.voucher.create({
        data: {
          id: 'voucher_1',
          validationId: validation!.id,
          dealId: 'test_deal',
          businessId: 'test_business',
          qrToken: 'TOKEN-1',
          status: 'ISSUED',
        }
      })

      const attemptDuplicate = async () => {
        await testPrisma.voucher.create({
          data: {
            id: 'voucher_2',
            validationId: validation!.id,
            dealId: 'test_deal',
            businessId: 'test_business',
            qrToken: 'TOKEN-2',
            status: 'ISSUED',
          }
        })
      }

      await expect(attemptDuplicate()).rejects.toThrow()
      const voucherCount = await getVoucherCount()
      expect(voucherCount).toBe(1)
    })
  })

  describe('Rate Limiting Enforcement', () => {
    test('ENFORCE: Rate limit blocks excessive issuance attempts', async () => {
      const token = generateTestToken('test_business_account')
      const attempts = []

      for (let i = 0; i < 12; i++) {
        await createTestValidation(`rate_limit_ref_${i}`)
        const attempt = fetch('http://localhost:3000/api/vouchers/issue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            externalRef: `rate_limit_ref_${i}`,
            userId: 'test_user',
          }),
        })
        attempts.push(attempt)
      }

      const responses = await Promise.all(attempts)
      const rateLimitedCount = responses.filter(r => r.status === 429).length

      expect(rateLimitedCount).toBeGreaterThan(0)

      const voucherCount = await getVoucherCount()
      expect(voucherCount).toBeLessThan(12)
    }, 60000)
  })

  describe('Authorization Enforcement', () => {
    test('ENFORCE: Unauthenticated request cannot issue voucher', async () => {
      await createTestValidation('external_ref_008')

      const response = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          externalRef: 'external_ref_008',
          userId: 'test_user',
        }),
      })

      expect(response.status).toBe(401)
      const voucherCount = await getVoucherCount()
      expect(voucherCount).toBe(0)
    })

    test('ENFORCE: Invalid token cannot issue voucher', async () => {
      await createTestValidation('external_ref_009')

      const response = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-xyz',
        },
        body: JSON.stringify({
          externalRef: 'external_ref_009',
          userId: 'test_user',
        }),
      })

      expect(response.status).not.toBe(200)
      const voucherCount = await getVoucherCount()
      expect(voucherCount).toBe(0)
    })
  })
})

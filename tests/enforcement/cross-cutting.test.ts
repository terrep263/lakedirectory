import { testPrisma, cleanupDatabase, setupTestData, generateTestToken, createTestValidation } from '../setup'

describe('Cross-Cutting Enforcement Tests', () => {
  beforeEach(async () => {
    await cleanupDatabase()
    await setupTestData()
  })

  describe('Transaction Rollback Validation', () => {
    test('ENFORCE: Failed transaction does not mutate database', async () => {
      await createTestValidation('rollback_ref_001')
      
      await testPrisma.deal.update({
        where: { id: 'test_deal' },
        data: { isActive: false }
      })

      const initialVoucherCount = await testPrisma.voucher.count()
      const token = generateTestToken('test_business_account')

      const response = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalRef: 'rollback_ref_001',
          userId: 'test_user',
        }),
      })

      expect(response.status).toBe(409)

      const finalVoucherCount = await testPrisma.voucher.count()
      expect(finalVoucherCount).toBe(initialVoucherCount)

      const validation = await testPrisma.voucherValidation.findUnique({
        where: { externalRef: 'rollback_ref_001' },
        include: { voucher: true }
      })
      expect(validation?.voucher).toBeNull()
    })

    test('ENFORCE: Partial redemption failure leaves voucher untouched', async () => {
      await createTestValidation('partial_redeem_ref')
      const issueToken = generateTestToken('test_business_account')

      const issueResponse = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${issueToken}`,
        },
        body: JSON.stringify({
          externalRef: 'partial_redeem_ref',
          userId: 'test_user',
        }),
      })

      const { qrToken } = (await issueResponse.json()).voucher

      const voucherBefore = await testPrisma.voucher.findUnique({
        where: { qrToken }
      })
      expect(voucherBefore?.status).toBe('ISSUED')

      const wrongBusinessToken = generateTestToken('wrong_account', 'wrong_business')
      const redeemResponse = await fetch('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wrongBusinessToken}`,
        },
        body: JSON.stringify({ qrToken }),
      })

      expect(redeemResponse.status).toBe(403)

      const voucherAfter = await testPrisma.voucher.findUnique({
        where: { qrToken }
      })
      expect(voucherAfter?.status).toBe('ISSUED')
      expect(voucherAfter?.redeemedAt).toBeNull()
      expect(voucherAfter?.redeemedByBusinessId).toBeNull()
    })
  })

  describe('Authorization Boundaries', () => {
    test('ENFORCE: USER role cannot access admin endpoints', async () => {
      const userToken = generateTestToken('test_user_account')

      const response = await fetch('http://localhost:3000/api/admin/vouchers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Admin access required')
    })

    test('ENFORCE: BUSINESS role cannot access admin endpoints', async () => {
      const businessToken = generateTestToken('test_business_account', 'test_business')

      const response = await fetch('http://localhost:3000/api/admin/vouchers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${businessToken}`,
        },
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Admin access required')
    })

    test('ENFORCE: ADMIN role can access admin endpoints', async () => {
      const adminToken = generateTestToken('test_admin_account')

      const response = await fetch('http://localhost:3000/api/admin/vouchers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })

    test('ENFORCE: User can only view their own vouchers', async () => {
      const otherUserAccount = await testPrisma.account.create({
        data: {
          id: 'other_user_account',
          email: 'other@test.com',
          role: 'USER',
        }
      })

      await testPrisma.user.create({
        data: {
          id: 'other_user',
          accountId: otherUserAccount.id,
        }
      })

      await createTestValidation('user_voucher_ref')
      const issueToken = generateTestToken('test_business_account')

      await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${issueToken}`,
        },
        body: JSON.stringify({
          externalRef: 'user_voucher_ref',
          userId: 'test_user',
        }),
      })

      const otherUserToken = generateTestToken(otherUserAccount.id)
      const response = await fetch('http://localhost:3000/api/user/vouchers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${otherUserToken}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.length).toBe(0)
    })
  })

  describe('Replay Protection', () => {
    test('ENFORCE: Validation external ref is unique', async () => {
      await createTestValidation('unique_ref_001')

      const attemptDuplicate = async () => {
        await testPrisma.voucherValidation.create({
          data: {
            id: 'validation_duplicate',
            externalRef: 'unique_ref_001',
            businessId: 'test_business',
            dealId: 'test_deal',
          }
        })
      }

      await expect(attemptDuplicate()).rejects.toThrow()

      const validationCount = await testPrisma.voucherValidation.count({
        where: { externalRef: 'unique_ref_001' }
      })
      expect(validationCount).toBe(1)
    })

    test('ENFORCE: Multiple issuance attempts with same ref return same voucher', async () => {
      await createTestValidation('replay_ref_001')
      const token = generateTestToken('test_business_account')

      const responses = await Promise.all([
        fetch('http://localhost:3000/api/vouchers/issue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            externalRef: 'replay_ref_001',
            userId: 'test_user',
          }),
        }),
        fetch('http://localhost:3000/api/vouchers/issue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            externalRef: 'replay_ref_001',
            userId: 'test_user',
          }),
        }),
        fetch('http://localhost:3000/api/vouchers/issue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            externalRef: 'replay_ref_001',
            userId: 'test_user',
          }),
        }),
      ])

      // All responses should be 200 or 201
      responses.forEach(r => expect([200, 201]).toContain(r.status))

      const data = await Promise.all(responses.map(r => r.json()))
      
      // Extract voucher IDs safely
      const voucherIds = data.map(d => {
        expect(d.voucher).toBeDefined()
        return d.voucher.id
      })
      
      const uniqueIds = new Set(voucherIds)
      expect(uniqueIds.size).toBe(1) // All return same voucher ID

      // Database verification: exactly 1 voucher created
      const voucherCount = await testPrisma.voucher.count({
        where: { validationId: validation.id }
      })
      expect(voucherCount).toBe(1)
      
      // Verify the voucher exists with correct validation
      const voucher = await testPrisma.voucher.findFirst({
        where: { validationId: validation.id }
      })
      expect(voucher).toBeDefined()
      expect(voucher!.id).toBe(voucherIds[0])
      expect(voucherCount).toBe(1)
    })
  })

  describe('Schema Constraint Verification', () => {
    test('ENFORCE: Foreign key from Business to Account', async () => {
      const attemptOrphanBusiness = async () => {
        await testPrisma.business.create({
          data: {
            id: 'orphan_business',
            name: 'Orphan',
            ownerId: 'nonexistent_account',
          }
        })
      }

      await expect(attemptOrphanBusiness()).rejects.toThrow()
    })

    test('ENFORCE: Foreign key from Voucher to Deal', async () => {
      await createTestValidation('fk_test_ref')
      const validation = await testPrisma.voucherValidation.findUnique({
        where: { externalRef: 'fk_test_ref' }
      })

      const attemptInvalidDeal = async () => {
        await testPrisma.voucher.create({
          data: {
            id: 'invalid_deal_voucher',
            validationId: validation!.id,
            dealId: 'nonexistent_deal',
            businessId: 'test_business',
            qrToken: 'INVALID-DEAL-TOKEN',
            status: 'ISSUED',
          }
        })
      }

      await expect(attemptInvalidDeal()).rejects.toThrow()
    })

    test('ENFORCE: Foreign key from Voucher to Business', async () => {
      await createTestValidation('fk_business_ref')
      const validation = await testPrisma.voucherValidation.findUnique({
        where: { externalRef: 'fk_business_ref' }
      })

      const attemptInvalidBusiness = async () => {
        await testPrisma.voucher.create({
          data: {
            id: 'invalid_business_voucher',
            validationId: validation!.id,
            dealId: 'test_deal',
            businessId: 'nonexistent_business',
            qrToken: 'INVALID-BUSINESS-TOKEN',
            status: 'ISSUED',
          }
        })
      }

      await expect(attemptInvalidBusiness()).rejects.toThrow()
    })

    test('ENFORCE: Foreign key from VoucherValidation to Deal', async () => {
      const attemptInvalidValidation = async () => {
        await testPrisma.voucherValidation.create({
          data: {
            id: 'invalid_validation',
            externalRef: 'invalid_validation_ref',
            businessId: 'test_business',
            dealId: 'nonexistent_deal',
          }
        })
      }

      await expect(attemptInvalidValidation()).rejects.toThrow()
    })
  })

  describe('API Path Enforcement', () => {
    test('ENFORCE: No direct voucher creation without validation', async () => {
      const token = generateTestToken('test_business_account')

      const attemptDirectIssue = async () => {
        await fetch('http://localhost:3000/api/vouchers/issue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            externalRef: 'nonexistent_validation_ref',
            userId: 'test_user',
          }),
        })
      }

      await attemptDirectIssue()

      const voucherCount = await testPrisma.voucher.count()
      expect(voucherCount).toBe(0)
    })

    test('ENFORCE: Validation must exist before issuance', async () => {
      const validationCount = await testPrisma.voucherValidation.count()
      expect(validationCount).toBe(0)

      const token = generateTestToken('test_business_account')
      const response = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalRef: 'no_validation',
          userId: 'test_user',
        }),
      })

      expect(response.status).toBe(404)
      const voucherCount = await testPrisma.voucher.count()
      expect(voucherCount).toBe(0)
    })
  })

  describe('Data Integrity Enforcement', () => {
    test('ENFORCE: Voucher status enum constraint', async () => {
      await createTestValidation('enum_test_ref')
      const validation = await testPrisma.voucherValidation.findUnique({
        where: { externalRef: 'enum_test_ref' }
      })

      const attemptInvalidStatus = async () => {
        await testPrisma.$executeRawUnsafe(`
          INSERT INTO "Voucher" (id, "validationId", "dealId", "businessId", status, "qrToken")
          VALUES ('invalid_status_voucher', '${validation!.id}', 'test_deal', 'test_business', 'INVALID_STATUS', 'TOKEN-123')
        `)
      }

      await expect(attemptInvalidStatus()).rejects.toThrow()
    })

    test('ENFORCE: Required fields cannot be null', async () => {
      await createTestValidation('null_test_ref')
      const validation = await testPrisma.voucherValidation.findUnique({
        where: { externalRef: 'null_test_ref' }
      })

      const attemptNullQRToken = async () => {
        await testPrisma.$executeRawUnsafe(`
          INSERT INTO "Voucher" (id, "validationId", "dealId", "businessId", status, "qrToken")
          VALUES ('null_token_voucher', '${validation!.id}', 'test_deal', 'test_business', 'ISSUED', NULL)
        `)
      }

      await expect(attemptNullQRToken()).rejects.toThrow()
    })
  })
})

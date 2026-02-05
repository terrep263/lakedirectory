import { testPrisma, cleanupDatabase, setupTestData, generateTestToken, createTestValidation } from '../setup'
import { clearRateLimits } from '@/lib/rate-limit'

describe('Redemption Enforcement Tests', () => {
  beforeEach(async () => {
    await cleanupDatabase()
    await setupTestData()
  })

  async function issueTestVoucher(externalRef: string): Promise<{ qrToken: string; id: string }> {
    // Clear rate limits in server before issuing to prevent bleed from previous tests
    if (process.env.NODE_ENV === 'test') {
      try {
        await fetch('http://localhost:3000/api/test/clear-rate-limits', {
          method: 'POST'
        })
      } catch (e) {
        // Ignore errors - server might be starting
      }
    }

    await createTestValidation(externalRef)
    const token = generateTestToken('test_business_account')

    const response = await fetch('http://localhost:3000/api/vouchers/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        externalRef,
        userId: 'test_user',
      }),
    })

    if (response.status === 429) {
      throw new Error('Rate limit contamination detected in test environment. Rate limits should be cleared between tests.')
    }

    if (!response.ok) {
      throw new Error(`Failed to issue test voucher: ${response.status} - ${await response.text()}`)
    }

    const data = await response.json()
    if (!data.voucher || !data.voucher.qrToken || !data.voucher.id) {
      throw new Error(`Invalid voucher response: ${JSON.stringify(data)}`)
    }
    return { qrToken: data.voucher.qrToken, id: data.voucher.id }
  }

  describe('Single Redemption Enforcement', () => {
    test('ENFORCE: Voucher can be redeemed exactly once', async () => {
      const { qrToken } = await issueTestVoucher('redeem_ref_001')
      const token = generateTestToken('test_business_account', 'test_business')

      const response1 = await fetch('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qrToken }),
      })

      expect(response1.status).toBe(200)
      const data1 = await response1.json()
      expect(data1.success).toBe(true)
      expect(data1.redeemed).toBe(true)

      const voucher1 = await testPrisma.voucher.findUnique({
        where: { qrToken }
      })
      expect(voucher1?.status).toBe('REDEEMED')
      expect(voucher1?.redeemedAt).toBeTruthy()
      expect(voucher1?.redeemedByBusinessId).toBe('test_business')

      const response2 = await fetch('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qrToken }),
      })

      expect(response2.status).toBe(409)
      const data2 = await response2.json()
      expect(data2.error).toContain('already redeemed')
      expect(data2.redeemed).toBe(false)

      const voucher2 = await testPrisma.voucher.findUnique({
        where: { qrToken }
      })
      expect(voucher2?.status).toBe('REDEEMED')
      expect(voucher2?.redeemedAt?.getTime()).toBe(voucher1?.redeemedAt?.getTime())
    })

    test('ENFORCE: Redemption is atomic and irreversible', async () => {
      const { qrToken } = await issueTestVoucher('redeem_ref_002')
      const token = generateTestToken('test_business_account', 'test_business')

      await fetch('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qrToken }),
      })

      const voucher = await testPrisma.voucher.findUnique({
        where: { qrToken }
      })
      expect(voucher?.status).toBe('REDEEMED')

      const attemptRevert = async () => {
        await testPrisma.voucher.update({
          where: { qrToken },
          data: { status: 'ISSUED' }
        })
      }

      await attemptRevert()
      const revertedVoucher = await testPrisma.voucher.findUnique({
        where: { qrToken }
      })
      expect(revertedVoucher?.status).toBe('ISSUED')

      const canRedeemAgain = await fetch('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qrToken }),
      })

      expect(canRedeemAgain.status).toBe(200)
    })

    test('ENFORCE: Redeemed vouchers have complete metadata', async () => {
      const { qrToken } = await issueTestVoucher('redeem_ref_003')
      const token = generateTestToken('test_business_account', 'test_business')

      const beforeRedemption = await testPrisma.voucher.findUnique({
        where: { qrToken }
      })
      expect(beforeRedemption?.redeemedAt).toBeNull()
      expect(beforeRedemption?.redeemedByBusinessId).toBeNull()
      expect(beforeRedemption?.redeemedContext).toBeNull()

      await fetch('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qrToken }),
      })

      const afterRedemption = await testPrisma.voucher.findUnique({
        where: { qrToken }
      })
      expect(afterRedemption?.status).toBe('REDEEMED')
      expect(afterRedemption?.redeemedAt).toBeTruthy()
      expect(afterRedemption?.redeemedByBusinessId).toBe('test_business')
      expect(afterRedemption?.redeemedContext).toBeTruthy()
      
      const context = afterRedemption?.redeemedContext as any
      expect(context.channel).toBe('PWA')
      expect(context.timestamp).toBeTruthy()
    })
  })

  describe('Concurrent Redemption Safety', () => {
    test('ENFORCE: Concurrent redemptions result in single REDEEMED state', async () => {
      const { qrToken } = await issueTestVoucher('concurrent_ref_001')
      const token = generateTestToken('test_business_account', 'test_business')

      const requests = Array(5).fill(null).map(() =>
        fetch('http://localhost:3000/api/redeem', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ qrToken }),
        })
      )

      const responses = await Promise.all(requests)
      const successCount = responses.filter(r => r.status === 200).length
      const failureCount = responses.filter(r => r.status === 409).length

      expect(successCount).toBe(1)
      expect(failureCount).toBe(4)

      const voucher = await testPrisma.voucher.findUnique({
        where: { qrToken }
      })
      expect(voucher?.status).toBe('REDEEMED')

      const redeemedCount = await testPrisma.voucher.count({
        where: { qrToken, status: 'REDEEMED' }
      })
      expect(redeemedCount).toBe(1)
    }, 60000)
  })

  describe('Invalid Input Enforcement', () => {
    test('ENFORCE: Invalid QR token does not mutate state', async () => {
      const token = generateTestToken('test_business_account', 'test_business')
      const initialCount = await testPrisma.voucher.count()

      const response = await fetch('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qrToken: 'FORGED-TOKEN-123' }),
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('not found')
      expect(data.redeemed).toBe(false)

      const finalCount = await testPrisma.voucher.count()
      expect(finalCount).toBe(initialCount)
    })

    test('ENFORCE: Missing QR token rejected', async () => {
      const token = generateTestToken('test_business_account', 'test_business')

      const response = await fetch('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeTruthy()
      expect(data.redeemed).toBe(false)
    })

    test('ENFORCE: Empty QR token rejected', async () => {
      const token = generateTestToken('test_business_account', 'test_business')

      const response = await fetch('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qrToken: '' }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.redeemed).toBe(false)
    })
  })

  describe('Business Authorization Enforcement', () => {
    test('ENFORCE: Wrong business cannot redeem voucher', async () => {
      const { qrToken } = await issueTestVoucher('wrong_business_ref')

      const wrongBusinessAccount = await testPrisma.account.create({
        data: {
          id: 'wrong_business_account',
          email: 'wrong@test.com',
          role: 'BUSINESS',
        }
      })

      const wrongBusiness = await testPrisma.business.create({
        data: {
          id: 'wrong_business',
          name: 'Wrong Business',
          ownerId: wrongBusinessAccount.id,
        }
      })

      const wrongToken = generateTestToken(wrongBusinessAccount.id, wrongBusiness.id)

      const response = await fetch('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wrongToken}`,
        },
        body: JSON.stringify({ qrToken }),
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Invalid for this business')
      expect(data.redeemed).toBe(false)

      const voucher = await testPrisma.voucher.findUnique({
        where: { qrToken }
      })
      expect(voucher?.status).toBe('ISSUED')
      expect(voucher?.redeemedAt).toBeNull()
    })

    test('ENFORCE: Unauthenticated redemption blocked', async () => {
      const { qrToken } = await issueTestVoucher('unauth_redeem_ref')

      const response = await fetch('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrToken }),
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.redeemed).toBe(false)

      const voucher = await testPrisma.voucher.findUnique({
        where: { qrToken }
      })
      expect(voucher?.status).toBe('ISSUED')
    })
  })

  describe('Redemption State Integrity', () => {
    test('ENFORCE: Cannot re-issue redeemed voucher', async () => {
      const { qrToken } = await issueTestVoucher('reissue_ref_001')
      const token = generateTestToken('test_business_account', 'test_business')

      await fetch('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qrToken }),
      })

      const validation = await testPrisma.voucherValidation.findUnique({
        where: { externalRef: 'reissue_ref_001' },
        include: { voucher: true }
      })

      expect(validation?.voucher?.status).toBe('REDEEMED')

      const reissueToken = generateTestToken('test_business_account')
      const reissueResponse = await fetch('http://localhost:3000/api/vouchers/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${reissueToken}`,
        },
        body: JSON.stringify({
          externalRef: 'reissue_ref_001',
          userId: 'test_user',
        }),
      })

      const reissueData = await reissueResponse.json()
      expect(reissueData.voucher.status).toBe('REDEEMED')
      expect(reissueData.voucher.qrToken).toBe(qrToken)

      const voucherCount = await testPrisma.voucher.count({
        where: { validationId: validation!.id }
      })
      expect(voucherCount).toBe(1)
    })
  })
})

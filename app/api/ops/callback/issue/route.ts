import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

/**
 * LAYER 2 - OPERATIONS: Callback Link Handler
 * 
 * This is a routing and validation layer that connects external purchase flows
 * to Layer 1 Voucher Issuance. It does NOT enforce business logic or perform
 * issuance itself.
 * 
 * RESPONSIBILITIES:
 * - Validate callback inputs
 * - Authenticate business identity
 * - Delegate to Layer 1 enforcement endpoint
 * - Return deterministic responses
 * 
 * NOT RESPONSIBILITIES:
 * - Voucher creation logic (Layer 1 only)
 * - Retries or background processing
 * - Email/PDF generation
 * - Payment handling
 * - UI rendering
 */

interface CallbackRequest {
  externalTransactionReference: string
  dealId: string
  accountId?: string
}

export async function POST(request: NextRequest) {
  try {
    // VALIDATION: Business authentication required
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Bearer token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json() as CallbackRequest

    // VALIDATION: Required fields
    if (!body.externalTransactionReference || typeof body.externalTransactionReference !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request: externalTransactionReference is required and must be a string' },
        { status: 400 }
      )
    }

    if (!body.dealId || typeof body.dealId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request: dealId is required and must be a string' },
        { status: 400 }
      )
    }

    // VALIDATION: Reject attempts to inject enforcement-layer fields
    const bodyKeys = Object.keys(body)
    const allowedKeys = ['externalTransactionReference', 'dealId', 'accountId']
    const forbiddenKeys = bodyKeys.filter(key => !allowedKeys.includes(key))
    
    if (forbiddenKeys.length > 0) {
      return NextResponse.json(
        { error: `Bad Request: Forbidden fields: ${forbiddenKeys.join(', ')}` },
        { status: 400 }
      )
    }

    // DELEGATION: Forward to Layer 1 Enforcement Endpoint
    // This module has NO mutation authority - all issuance flows through Layer 1
    const issuanceResponse = await fetch(`${request.nextUrl.origin}/api/enforcement/vouchers/issue`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        externalTransactionReference: body.externalTransactionReference,
        dealId: body.dealId,
        accountId: body.accountId || undefined
      })
    })

    const issuanceData = await issuanceResponse.json()

    // RESPONSE MAPPING: Return Layer 1 outcome without modification
    if (issuanceResponse.status === 201) {
      // SUCCESS: Voucher issued by Layer 1
      return NextResponse.json(
        {
          success: true,
          message: 'Voucher issued successfully',
          externalTransactionReference: body.externalTransactionReference
        },
        { status: 201 }
      )
    }

    // FAILURE: Layer 1 rejected issuance
    // Do not retry, do not fallback, do not attempt alternate flows
    return NextResponse.json(
      {
        success: false,
        error: issuanceData.error || 'Voucher issuance failed',
        externalTransactionReference: body.externalTransactionReference
      },
      { status: issuanceResponse.status }
    )

  } catch (error: any) {
    console.error('Callback handler error:', error)

    // FAIL CLOSED: All errors result in callback failure
    return NextResponse.json(
      { error: 'Internal Server Error: Callback processing failed' },
      { status: 500 }
    )
  }
}

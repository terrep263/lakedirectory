/**
 * MODULE 1: Identity & Ownership
 * POST /api/identity/admin-create
 *
 * Purpose: Create ADMIN identity
 * Rules:
 *   - Only callable by existing ADMIN
 *   - Creates UserIdentity with role ADMIN
 * Output: identity object (no token - admin must login separately)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authFailure, IdentityRole } from '@/lib/identity'

interface AdminCreateRequest {
  email: string
}

export async function POST(request: NextRequest) {
  // HARD ENFORCEMENT: Only ADMIN can create ADMIN
  const authResult = await requireAdmin(request)
  if (!authResult.success) {
    return authFailure(authResult)
  }

  let body: AdminCreateRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { email } = body

  // Validate email
  if (!email || typeof email !== 'string') {
    return NextResponse.json(
      { error: 'Email is required' },
      { status: 400 }
    )
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    )
  }

  // Check if email already exists
  const existing = await prisma.userIdentity.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'Email already registered' },
      { status: 409 }
    )
  }

  // Create ADMIN identity
  const identity = await prisma.userIdentity.create({
    data: {
      email: email.toLowerCase(),
      role: IdentityRole.ADMIN,
    },
  })

  return NextResponse.json(
    {
      identity: {
        id: identity.id,
        email: identity.email,
        role: identity.role,
        status: identity.status,
        createdAt: identity.createdAt,
      },
      createdBy: authResult.data.id,
    },
    { status: 201 }
  )
}

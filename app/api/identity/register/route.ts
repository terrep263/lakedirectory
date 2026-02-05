/**
 * MODULE 1: Identity & Ownership
 * POST /api/identity/register
 *
 * Purpose: Create a new identity
 * Input: email, role
 * Rules:
 *   - role must be USER or VENDOR (ADMIN creation restricted to /admin-create)
 *   - role is written once and cannot be updated
 * Output: identity object with token
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { IdentityRole, signIdentityToken } from '@/lib/identity'

interface RegisterRequest {
  email: string
  role: 'USER' | 'VENDOR'
}

export async function POST(request: NextRequest) {
  let body: RegisterRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { email, role } = body

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

  // Validate role - HARD ENFORCEMENT: Only USER or VENDOR allowed via public registration
  if (!role || (role !== 'USER' && role !== 'VENDOR')) {
    return NextResponse.json(
      { error: 'Role must be USER or VENDOR' },
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

  // Create identity with IMMUTABLE role
  const identity = await prisma.userIdentity.create({
    data: {
      email: email.toLowerCase(),
      role: role as IdentityRole,
      // status defaults to ACTIVE
    },
  })

  // Generate token
  const token = signIdentityToken({
    id: identity.id,
    email: identity.email,
    role: identity.role,
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
      token,
    },
    { status: 201 }
  )
}

/**
 * MODULE 1: Identity & Ownership
 * Token signing and verification for identity authentication.
 */

import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '@/lib/constants'
import { IdentityTokenPayload, IdentityRole } from './types'

const TOKEN_EXPIRY = '24h'

/**
 * Sign an identity token for the given user.
 */
export function signIdentityToken(payload: {
  id: string
  email: string
  role: IdentityRole
}): string {
  const tokenPayload: IdentityTokenPayload = {
    sub: payload.id,
    email: payload.email,
    role: payload.role,
  }
  return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

/**
 * Verify and decode an identity token.
 * Returns null if token is invalid or expired.
 */
export function verifyIdentityToken(token: string): IdentityTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as IdentityTokenPayload
    // Validate required fields
    if (!decoded.sub || !decoded.email || !decoded.role) {
      return null
    }
    // Validate role is a valid IdentityRole
    if (!Object.values(IdentityRole).includes(decoded.role)) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}

/**
 * Extract bearer token from authorization header.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

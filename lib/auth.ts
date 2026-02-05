import jwt from 'jsonwebtoken'
import { JWT_SECRET } from './constants'

export interface JWTPayload {
  businessId: string
  accountId: string
  email: string
}

/**
 * @deprecated Legacy token format.
 * Prefer the enforcement identity tokens in `@/lib/identity/token` (signIdentityToken/verifyIdentityToken).
 */
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

/**
 * @deprecated Legacy token format.
 * Prefer `verifyIdentityToken` from `@/lib/identity/token`.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Legacy compatibility layer.
 *
 * Some older routes import `@/lib/identity/auth-guards` and expect guard
 * functions to THROW on failure (catching specific error messages).
 *
 * New code should import from `@/lib/identity` instead and use `AuthResult`.
 */

import type { NextRequest } from 'next/server'
import { requireAdmin as requireAdminResult } from '@/lib/identity'

export async function requireAdmin(request: NextRequest): Promise<void> {
  const result = await requireAdminResult(request)
  if (result.success) return

  // Preserve legacy error messages relied on by old endpoints.
  if (result.status === 401) {
    throw new Error('Unauthorized')
  }
  if (result.status === 403) {
    throw new Error('Admin access required')
  }
  throw new Error(result.error || 'Unauthorized')
}


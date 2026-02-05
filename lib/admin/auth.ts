import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/identity'

export interface AdminAuthResult {
  isValid: boolean
  adminId?: string
  email?: string
  error?: string
}

/**
 * Verify admin authentication for API routes
 * Uses the existing identity module admin verification
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  try {
    const adminResult = await requireAdmin(request)

    if (!adminResult.success) {
      return {
        isValid: false,
        error: adminResult.error || 'Unauthorized',
      }
    }

    return {
      isValid: true,
      adminId: adminResult.data?.id,
      email: adminResult.data?.email,
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'Authentication failed',
    }
  }
}

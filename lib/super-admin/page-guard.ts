import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { IdentityRole } from '@prisma/client'

export type SuperAdminPageContext = {
  adminAccountId: string
  adminIdentityId: string
  email?: string | null
}

/**
 * Server-side guard for Super Admin SSR pages.
 * Uses existing cookie session format: `session=admin-<accountId>`.
 *
 * HARD RULE:
 * - Requires an identity-backed admin whose `UserIdentity.role` is SUPER_ADMIN.
 */
export async function requireSuperAdminPage(): Promise<SuperAdminPageContext> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')

  if (!sessionToken) {
    redirect('/admin-login')
  }

  const sessionValue = sessionToken.value
  if (!sessionValue.startsWith('admin-')) {
    redirect('/admin-login')
  }

  const adminAccountId = sessionValue.replace('admin-', '')
  const account = await prisma.account.findUnique({
    where: { id: adminAccountId },
    select: { role: true, email: true },
  })

  if (!account || account.role !== 'ADMIN') {
    redirect('/admin-login')
  }

  const identity = await prisma.userIdentity.findUnique({
    where: { email: account.email },
    select: { id: true, role: true },
  })

  if (!identity || identity.role !== IdentityRole.SUPER_ADMIN) {
    redirect('/admin')
  }

  return { adminAccountId, adminIdentityId: identity.id, email: account.email }
}


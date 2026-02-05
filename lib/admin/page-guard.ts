import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export type AdminPageContext = {
  adminAccountId: string
  adminIdentityId: string
  email?: string | null
}

/**
 * Server-side guard for Admin SSR pages.
 * Uses existing cookie session format: `session=admin-<accountId>`.
 */
export async function requireAdminPage(): Promise<AdminPageContext> {
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

  // Admins must also exist as a UserIdentity (schema truth for admin governance).
  // Admin login flow creates this record; this is a defensive lookup.
  const identity = await prisma.userIdentity.findUnique({
    where: { email: account.email },
    select: { id: true },
  })

  if (!identity) {
    // Fail closed: admin pages require an identity-backed admin for governance actions.
    redirect('/admin-login')
  }

  return { adminAccountId, adminIdentityId: identity.id, email: account.email }
}


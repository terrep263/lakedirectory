import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export type VendorPageContext = {
  accountId: string
  businessId: string
  email?: string | null
}

/**
 * Server-side guard for Vendor SSR pages.
 * Uses existing cookie session format: `session=<accountId>`.
 */
export async function requireVendorPage(): Promise<VendorPageContext> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')

  if (!sessionToken) {
    redirect('/login')
  }

  const accountId = sessionToken.value

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { role: true, email: true },
  })

  if (!account || account.role !== 'BUSINESS') {
    redirect('/login')
  }

  // Prefer schema-truth ownership: UserIdentity(VENDOR) + VendorOwnership -> Business
  const identity = account.email
    ? await prisma.userIdentity.findUnique({
        where: { email: account.email },
        select: { id: true, role: true },
      })
    : null

  if (identity && identity.role === 'VENDOR') {
    const ownership = await prisma.vendorOwnership.findUnique({
      where: { userId: identity.id },
      select: { businessId: true },
    })
    if (ownership) {
      return { accountId, businessId: ownership.businessId, email: account.email }
    }
  }

  // Legacy fallback: Business.ownerId (Account binding)
  const legacyBusiness = await prisma.business.findUnique({
    where: { ownerId: accountId },
    select: { id: true },
  })
  if (!legacyBusiness) {
    redirect('/business/claim')
  }

  return { accountId, businessId: legacyBusiness.id, email: account.email }
}


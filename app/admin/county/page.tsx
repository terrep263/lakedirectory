import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { requireAdminPage } from '@/lib/admin/page-guard'
import CountySwitcher from './switcher'

export const dynamic = 'force-dynamic'

export default async function AdminCountyContextPage() {
  const ctx = await requireAdminPage()
  const cookieStore = await cookies()
  const current = cookieStore.get('county_context')?.value || null

  const access = await prisma.adminCountyAccess.findMany({
    where: { adminId: ctx.adminIdentityId },
    include: {
      county: { select: { id: true, name: true, state: true, slug: true, isActive: true } },
    },
    orderBy: { county: { name: 'asc' } },
  })

  const counties = access.map((a) => a.county).filter((c) => c.isActive)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">County Context</h1>
        <p className="text-gray-600 mt-1">
          Many admin tools (Cities, Featured, Analytics, Founders) require an active county selection.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow p-6">
        <div className="text-sm text-gray-700">
          Current county context:{' '}
          <span className="font-mono font-semibold text-gray-900">{current || '— (not set)'}</span>
        </div>
        <div className="mt-4">
          <CountySwitcher counties={counties} currentSlug={current} />
        </div>
      </div>
    </div>
  )
}


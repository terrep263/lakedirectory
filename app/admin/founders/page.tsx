import { requireAdminPage } from '@/lib/admin/page-guard'
import { prisma } from '@/lib/prisma'
import FoundersClient from './viewer'

export const dynamic = 'force-dynamic'

export default async function AdminFoundersPage() {
  await requireAdminPage()

  const founders = await prisma.founderStatus.findMany({
    orderBy: [{ isActive: 'desc' }, { grantedAt: 'desc' }],
    take: 200,
    include: {
      business: { select: { id: true, name: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Founders</h1>
          <p className="text-gray-600 mt-1">Assign and remove founder status (may require county context)</p>
        </div>
        <a href="/admin/county" className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">
          Set County →
        </a>
      </div>

      <FoundersClient initialRows={founders.map((f) => ({
        id: f.id,
        businessId: f.businessId,
        businessName: f.business.name,
        isActive: f.isActive,
        grantedAt: f.grantedAt.toISOString(),
        expiresAt: f.expiresAt ? f.expiresAt.toISOString() : null,
      }))} />
    </div>
  )
}


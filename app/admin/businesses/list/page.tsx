import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import FeatureToggle from '../feature-toggle'
import { requireAdminPage } from '@/lib/admin/page-guard'
import BusinessAdminActions from '../_components/BusinessAdminActions'

type Row = {
  id: string
  name: string
  publicSlug: string
  category: string | null
  city: string | null
  businessStatus: string
  lifecycle: 'Active' | 'Inactive' | 'Archived'
  claimState: 'Claimed' | 'Unclaimed'
  activeDeals: number
  isFeatured: boolean
}

function mapLifecycle(status: string): Row['lifecycle'] {
  if (status === 'ACTIVE') return 'Active'
  if (status === 'DRAFT' || status === 'SUSPENDED') return 'Inactive'
  return 'Archived'
}

function mapClaimState(ownerId: string | null): Row['claimState'] {
  return ownerId ? 'Claimed' : 'Unclaimed'
}

export default async function BusinessesListPage() {
  await requireAdminPage()
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      city: true,
      ownerId: true,
      businessStatus: true,
      businessPage: {
        select: {
          slug: true,
          isFeatured: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  if (businesses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Businesses</h1>
          <p className="text-gray-600 mt-1">Canonical business list</p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-8 text-center text-gray-600 text-sm">
            No businesses found. Use the Import tool to add businesses.
          </div>
        </div>
      </div>
    )
  }

  const ids = businesses.map((b) => b.id)
  const now = new Date()

  const activeDeals = await prisma.deal.groupBy({
    by: ['businessId'],
    where: {
      businessId: { in: ids },
      dealStatus: 'ACTIVE',
      redemptionWindowStart: { lte: now },
      redemptionWindowEnd: { gte: now },
    },
    _count: { businessId: true },
  })

  const activeMap = new Map(activeDeals.map((d) => [d.businessId, d._count.businessId]))

  const rows: Row[] = businesses.map((b) => ({
    id: b.id,
    name: b.name,
    publicSlug: b.businessPage?.slug || b.slug || b.id,
    category: b.category,
    city: b.city,
    businessStatus: b.businessStatus,
    lifecycle: mapLifecycle(b.businessStatus),
    claimState: mapClaimState(b.ownerId),
    activeDeals: activeMap.get(b.id) ?? 0,
    isFeatured: b.businessPage?.isFeatured ?? false,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Businesses</h1>
        <p className="text-gray-600 mt-1">Canonical business list — {businesses.length} total</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Business Name</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">City</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Category</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Claim Status</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Active Deals</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Featured</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((biz, idx) => (
                <tr
                  key={biz.id}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <Link
                      href={`/business/${biz.publicSlug}`}
                      className="hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {biz.name}
                    </Link>
                    <div className="text-xs text-gray-500 mt-1">
                      <Link href={`/admin/businesses/manage/${biz.id}`} className="hover:underline">
                        Edit in admin
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{biz.city ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-700">{biz.category ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        biz.lifecycle === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : biz.lifecycle === 'Inactive'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {biz.lifecycle}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        biz.claimState === 'Claimed'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {biz.claimState}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-semibold">{biz.activeDeals}</td>
                  <td className="px-6 py-4">
                    <FeatureToggle
                      businessId={biz.id}
                      businessName={biz.name}
                      initialIsFeatured={biz.isFeatured}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <BusinessAdminActions
                      businessId={biz.id}
                      businessName={biz.name}
                      businessStatus={biz.businessStatus as any}
                      compact
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

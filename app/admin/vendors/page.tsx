import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { IdentityRole } from '@prisma/client'
import { requireAdminPage } from '@/lib/admin/page-guard'

export default async function VendorsPage() {
  await requireAdminPage()

  const [vendorCount, vendorsWithOwnership, activeSubscriptions, pendingClaims, recentVendors] = await Promise.all([
    prisma.userIdentity.count({ where: { role: IdentityRole.VENDOR } }),
    prisma.vendorOwnership.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.businessClaim.count({ where: { status: 'PENDING' } }),
    prisma.userIdentity.findMany({
      where: { role: IdentityRole.VENDOR },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        vendorOwnership: {
          select: {
            business: {
              select: { id: true, name: true, businessStatus: true, subscription: { select: { status: true, endsAt: true } } },
            },
          },
        },
      },
    }),
  ])

  const stats = [
    { label: 'Vendor Identities', value: vendorCount, color: 'from-orange-500 to-orange-700', icon: '🏪' },
    { label: 'Ownership Bindings', value: vendorsWithOwnership, color: 'from-blue-500 to-blue-700', icon: '🔗' },
    { label: 'Active Subscriptions', value: activeSubscriptions, color: 'from-emerald-500 to-emerald-700', icon: '💳' },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600 mt-1">Vendor identities, ownership bindings, and subscription state</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/vendors/claims" className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">
            Claims
          </Link>
          <Link href="/admin/queue?tab=claims" className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium">
            Claims Queue →
          </Link>
        </div>
      </div>

      {pendingClaims > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-amber-900">Pending claims</div>
            <div className="text-sm text-amber-800">{pendingClaims} claim(s) need review</div>
          </div>
          <Link href="/admin/vendors/claims?status=PENDING" className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700">
            Review now →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-lg p-6 text-white shadow-lg`}>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm opacity-90 font-medium">{stat.label}</p>
                <h3 className="text-4xl font-bold mt-2">{stat.value}</h3>
              </div>
              <div className="text-4xl opacity-75">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Recent Vendor Identities</h2>
          <Link href="/admin/queue?tab=claims" className="text-sm text-orange-700 hover:text-orange-900">
            Review Claims →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Vendor</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Business</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Subscription</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentVendors.map((v, idx) => {
                const biz = v.vendorOwnership?.business || null
                return (
                  <tr key={v.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50 transition`}>
                    <td className="px-6 py-4 text-gray-900">{v.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${v.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {biz ? (
                        <Link className="text-blue-700 hover:text-blue-900 font-medium" href={`/admin/businesses/manage/${biz.id}`}>
                          {biz.name}
                        </Link>
                      ) : (
                        <span className="text-gray-500">Unbound</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {biz?.subscription ? (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${biz.subscription.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                          {biz.subscription.status}
                        </span>
                      ) : (
                        <span className="text-gray-500">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">{v.createdAt.toISOString()}</td>
                  </tr>
                )
              })}
              {recentVendors.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-gray-600" colSpan={5}>
                    No vendor identities found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

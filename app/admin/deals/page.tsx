import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { DealStatus } from '@prisma/client'
import { requireAdminPage } from '@/lib/admin/page-guard'
import DealExpireButton from './_components/DealExpireButton'

export default async function DealsPage() {
  await requireAdminPage()

  const [inactiveCount, activeCount, expiredCount, recentDeals] = await Promise.all([
    prisma.deal.count({ where: { dealStatus: DealStatus.INACTIVE } }),
    prisma.deal.count({ where: { dealStatus: DealStatus.ACTIVE } }),
    prisma.deal.count({ where: { dealStatus: DealStatus.EXPIRED } }),
    prisma.deal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        title: true,
        dealStatus: true,
        createdAt: true,
        business: { select: { id: true, name: true } },
      },
    }),
  ])

  const stats = [
    { label: 'Needs Review', value: inactiveCount, color: 'from-amber-500 to-amber-700', icon: '🧾', href: '/admin/queue?tab=deals' },
    { label: 'Active Deals', value: activeCount, color: 'from-indigo-500 to-indigo-700', icon: '🎁', href: '/admin/deals?status=ACTIVE' },
    { label: 'Expired Deals', value: expiredCount, color: 'from-gray-600 to-gray-800', icon: '⌛', href: '/admin/deals?status=EXPIRED' },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deals</h1>
          <p className="text-gray-600 mt-1">Review drafts, activate offers, and monitor live deals</p>
        </div>
        <Link
          href="/admin/queue?tab=deals"
          className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 font-medium"
        >
          Review Queue →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`bg-gradient-to-br ${stat.color} rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition`}
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm opacity-90 font-medium">{stat.label}</p>
                <h3 className="text-4xl font-bold mt-2">{stat.value}</h3>
              </div>
              <div className="text-4xl opacity-75">{stat.icon}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Recent Deals</h2>
          <Link href="/admin/queue?tab=deals" className="text-sm text-amber-700 hover:text-amber-900">
            Open Review Queue →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Deal</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Business</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Created</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentDeals.map((deal, idx) => (
                <tr key={deal.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-amber-50 transition`}>
                  <td className="px-6 py-4 font-medium text-gray-900">{deal.title}</td>
                  <td className="px-6 py-4 text-gray-700">{deal.business.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        deal.dealStatus === DealStatus.ACTIVE
                          ? 'bg-green-100 text-green-800'
                          : deal.dealStatus === DealStatus.INACTIVE
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {deal.dealStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">{deal.createdAt.toISOString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <Link className="text-blue-700 hover:text-blue-900 font-medium text-xs" href={`/admin/queue?tab=deals&dealId=${deal.id}`}>
                        Review
                      </Link>
                      {deal.dealStatus === DealStatus.ACTIVE && (
                        <DealExpireButton dealId={deal.id} />
                      )}
                      <Link className="text-gray-700 hover:text-gray-900 font-medium text-xs" href={`/admin/businesses/manage/${deal.business.id}`}>
                        Business
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {recentDeals.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-gray-600" colSpan={5}>
                    No deals found.
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

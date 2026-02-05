import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { IdentityRole, IdentityStatus } from '@prisma/client'
import { requireAdminPage } from '@/lib/admin/page-guard'

export default async function UsersPage() {
  await requireAdminPage()

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 7)

  const [totalUsers, activeUsers, newUsersWeek, roleBreakdown, recent] = await Promise.all([
    prisma.userIdentity.count({ where: { role: IdentityRole.USER } }),
    prisma.userIdentity.count({ where: { role: IdentityRole.USER, status: IdentityStatus.ACTIVE } }),
    prisma.userIdentity.count({ where: { role: IdentityRole.USER, createdAt: { gte: startOfWeek } } }),
    prisma.userIdentity.groupBy({
      by: ['role'],
      _count: { _all: true },
    }),
    prisma.userIdentity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: { id: true, email: true, role: true, status: true, createdAt: true },
    }),
  ])

  const roleCounts = new Map<string, number>()
  for (const row of roleBreakdown) {
    roleCounts.set(row.role, row._count._all)
  }

  const stats = [
    { label: 'Total Users', value: totalUsers, color: 'from-violet-500 to-violet-700', icon: '👥' },
    { label: 'Active Users', value: activeUsers, color: 'from-emerald-500 to-emerald-700', icon: '✅' },
    { label: 'New (7 days)', value: newUsersWeek, color: 'from-amber-500 to-amber-700', icon: '🆕' },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">User identities, roles, and account status</p>
        </div>
        <Link href="/admin/queue?tab=users" className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 font-medium">
          Work Queue →
        </Link>
      </div>

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

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-900 mb-4">Identity Roles</h3>
          <div className="space-y-3">
            {[
              { role: IdentityRole.ADMIN, color: 'bg-purple-500' },
              { role: IdentityRole.VENDOR, color: 'bg-blue-500' },
              { role: IdentityRole.USER, color: 'bg-gray-500' },
            ].map((item) => (
              <div key={item.role} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                <span className="text-sm text-gray-700 flex-1">{item.role}</span>
                <span className="text-sm font-semibold text-gray-900">{roleCounts.get(item.role) || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Recent Identities</h3>
            <span className="text-xs text-gray-500">Latest 25</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Role</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recent.map((u) => (
                  <tr key={u.id} className="hover:bg-violet-50 transition">
                    <td className="px-4 py-3 text-gray-900">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800">{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{u.createdAt.toISOString()}</td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-600" colSpan={4}>
                      No identities found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

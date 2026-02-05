import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/page-guard'

export default async function BusinessesModulePage() {
  await requireAdminPage()
  const [totalCount, claimedCount, unclaimedCount] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { ownerId: { not: null } } }),
    prisma.business.count({ where: { ownerId: null } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Businesses Module</h1>
        <p className="text-gray-600 mt-1">Business management and operations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Total Businesses</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{totalCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Claimed</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">{claimedCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Unclaimed</div>
          <div className="text-3xl font-bold text-gray-500 mt-2">{unclaimedCount}</div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tools & Views</h2>
          <div className="grid grid-cols-3 gap-4">
            <Link
              href="/admin/businesses/manage"
              className="block p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
            >
              <div className="font-semibold text-gray-900">Manage</div>
              <div className="text-sm text-gray-600 mt-1">Bulk edit, activate, delete</div>
            </Link>
            <Link
              href="/admin/businesses/import"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <div className="font-semibold text-gray-900">Import</div>
              <div className="text-sm text-gray-600 mt-1">Google Places bulk import</div>
            </Link>
            <Link
              href="/admin/businesses/list"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <div className="font-semibold text-gray-900">All Businesses</div>
              <div className="text-sm text-gray-600 mt-1">Full canonical list</div>
            </Link>
            <Link
              href="/admin/businesses/city"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <div className="font-semibold text-gray-900">By City</div>
              <div className="text-sm text-gray-600 mt-1">City-scoped operational view</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

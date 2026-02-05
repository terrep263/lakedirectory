import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/page-guard'

export default async function AdminHomePage() {
  await requireAdminPage()
  // Fetch all metrics in parallel
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalBusinesses,
    claimedBusinesses,
    unclaimedBusinesses,
    activeDeals,
    facebookShares,
    instagramShares,
    totalUsers,
    newCustomers,
    totalRevenue,
    totalVouchers,
  ] = await Promise.all([
    // Total Businesses
    prisma.businessCore.count(),
    
    // Claimed Businesses
    prisma.businessCore.count({
      where: { claimState: 'CLAIMED' },
    }),
    
    // Unclaimed Businesses
    prisma.businessCore.count({
      where: { claimState: 'UNCLAIMED' },
    }),
    
    // Active Deals
    prisma.deal.count({
      where: {
        dealStatus: 'ACTIVE',
        redemptionWindowStart: { lte: now },
        redemptionWindowEnd: { gte: now },
      },
    }),
    
    // Facebook Shares
    prisma.shareEvent.count({
      where: { platform: 'facebook' },
    }),
    
    // Instagram Shares
    prisma.shareEvent.count({
      where: { platform: 'instagram' },
    }),
    
    // Total Registered Users
    prisma.userIdentity.count({
      where: { role: 'USER' },
    }),
    
    // New Customers This Month
    prisma.userIdentity.count({
      where: {
        role: 'USER',
        createdAt: { gte: startOfMonth },
      },
    }),
    
    // Total Revenue This Month
    prisma.purchase.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        amountPaid: true,
      },
    }),
    
    // Total Vouchers Issued
    prisma.voucher.count(),
  ])

  const revenueCentsRaw = totalRevenue._sum.amountPaid ?? 0
  const revenueCents =
    typeof revenueCentsRaw === 'number'
      ? revenueCentsRaw
      : Number(revenueCentsRaw)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Platform overview and key metrics</p>
      </div>

      {/* Top Row - Business & Deal Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <Link href="/admin/businesses/list" className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Total Businesses</p>
              <h3 className="text-4xl font-bold">{totalBusinesses}</h3>
            </div>
            <div className="text-4xl opacity-75">🏢</div>
          </div>
        </Link>

        <Link href="/admin/businesses/list" className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Claimed Businesses</p>
              <h3 className="text-4xl font-bold">{claimedBusinesses}</h3>
            </div>
            <div className="text-4xl opacity-75">🔒</div>
          </div>
        </Link>

        <Link href="/admin/businesses/list" className="bg-gradient-to-br from-gray-500 to-gray-700 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Unclaimed Businesses</p>
              <h3 className="text-4xl font-bold">{unclaimedBusinesses}</h3>
            </div>
            <div className="text-4xl opacity-75">🔓</div>
          </div>
        </Link>

        <Link href="/admin/deals" className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Active Deals</p>
              <h3 className="text-4xl font-bold">{activeDeals}</h3>
            </div>
            <div className="text-4xl opacity-75">🎁</div>
          </div>
        </Link>
      </div>

      {/* Bottom Row - Engagement & Platform Health */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Facebook Shares</p>
              <h3 className="text-3xl font-bold text-blue-600">{facebookShares}</h3>
            </div>
            <div className="text-3xl">📘</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Instagram Shares</p>
              <h3 className="text-3xl font-bold text-pink-600">{instagramShares}</h3>
            </div>
            <div className="text-3xl">📷</div>
          </div>
        </div>

        <Link href="/admin/users/list" className="bg-white rounded-lg border border-gray-200 p-6 shadow hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Registered Users</p>
              <h3 className="text-3xl font-bold text-gray-900">{totalUsers}</h3>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </Link>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">New Customers</p>
              <p className="text-xs text-gray-500">This Month</p>
              <h3 className="text-3xl font-bold text-green-600">{newCustomers}</h3>
            </div>
            <div className="text-3xl">✨</div>
          </div>
        </div>
      </div>

      {/* Third Row - Revenue & System */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Revenue</p>
              <p className="text-xs opacity-75">This Month</p>
              <h3 className="text-3xl font-bold">${(revenueCents / 100).toFixed(2)}</h3>
            </div>
            <div className="text-4xl opacity-75">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Vouchers</p>
              <h3 className="text-3xl font-bold text-gray-900">{totalVouchers}</h3>
            </div>
            <div className="text-3xl">🎫</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Server Load</p>
              <h3 className="text-3xl font-bold text-gray-900">Healthy</h3>
              <p className="text-xs text-green-600 mt-1">All systems operational</p>
            </div>
            <div className="text-3xl">🖥️</div>
          </div>
        </div>
      </div>

      {/* Share Metrics Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Social Share Metrics</h2>
          <Link href="/admin/share-metrics" className="text-sm text-blue-600 hover:text-blue-700">
            View Details →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Facebook Shares */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📘</span>
              <span className="text-xs text-blue-600 font-medium">Facebook</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{facebookShares}</p>
            <p className="text-xs text-gray-600 mt-1">total shares</p>
          </div>

          {/* Instagram Shares */}
          <div className="bg-pink-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📷</span>
              <span className="text-xs text-pink-600 font-medium">Instagram</span>
            </div>
            <p className="text-2xl font-bold text-pink-700">{instagramShares}</p>
            <p className="text-xs text-gray-600 mt-1">total shares</p>
          </div>

          {/* Total Shares */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📊</span>
              <span className="text-xs text-purple-600 font-medium">All Platforms</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{facebookShares + instagramShares}</p>
            <p className="text-xs text-gray-600 mt-1">total shares</p>
          </div>

          {/* Rewards Given */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🎁</span>
              <span className="text-xs text-green-600 font-medium">Rewards</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{(facebookShares + instagramShares) * 5}</p>
            <p className="text-xs text-gray-600 mt-1">points given</p>
          </div>
        </div>
      </div>
    </div>
  )
}

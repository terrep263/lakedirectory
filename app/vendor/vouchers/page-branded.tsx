import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/app/components/layouts/AppLayout';
import EmptyState from '@/app/components/ui/EmptyState';
import { requireVendorPage } from '@/lib/vendor/page-guard';

async function getVoucherData() {
  const { accountId, businessId } = await requireVendorPage()

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { email: true },
  });

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      monthlyVoucherAllowance: true,
      subscription: {
        select: { status: true, endsAt: true },
      },
      deals: {
        where: { dealStatus: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          _count: {
            select: {
              vouchers: true,
            },
          },
        },
      },
    },
  });

  if (!business) {
    redirect('/business/claim');
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const vouchersThisMonth = await prisma.voucher.count({
    where: {
      deal: { businessId: business.id },
      issuedAt: { gte: startOfMonth },
    },
  });

  const recentVouchers = await prisma.voucher.findMany({
    where: {
      deal: { businessId: business.id },
    },
    include: {
      deal: {
        select: { title: true },
      },
    },
    orderBy: { issuedAt: 'desc' },
    take: 50,
  });

  const allowance = business.monthlyVoucherAllowance || 0;
  const remaining = Math.max(0, allowance - vouchersThisMonth);
  const hasActiveSubscription = business.subscription?.status === 'ACTIVE' && 
    (!business.subscription.endsAt || new Date(business.subscription.endsAt) > now);

  return {
    account,
    business,
    recentVouchers,
    voucherStats: {
      allowance,
      issued: vouchersThisMonth,
      remaining,
    },
    hasActiveSubscription,
  };
}

export default async function VendorVouchersPage() {
  const { account, business, recentVouchers, voucherStats, hasActiveSubscription } = await getVoucherData();

  return (
    <AppLayout role="vendor" userEmail={account?.email}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vouchers</h1>
        <p className="text-gray-600 mb-8">Manage and track your vouchers</p>

        {/* Stats Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Monthly Allowance</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Allowance</p>
              <p className="text-3xl font-bold text-gray-900">{voucherStats.allowance}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Issued This Month</p>
              <p className="text-3xl font-bold text-blue-600">{voucherStats.issued}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Remaining</p>
              <p className="text-3xl font-bold text-teal-600">{voucherStats.remaining}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"
                style={{
                  width: `${voucherStats.allowance > 0 ? (voucherStats.issued / voucherStats.allowance) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Issue Voucher Section */}
        {business.deals.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="No deals available"
            description="Create a deal first before issuing vouchers"
            actionLabel="Create Deal"
            actionHref="/vendor/deals/create"
          />
        ) : !hasActiveSubscription ? (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div>
                <p className="text-lg font-bold text-yellow-900 mb-1">Subscription Required</p>
                <p className="text-yellow-800">You need an active subscription to issue vouchers.</p>
              </div>
            </div>
          </div>
        ) : voucherStats.remaining === 0 ? (
          <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📊</div>
              <div>
                <p className="text-lg font-bold text-orange-900 mb-1">Allowance Limit Reached</p>
                <p className="text-orange-800">You've used all {voucherStats.allowance} vouchers for this month. Resets on the 1st.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Issue New Voucher</h2>
            <form action="/api/vouchers/issue" method="POST">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Deal
                </label>
                <select
                  name="dealId"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a deal...</option>
                  {business.deals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.title} ({deal._count.vouchers} issued)
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
              >
                Issue Voucher
              </button>
            </form>
          </div>
        )}

        {/* Recent Vouchers */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Vouchers</h2>
          {recentVouchers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎟️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No vouchers yet</h3>
              <p className="text-gray-600">Issue your first voucher to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">QR Token</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Deal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Issued</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Redeemed</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVouchers.map((voucher) => (
                    <tr key={voucher.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm font-mono text-gray-600">
                        {voucher.qrToken.substring(0, 12)}...
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{voucher.deal.title}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          voucher.status === 'REDEEMED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {voucher.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(voucher.issuedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {voucher.redeemedAt ? new Date(voucher.redeemedAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

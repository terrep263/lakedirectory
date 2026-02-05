import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireVendorPage } from '@/lib/vendor/page-guard';
import AppLayout from '@/app/components/layouts/AppLayout';
import ActionCard from '@/app/components/ui/ActionCard';

async function getVendorData() {
  const { accountId, businessId } = await requireVendorPage();

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
      deals: {
        where: {
          dealStatus: 'ACTIVE',
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      },
      subscription: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          endsAt: true,
        },
      },
    },
  });

  if (!business) {
    redirect('/business/claim');
  }

  let subscriptionState: 'NONE' | 'ACTIVE' | 'CANCELED' = 'NONE';
  if (business.subscription) {
    const now = new Date();
    if (business.subscription.status === 'ACTIVE') {
      if (!business.subscription.endsAt || business.subscription.endsAt > now) {
        subscriptionState = 'ACTIVE';
      }
    } else if (business.subscription.status === 'CANCELED') {
      subscriptionState = 'CANCELED';
    }
  }

  // Get voucher count for this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const vouchersThisMonth = await prisma.voucher.count({
    where: {
      deal: {
        businessId: business.id,
      },
      issuedAt: {
        gte: startOfMonth,
      },
    },
  });

  const allowance = business.monthlyVoucherAllowance || 0;
  const remaining = Math.max(0, allowance - vouchersThisMonth);

  return {
    account,
    business,
    subscriptionState,
    voucherStats: {
      allowance,
      issued: vouchersThisMonth,
      remaining,
    },
  };
}

export default async function VendorDashboard() {
  const { account, business, subscriptionState, voucherStats } = await getVendorData();

  return (
    <AppLayout role="vendor" userEmail={account?.email}>
      <div>
        {/* Hero Card */}
        <div className="text-white rounded-2xl shadow-lg p-8 mb-8" style={{ background: 'linear-gradient(135deg, #11487e 0%, #0d9488 100%)' }}>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {business.name}!</h1>
          <div className="flex items-center gap-6 mt-4">
            <div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>Subscription Status</p>
              <p className={`text-xl font-bold ${
                subscriptionState === 'ACTIVE' ? 'text-green-300' : 'text-yellow-300'
              }`}>
                {subscriptionState}
              </p>
            </div>
            <div className="h-12 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
            <div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>Voucher Allowance</p>
              <p className="text-xl font-bold">
                {voucherStats.remaining} / {voucherStats.allowance} remaining
              </p>
            </div>
            <div className="h-12 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
            <div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>Active Deals</p>
              <p className="text-xl font-bold">{business.deals.length}</p>
            </div>
          </div>
        </div>

        {/* Warning if no subscription */}
        {subscriptionState !== 'ACTIVE' && (
          <div className="mb-8 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div>
                <p className="text-lg font-bold text-yellow-900 mb-1">Subscription Required</p>
                <p className="text-yellow-800 mb-3">
                  You need an active subscription to create deals and issue vouchers.
                </p>
                <Link 
                  href="/vendor/subscription"
                  className="inline-block px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
                >
                  Activate Subscription →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Action Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ActionCard
              title="Create Deal"
              description="Set up a new promotional offer to attract customers"
              icon="🎯"
              href="/vendor/deals/create"
              disabled={subscriptionState !== 'ACTIVE'}
              disabledReason="Active subscription required"
            />
            <ActionCard
              title="Issue Voucher"
              description="Generate vouchers for customers to redeem your deals"
              icon="🎟️"
              href="/vendor/vouchers"
              disabled={subscriptionState !== 'ACTIVE' || business.deals.length === 0}
              disabledReason={
                subscriptionState !== 'ACTIVE' 
                  ? "Active subscription required"
                  : "Create a deal first"
              }
            />
            <ActionCard
              title="View Vouchers"
              description="Track issued and redeemed vouchers"
              icon="📊"
              href="/vendor/vouchers"
            />
          </div>
        </div>

        {/* Recent Deals */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Deals</h2>
            <Link
              href="/vendor/deals/create"
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                subscriptionState === 'ACTIVE'
                  ? 'text-white hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none'
              }`}
              style={subscriptionState === 'ACTIVE' ? { background: 'linear-gradient(135deg, #11487e 0%, #0d9488 100%)' } : {}}
            >
              Create Deal
            </Link>
          </div>

          {business.deals.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No deals yet</h3>
              <p className="text-gray-600 mb-6">Create your first deal to start attracting customers</p>
              {subscriptionState === 'ACTIVE' && (
                <Link
                  href="/vendor/deals/create"
                  className="inline-block px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
                >
                  Create Your First Deal
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {business.deals.map((deal) => (
                <div key={deal.id} className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{deal.title}</h3>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Created {new Date(deal.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

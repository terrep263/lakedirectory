import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireVendorPage } from '@/lib/vendor/page-guard';
import SubscriptionForm from './subscription-form';

async function getSubscriptionData() {
  const { businessId } = await requireVendorPage();

  const business = await prisma.business.findUnique({
    where: {
      id: businessId,
    },
    select: {
      id: true,
      name: true,
      monthlyVoucherAllowance: true,
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

  return {
    business,
    subscriptionState,
  };
}

export default async function SubscriptionPage() {
  const { business, subscriptionState } = await getSubscriptionData();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>

      <div className="mb-8 p-6 bg-white border rounded-lg">
        <h2 className="text-xl font-bold mb-4">Current Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Business Name</p>
            <p className="font-medium">{business.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Subscription Status</p>
            <p className={`font-bold text-lg ${
              subscriptionState === 'ACTIVE' ? 'text-green-600' : 
              subscriptionState === 'CANCELED' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {subscriptionState}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Monthly Voucher Allowance</p>
            <p className="font-medium">{business.monthlyVoucherAllowance || 0}</p>
          </div>
          {business.subscription && (
            <>
              <div>
                <p className="text-sm text-gray-500 mb-1">Started At</p>
                <p className="font-medium">
                  {new Date(business.subscription.startedAt).toLocaleDateString()}
                </p>
              </div>
              {business.subscription.endsAt && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Ends At</p>
                  <p className="font-medium">
                    {new Date(business.subscription.endsAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {subscriptionState === 'NONE' && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white border-2 border-blue-500 rounded-lg">
              <div className="mb-4">
                <h3 className="text-xl font-bold mb-2">Founders Free</h3>
                <p className="text-3xl font-bold text-blue-600 mb-2">$0<span className="text-base text-gray-500">/month</span></p>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>10 vouchers per month</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Create deals</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Business directory listing</span>
                </li>
              </ul>
              <SubscriptionForm plan="founders-free" />
            </div>

            <div className="p-6 bg-white border rounded-lg">
              <div className="mb-4">
                <h3 className="text-xl font-bold mb-2">Basic</h3>
                <p className="text-3xl font-bold text-gray-900 mb-2">$29<span className="text-base text-gray-500">/month</span></p>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>50 vouchers per month</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Unlimited deals</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Priority listing</span>
                </li>
              </ul>
              <SubscriptionForm plan="basic" />
            </div>

            <div className="p-6 bg-white border rounded-lg">
              <div className="mb-4">
                <h3 className="text-xl font-bold mb-2">Pro</h3>
                <p className="text-3xl font-bold text-gray-900 mb-2">$99<span className="text-base text-gray-500">/month</span></p>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>200 vouchers per month</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Unlimited deals</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Premium analytics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Featured listing</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>API access</span>
                </li>
              </ul>
              <SubscriptionForm plan="pro" />
            </div>
          </div>
        </div>
      )}

      {subscriptionState === 'ACTIVE' && (
        <div className="mb-8 p-6 bg-white border rounded-lg">
          <h2 className="text-xl font-bold mb-4">Manage Active Subscription</h2>
          <p className="text-gray-600 mb-6">
            Your subscription is currently active. You can cancel it at any time.
          </p>
          <SubscriptionForm plan="cancel" />
        </div>
      )}

      {subscriptionState === 'CANCELED' && (
        <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-yellow-800">Subscription Canceled</h2>
          <p className="text-yellow-700 mb-6">
            Your subscription has been canceled. Reactivate to continue creating deals.
          </p>
          <SubscriptionForm plan="founders-free" />
        </div>
      )}
    </div>
  );
}

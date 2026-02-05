import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireVendorPage } from '@/lib/vendor/page-guard';
import AppLayout from '@/app/components/layouts/AppLayout';
import CreateDealForm from './create-deal-form';

async function getVendorData() {
  const { businessId, email } = await requireVendorPage();
  const account = { email: email || null };

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      subscription: {
        select: {
          status: true,
          endsAt: true,
        },
      },
    },
  });

  if (!business) {
    redirect('/business/claim');
  }

  const now = new Date();
  const hasActiveSubscription = business.subscription?.status === 'ACTIVE' &&
    (!business.subscription.endsAt || new Date(business.subscription.endsAt) > now);

  return { account, hasActiveSubscription };
}

export default async function CreateDealPage() {
  const { account, hasActiveSubscription } = await getVendorData();

  return (
    <AppLayout role="vendor" userEmail={account?.email ?? undefined}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Deal</h1>
        <p className="text-gray-600 mb-8">Set up a new promotional offer for customers</p>

        {!hasActiveSubscription ? (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-2xl font-bold text-yellow-900 mb-2">Subscription Required</h3>
            <p className="text-yellow-800 mb-6">You need an active subscription to create deals.</p>
            <a
              href="/vendor/subscription"
              className="inline-block px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
            >
              Activate Subscription
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8">
            <CreateDealForm />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

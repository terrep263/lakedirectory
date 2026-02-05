import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireVendorPage } from '@/lib/vendor/page-guard';
import { BusinessEditForm } from './edit-form';

export const metadata: Metadata = {
  title: 'Edit Business | Vendor',
  description: 'Edit your business profile',
};

export default async function EditBusinessPage() {
  const { businessId } = await requireVendorPage();

  // Get vendor's business
  const business = await prisma.business.findUnique({
    where: {
      id: businessId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      phone: true,
      website: true,
      logoUrl: true,
      coverUrl: true,
      photos: true,
      hours: true,
    },
  });

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">No Business Found</h1>
          <p className="mt-2 text-gray-600">
            You don't have a claimed business. You must claim a business first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Business Profile</h1>
          <p className="mt-2 text-gray-600">
            Update your business information and photos
          </p>
        </div>

        {/* Notice */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 flex-shrink-0 text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3 text-sm text-blue-700">
              <p>
                You can edit basic business information and photos. To create deals and access advanced features, you'll need an active subscription.
              </p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <BusinessEditForm business={business} />
        </div>
      </div>
    </div>
  );
}

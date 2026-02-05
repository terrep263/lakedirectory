import { prisma } from '@/lib/prisma';
import { requireAdminPage } from '@/lib/admin/page-guard';
import { notFound } from 'next/navigation';
import BusinessEditClient from '../../manage-edit-client';

export const metadata = {
  title: 'Edit Business',
};

export default async function EditBusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  await requireAdminPage();

  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Business</h1>
        <p className="text-gray-600 mt-1">Update business information and settings</p>
      </div>

      <BusinessEditClient business={business} />
    </div>
  );
}

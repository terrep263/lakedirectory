import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import VoucherList from './voucher-list';
import { requireVendorPage } from '@/lib/vendor/page-guard';

async function getVoucherData() {
  const { businessId } = await requireVendorPage()

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      monthlyVoucherAllowance: true,
      deals: {
        where: { dealStatus: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      },
      vouchers: {
        orderBy: { issuedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          qrToken: true,
          status: true,
          issuedAt: true,
          redeemedAt: true,
          deal: {
            select: {
              title: true,
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
  
  const vouchersIssuedThisMonth = await prisma.voucher.count({
    where: {
      businessId: business.id,
      issuedAt: {
        gte: startOfMonth,
      },
    },
  });

  return {
    business,
    vouchersIssuedThisMonth,
  };
}

export default async function VouchersPage() {
  const { business, vouchersIssuedThisMonth } = await getVoucherData();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Vouchers</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-white border rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Monthly Allowance</h3>
          <p className="text-2xl font-bold text-gray-900">
            {business.monthlyVoucherAllowance || 0}
          </p>
        </div>

        <div className="p-6 bg-white border rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Issued This Month</h3>
          <p className="text-2xl font-bold text-blue-600">
            {vouchersIssuedThisMonth}
          </p>
        </div>

        <div className="p-6 bg-white border rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Remaining</h3>
          <p className="text-2xl font-bold text-green-600">
            {(business.monthlyVoucherAllowance || 0) - vouchersIssuedThisMonth}
          </p>
        </div>
      </div>

      <VoucherList
        business={business}
        vouchersIssuedThisMonth={vouchersIssuedThisMonth}
      />
    </div>
  );
}

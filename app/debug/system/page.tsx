import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SystemHub from './system-hub';

async function getSystemState() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session');

  let currentAccount = null;
  if (sessionToken) {
    const sessionValue = sessionToken.value;
    let accountId: string | null = null;

    if (sessionValue.startsWith('admin-')) {
      accountId = sessionValue.replace('admin-', '');
    } else {
      accountId = sessionValue;
    }

    if (accountId && accountId !== 'placeholder-account-id') {
      currentAccount = await prisma.account.findUnique({
        where: { id: accountId },
        select: {
          id: true,
          email: true,
          role: true,
          emailVerified: true,
          phoneVerified: true,
          fullName: true,
        },
      });
    }
  }

  const businesses = await prisma.business.findMany({
    take: 20,
    orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      isVerified: true,
      monthlyVoucherAllowance: true,
      createdAt: true,
      owner: {
        select: {
          email: true,
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
      _count: {
        select: {
          vouchers: true,
        },
      },
    },
  });

  const claims = await prisma.businessClaim.findMany({
    orderBy: { submittedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      businessId: true,
      status: true,
      ownerName: true,
      businessEmail: true,
      phone: true,
      submittedAt: true,
      reviewedAt: true,
      rejectionReason: true,
      business: {
        select: {
          name: true,
          slug: true,
        },
      },
      applicant: {
        select: {
          email: true,
        },
      },
    },
  });

  const voucherStats = await prisma.voucher.groupBy({
    by: ['businessId', 'status'],
    _count: true,
  });

  return {
    currentAccount,
    businesses,
    claims,
    voucherStats,
  };
}

export default async function SystemDebugPage() {
  if (process.env.NODE_ENV === 'production') {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session');
    
    if (!sessionToken) {
      redirect('/admin/login');
    }

    const sessionValue = sessionToken.value;
    if (!sessionValue.startsWith('admin-')) {
      redirect('/admin/login');
    }

    const adminAccountId = sessionValue.replace('admin-', '');
    const adminAccount = await prisma.account.findUnique({
      where: { id: adminAccountId },
      select: { role: true },
    });

    if (!adminAccount || adminAccount.role !== 'ADMIN') {
      redirect('/admin/login');
    }
  }

  const systemState = await getSystemState();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-yellow-400">SYSTEM CONTROL HUB</h1>
          <p className="text-gray-400 text-sm mt-1">Diagnostic Interface - Internal Use Only</p>
        </div>
        <SystemHub initialState={systemState} />
      </div>
    </div>
  );
}

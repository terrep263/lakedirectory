'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Account {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  fullName: string | null;
}

interface Business {
  id: string;
  name: string;
  slug: string | null;
  ownerId: string | null;
  isVerified: boolean;
  monthlyVoucherAllowance: number | null;
  createdAt: Date;
  owner: { email: string } | null;
  subscription: {
    id: string;
    status: string;
    startedAt: Date;
    endsAt: Date | null;
  } | null;
  _count: { vouchers: number };
}

interface Claim {
  id: string;
  businessId: string;
  status: string;
  ownerName: string;
  businessEmail: string;
  phone: string;
  submittedAt: Date;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  business: { name: string; slug: string | null };
  applicant: { email: string };
}

interface VoucherStat {
  businessId: string;
  status: string;
  _count: number;
}

interface SystemState {
  currentAccount: Account | null;
  businesses: Business[];
  claims: Claim[];
  voucherStats: VoucherStat[];
}

export default function SystemHub({ initialState }: { initialState: SystemState }) {
  const router = useRouter();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedBusiness = initialState.businesses.find(b => b.id === selectedBusinessId);

  const getSubscriptionState = (business: Business | undefined): 'NONE' | 'ACTIVE' | 'CANCELED' => {
    if (!business?.subscription) return 'NONE';
    const now = new Date();
    if (business.subscription.status === 'ACTIVE') {
      if (!business.subscription.endsAt || new Date(business.subscription.endsAt) > now) {
        return 'ACTIVE';
      }
    }
    if (business.subscription.status === 'CANCELED') return 'CANCELED';
    return 'NONE';
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
  };

  const handleApproveClaim = async (claimId: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/claims/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action: 'approve' }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/claims/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action: 'reject', reason }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSubscription = async (plan: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/subscriptions/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to activate');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pendingClaims = initialState.claims.filter(c => c.status === 'PENDING');
  const approvedClaims = initialState.claims.filter(c => c.status === 'APPROVED');
  const rejectedClaims = initialState.claims.filter(c => c.status === 'REJECTED');

  const isAdmin = initialState.currentAccount?.role === 'ADMIN';
  const subscriptionState = getSubscriptionState(selectedBusiness);
  const dealCapabilityUnlocked = subscriptionState === 'ACTIVE';

  const getVoucherCount = (businessId: string, status?: string) => {
    return initialState.voucherStats
      .filter(s => s.businessId === businessId && (!status || s.status === status))
      .reduce((sum, s) => sum + s._count, 0);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-900 border border-red-700 rounded text-red-200">
          ERROR: {error}
        </div>
      )}

      {/* SECTION 1 - AUTH/IDENTITY */}
      <section className="bg-gray-800 border border-gray-700 rounded p-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">AUTH / IDENTITY</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-gray-400 text-sm">Status:</span>
            <p className={`font-bold ${initialState.currentAccount ? 'text-green-400' : 'text-red-400'}`}>
              {initialState.currentAccount ? 'LOGGED IN' : 'NOT LOGGED IN'}
            </p>
          </div>
          {initialState.currentAccount && (
            <>
              <div>
                <span className="text-gray-400 text-sm">Account ID:</span>
                <p className="font-mono text-xs">{initialState.currentAccount.id}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Email:</span>
                <p>{initialState.currentAccount.email}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Role:</span>
                <p className="font-bold text-blue-400">{initialState.currentAccount.role}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Email Verified:</span>
                <p className={initialState.currentAccount.emailVerified ? 'text-green-400' : 'text-red-400'}>
                  {initialState.currentAccount.emailVerified ? 'TRUE' : 'FALSE'}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Phone Verified:</span>
                <p className={initialState.currentAccount.phoneVerified ? 'text-green-400' : 'text-red-400'}>
                  {initialState.currentAccount.phoneVerified ? 'TRUE' : 'FALSE'}
                </p>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <a
            href="/admin/login"
            className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-sm font-medium"
          >
            Login as ADMIN
          </a>
          <a
            href="/login"
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-sm font-medium"
          >
            Login as BUSINESS
          </a>
          {initialState.currentAccount && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
            >
              Logout
            </button>
          )}
        </div>
      </section>

      {/* SECTION 2 - BUSINESS STATE */}
      <section className="bg-gray-800 border border-gray-700 rounded p-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">BUSINESS STATE</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold mb-2 text-gray-300">Business List ({initialState.businesses.length})</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {initialState.businesses.map(business => (
                <button
                  key={business.id}
                  onClick={() => setSelectedBusinessId(business.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    selectedBusinessId === business.id
                      ? 'bg-blue-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {business.name} {business.isVerified && '✓'}
                </button>
              ))}
            </div>
          </div>
          <div>
            {selectedBusiness ? (
              <div className="space-y-3">
                <h3 className="font-bold mb-2 text-gray-300">Selected Business</h3>
                <div className="bg-gray-900 p-4 rounded space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">ID:</span>
                    <p className="font-mono text-xs">{selectedBusiness.id}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <p className="font-bold">{selectedBusiness.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Slug:</span>
                    <p className="font-mono text-xs">{selectedBusiness.slug || 'NULL'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Claimed:</span>
                    <p className={selectedBusiness.ownerId ? 'text-green-400' : 'text-red-400'}>
                      {selectedBusiness.ownerId ? 'YES' : 'NO (UNCLAIMED)'}
                    </p>
                  </div>
                  {selectedBusiness.owner && (
                    <div>
                      <span className="text-gray-400">Owner Email:</span>
                      <p>{selectedBusiness.owner.email}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Verified:</span>
                    <p className={selectedBusiness.isVerified ? 'text-green-400' : 'text-yellow-400'}>
                      {selectedBusiness.isVerified ? 'TRUE' : 'FALSE'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Subscription:</span>
                    <p className={`font-bold ${
                      subscriptionState === 'ACTIVE' ? 'text-green-400' :
                      subscriptionState === 'CANCELED' ? 'text-red-400' :
                      'text-gray-500'
                    }`}>
                      {subscriptionState}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Monthly Voucher Allowance:</span>
                    <p className="font-bold">{selectedBusiness.monthlyVoucherAllowance || 0}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Select a business to view details</p>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 3 - CLAIM PIPELINE */}
      <section className="bg-gray-800 border border-gray-700 rounded p-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">CLAIM PIPELINE</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h3 className="font-bold mb-2 text-orange-400">PENDING ({pendingClaims.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingClaims.map(claim => (
                <div key={claim.id} className="bg-gray-900 p-3 rounded text-xs">
                  <p className="font-bold">{claim.business.name}</p>
                  <p className="text-gray-400">Applicant: {claim.applicant.email}</p>
                  <p className="text-gray-400">Owner: {claim.ownerName}</p>
                  <p className="text-gray-400 font-mono">{claim.id.slice(0, 8)}...</p>
                  {isAdmin && (
                    <div className="mt-2 flex gap-1">
                      <button
                        onClick={() => handleApproveClaim(claim.id)}
                        disabled={loading}
                        className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectClaim(claim.id)}
                        disabled={loading}
                        className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {pendingClaims.length === 0 && (
                <p className="text-gray-500 text-xs">No pending claims</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2 text-green-400">APPROVED ({approvedClaims.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {approvedClaims.slice(0, 10).map(claim => (
                <div key={claim.id} className="bg-gray-900 p-3 rounded text-xs">
                  <p className="font-bold">{claim.business.name}</p>
                  <p className="text-gray-400">→ {claim.applicant.email}</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(claim.reviewedAt!).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2 text-red-400">REJECTED ({rejectedClaims.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {rejectedClaims.slice(0, 10).map(claim => (
                <div key={claim.id} className="bg-gray-900 p-3 rounded text-xs">
                  <p className="font-bold">{claim.business.name}</p>
                  <p className="text-gray-400">Applicant: {claim.applicant.email}</p>
                  <p className="text-red-400 text-xs">{claim.rejectionReason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 - SUBSCRIPTION STATE */}
      <section className="bg-gray-800 border border-gray-700 rounded p-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">SUBSCRIPTION STATE</h2>
        {selectedBusiness ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900 p-4 rounded">
                <span className="text-gray-400 text-sm">Plan:</span>
                <p className="font-bold">{subscriptionState === 'NONE' ? 'NONE' : 'Active'}</p>
              </div>
              <div className="bg-gray-900 p-4 rounded">
                <span className="text-gray-400 text-sm">Status:</span>
                <p className={`font-bold ${
                  subscriptionState === 'ACTIVE' ? 'text-green-400' :
                  subscriptionState === 'CANCELED' ? 'text-red-400' :
                  'text-gray-500'
                }`}>
                  {subscriptionState}
                </p>
              </div>
              <div className="bg-gray-900 p-4 rounded">
                <span className="text-gray-400 text-sm">Deal Creation:</span>
                <p className={`font-bold ${dealCapabilityUnlocked ? 'text-green-400' : 'text-red-400'}`}>
                  {dealCapabilityUnlocked ? 'UNLOCKED' : 'LOCKED'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleActivateSubscription('founders-free')}
                disabled={loading || subscriptionState === 'ACTIVE' || !selectedBusiness.ownerId}
                className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm"
              >
                Activate Founders Free
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={loading || subscriptionState !== 'ACTIVE' || !selectedBusiness.ownerId}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm"
              >
                Cancel Subscription
              </button>
            </div>
            {!selectedBusiness.ownerId && (
              <p className="text-yellow-400 text-xs">⚠ Business must be claimed before subscription actions</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Select a business to manage subscription</p>
        )}
      </section>

      {/* SECTION 5 - DEAL CAPABILITY */}
      <section className="bg-gray-800 border border-gray-700 rounded p-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">DEAL CAPABILITY</h2>
        {selectedBusiness ? (
          <div className="space-y-4">
            <div className="bg-gray-900 p-6 rounded text-center">
              <p className="text-gray-400 mb-2">Create Deal Status:</p>
              <p className={`text-2xl font-bold mb-4 ${dealCapabilityUnlocked ? 'text-green-400' : 'text-red-400'}`}>
                {dealCapabilityUnlocked ? '🔓 UNLOCKED' : '🔒 LOCKED'}
              </p>
              <button
                disabled={!dealCapabilityUnlocked}
                className={`px-6 py-3 rounded font-medium ${
                  dealCapabilityUnlocked
                    ? 'bg-blue-700 hover:bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {dealCapabilityUnlocked ? 'Create Deal' : 'Locked — requires active subscription'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Select a business to view deal capability</p>
        )}
      </section>

      {/* SECTION 6 - VOUCHER/REDEMPTION VISIBILITY */}
      <section className="bg-gray-800 border border-gray-700 rounded p-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">VOUCHER / REDEMPTION VISIBILITY</h2>
        {selectedBusiness ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 p-4 rounded text-center">
              <span className="text-gray-400 text-sm">Total Vouchers:</span>
              <p className="text-3xl font-bold">{getVoucherCount(selectedBusiness.id)}</p>
            </div>
            <div className="bg-gray-900 p-4 rounded text-center">
              <span className="text-gray-400 text-sm">Issued:</span>
              <p className="text-3xl font-bold text-blue-400">{getVoucherCount(selectedBusiness.id, 'ISSUED')}</p>
            </div>
            <div className="bg-gray-900 p-4 rounded text-center">
              <span className="text-gray-400 text-sm">Redeemed:</span>
              <p className="text-3xl font-bold text-green-400">{getVoucherCount(selectedBusiness.id, 'REDEEMED')}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Select a business to view voucher stats</p>
        )}
      </section>
    </div>
  );
}

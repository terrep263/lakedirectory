'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type VoucherRow = {
  id: string;
  qrToken: string;
  status: string;
  issuedAt: string;
  redeemedAt: string | null;
  dealTitle: string;
  businessName: string;
  userEmail: string | null;
};

type VoucherDetails = {
  voucher: {
    id: string
    qrToken: string
    status: string
    issuedAt: string
    expiresAt: string | null
    redeemedAt: string | null
    redeemedByBusinessId: string | null
    redeemedContext: any
    business: { id: string; name: string }
    deal: { id: string; title: string; dealStatus: string }
    account: { id: string; email: string; role: string } | null
    validation: { id: string; externalRef: string; validatedAt: string }
    purchase:
      | {
          id: string
          status: string
          amountPaid: string
          paymentProvider: string
          paymentIntentId: string
          createdAt: string
          user: { id: string; email: string; role: string }
        }
      | null
    redemption:
      | {
          id: string
          redeemedAt: string
          vendorUserId: string
          vendor: { id: string; email: string; role: string }
          originalValue: string | null
          dealPrice: string | null
        }
      | null
  }
  audit: Array<{
    id: string
    actorType: string
    actorId: string | null
    action: string
    metadata: any
    createdAt: string
  }>
}

function VoucherToolsInner() {
  const router = useRouter();
  const searchParams = useSearchParams()
  const [voucherId, setVoucherId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  // Voucher browser
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [status, setStatus] = useState<string>('');
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('');
  const [totalPages, setTotalPages] = useState(1);
  const [details, setDetails] = useState<VoucherDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('adminToken');
  }, []);

  useEffect(() => {
    if (!adminToken) {
      router.push('/admin-login');
    }
  }, [adminToken, router]);

  // Deep link: /admin/tools/voucher?voucherId=...
  useEffect(() => {
    const q = searchParams.get('voucherId')
    if (q && q !== selectedVoucherId) {
      setSelectedVoucherId(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const fetchVouchers = async () => {
    if (!adminToken) return;
    setListLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) params.set('status', status);

      const response = await fetch(`/api/admin/vouchers?${params}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch vouchers');
      }

      setRows(
        (data.data || []).map((v: any) => ({
          id: v.id,
          qrToken: v.qrToken,
          status: v.status,
          issuedAt: v.issuedAt,
          redeemedAt: v.redeemedAt || null,
          dealTitle: v.dealTitle,
          businessName: v.businessName,
          userEmail: v.userEmail || null,
        }))
      );
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to fetch vouchers');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status, adminToken]);

  useEffect(() => {
    const run = async () => {
      if (!adminToken || !selectedVoucherId) {
        setDetails(null)
        setDetailsError(null)
        return
      }
      setDetailsLoading(true)
      setDetailsError(null)
      try {
        const res = await fetch(`/api/admin/vouchers/${selectedVoucherId}/details`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to fetch voucher details')
        }
        setDetails(data.data as VoucherDetails)
      } catch (e) {
        setDetails(null)
        setDetailsError(e instanceof Error ? e.message : 'Failed to fetch voucher details')
      } finally {
        setDetailsLoading(false)
      }
    }
    run()
  }, [adminToken, selectedVoucherId])

  const handleResendEmail = async () => {
    if (!voucherId.trim()) {
      setMessageType('error');
      setMessage('Please enter a voucher ID');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      if (!adminToken) {
        throw new Error('No admin token found. Please log in again.');
      }
      const response = await fetch('/api/voucher/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ voucherId }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessageType('success');
        setMessage(`Email sent successfully for voucher: ${data.voucherId}`);
        setVoucherId('');
      } else {
        setMessageType('error');
        setMessage(`${data.error || 'Failed to send email'}`);
      }
    } catch (error) {
      setMessageType('error');
      setMessage(`${error instanceof Error ? error.message : 'Failed to send email'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Voucher Tools</h1>
        <p className="text-gray-600 mt-2">Manage voucher operations and email delivery</p>
      </div>

      {/* Resend Voucher Email Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Resend Voucher Email</h2>
            <p className="text-gray-600 text-sm mt-1">
              Send or resend a voucher PDF via email to the customer
            </p>
          </div>
          <span className="text-4xl">📧</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voucher ID
            </label>
            <input
              type="text"
              value={voucherId}
              onChange={(e) => setVoucherId(e.target.value)}
              placeholder="e.g., clk7x9z0a0001kz8z0z0z0z0a"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the unique voucher ID to send the PDF email
            </p>
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg ${
                messageType === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          <button
            onClick={handleResendEmail}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>

      {/* Voucher Browser */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Voucher Browser</h2>
            <p className="text-gray-600 text-sm mt-1">
              View issued/redeemed vouchers and preview the generated PDF.
            </p>
          </div>
          <span className="text-4xl">🎫</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All</option>
              <option value="ISSUED">ISSUED</option>
              <option value="REDEEMED">REDEEMED</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Page size</label>
            <select
              value={String(limit)}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <button
              onClick={fetchVouchers}
              disabled={listLoading}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
            >
              {listLoading ? 'Refreshing…' : 'Refresh list'}
            </button>
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>
          </div>
        </div>

        {listError && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
            {listError}
          </div>
        )}

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Voucher</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Business</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Deal</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">User</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {listLoading ? (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={6}>
                    No vouchers found.
                  </td>
                </tr>
              ) : (
                rows.map((v) => (
                  <tr
                    key={v.id}
                    className={`cursor-pointer hover:bg-blue-50 ${
                      v.id === selectedVoucherId ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedVoucherId(v.id)
                      router.replace(`/admin/tools/voucher?voucherId=${encodeURIComponent(v.id)}`)
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-900">{v.id}</td>
                    <td className="px-4 py-3">{v.status}</td>
                    <td className="px-4 py-3">{v.businessName}</td>
                    <td className="px-4 py-3">{v.dealTitle}</td>
                    <td className="px-4 py-3">{v.userEmail || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {v.issuedAt ? new Date(v.issuedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || listLoading}
            className="px-3 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || listLoading}
            className="px-3 py-2 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>

        {/* PDF Preview */}
        {selectedVoucherId && (
          <div className="mt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Voucher Details</h3>
              {detailsLoading ? (
                <div className="text-sm text-gray-600 mt-2">Loading details…</div>
              ) : detailsError ? (
                <div className="text-sm text-red-700 mt-2">{detailsError}</div>
              ) : details ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-xs text-gray-500">Business</div>
                    <div className="font-semibold text-gray-900">{details.voucher.business.name}</div>
                    <div className="text-xs text-gray-500 font-mono mt-1">{details.voucher.business.id}</div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-xs text-gray-500">Deal</div>
                    <div className="font-semibold text-gray-900">{details.voucher.deal.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{details.voucher.deal.dealStatus}</div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-xs text-gray-500">Owner / Purchaser</div>
                    <div className="font-semibold text-gray-900">{details.voucher.account?.email || '—'}</div>
                    <div className="text-xs text-gray-500 mt-1">{details.voucher.purchase ? `Purchase: ${details.voucher.purchase.status}` : 'No purchase record'}</div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">PDF Preview</h3>
              <a
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                href={`/api/admin/vouchers/${selectedVoucherId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open PDF in new tab →
              </a>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <iframe
                title="Voucher PDF preview"
                src={`/api/admin/vouchers/${selectedVoucherId}/pdf`}
                className="w-full"
                style={{ height: 820 }}
              />
            </div>

            {details && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Purchase & Redemption History</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-900">Purchase</div>
                    {details.voucher.purchase ? (
                      <div className="text-sm text-gray-700 mt-2 space-y-1">
                        <div><span className="text-gray-500">Status:</span> {details.voucher.purchase.status}</div>
                        <div><span className="text-gray-500">Amount:</span> {details.voucher.purchase.amountPaid}</div>
                        <div><span className="text-gray-500">Provider:</span> {details.voucher.purchase.paymentProvider}</div>
                        <div className="font-mono text-xs text-gray-600">Intent: {details.voucher.purchase.paymentIntentId}</div>
                        <div className="text-xs text-gray-600">Created: {new Date(details.voucher.purchase.createdAt).toLocaleString()}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 mt-2">No purchase record (admin-issued or not assigned).</div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-900">Redemption</div>
                    {details.voucher.redemption ? (
                      <div className="text-sm text-gray-700 mt-2 space-y-1">
                        <div><span className="text-gray-500">Redeemed at:</span> {new Date(details.voucher.redemption.redeemedAt).toLocaleString()}</div>
                        <div><span className="text-gray-500">Vendor:</span> {details.voucher.redemption.vendor.email}</div>
                        <div className="font-mono text-xs text-gray-600">VendorUserId: {details.voucher.redemption.vendorUserId}</div>
                        <div><span className="text-gray-500">Snapshot:</span> {details.voucher.redemption.originalValue || '—'} → {details.voucher.redemption.dealPrice || '—'}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 mt-2">Not redeemed.</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-900">Voucher Audit Log</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">When</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Action</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Actor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(details.audit || []).slice(0, 25).map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-xs text-gray-600">{new Date(a.createdAt).toLocaleString()}</td>
                            <td className="px-4 py-3 text-gray-900">{a.action}</td>
                            <td className="px-4 py-3 text-xs text-gray-600">{a.actorType}{a.actorId ? `:${a.actorId}` : ''}</td>
                          </tr>
                        ))}
                        {(details.audit || []).length === 0 && (
                          <tr>
                            <td className="px-4 py-6 text-sm text-gray-600" colSpan={3}>
                              No audit log entries.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Information Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📋 About Voucher Tools</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>✓ Generate and send voucher PDFs to customers</li>
          <li>✓ Resend vouchers if email delivery fails</li>
          <li>✓ Track all email delivery events in audit logs</li>
          <li>✓ Support for all voucher formats and redemption types</li>
        </ul>
      </div>

      {/* Features Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">🔄 Automatic Delivery</h3>
          <p className="text-sm text-gray-600">
            Vouchers are automatically emailed when payment is processed
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">📊 Audit Trail</h3>
          <p className="text-sm text-gray-600">
            All email sends and failures are logged for compliance
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">🎨 PDF Generation</h3>
          <p className="text-sm text-gray-600">
            Professional PDFs with QR codes for easy redemption
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">🛡️ Admin Only</h3>
          <p className="text-sm text-gray-600">
            Restricted to administrators for security
          </p>
        </div>
      </div>

      {/* Help Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">❓ Need Help?</h3>
        <p className="text-sm text-gray-700 mb-4">
          For more information about voucher operations, check the documentation:
        </p>
        <ul className="text-sm space-y-2">
          <li>
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              → Voucher PDF & Email System Documentation
            </a>
          </li>
          <li>
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              → Voucher System Quick Start
            </a>
          </li>
          <li>
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              → Admin Access Control Guide
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function VoucherToolsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading…</div>}>
      <VoucherToolsInner />
    </Suspense>
  )
}

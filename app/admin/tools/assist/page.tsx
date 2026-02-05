'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type LookupResponse = {
  identity: { id: string; email: string; role: string; status: string; dealViolationCount?: number }
  vendor: null | { businessId: string; businessName: string | null }
}

export default function AdminAssistPage() {
  const router = useRouter()
  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  useEffect(() => {
    if (!adminToken) router.push('/admin-login')
  }, [adminToken, router])

  const [email, setEmail] = useState('')
  const [lookup, setLookup] = useState<LookupResponse | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [brief, setBrief] = useState('')
  const [dealCategory, setDealCategory] = useState('restaurant')
  const [preview, setPreview] = useState<any>(null)
  const [previewing, setPreviewing] = useState(false)
  const [reason, setReason] = useState('')

  const [fixBusinessId, setFixBusinessId] = useState('')
  const [fixing, setFixing] = useState(false)

  const [bizForm, setBizForm] = useState({
    name: '',
    phone: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    category: '',
    description: '',
  })
  const [savingBiz, setSavingBiz] = useState(false)

  const [userSummary, setUserSummary] = useState<any>(null)
  const [loadingUserSummary, setLoadingUserSummary] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)

  const doLookup = async () => {
    if (!adminToken) return
    setError(null)
    setSuccess(null)
    setPreview(null)
    setLookup(null)
    setLookupLoading(true)
    try {
      const res = await fetch(`/api/admin/assist/lookup?email=${encodeURIComponent(email.trim())}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Lookup failed')
      setLookup(data as LookupResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed')
    } finally {
      setLookupLoading(false)
    }
  }

  const previewDealForVendor = async () => {
    if (!adminToken || !lookup) return
    setError(null)
    setSuccess(null)
    setPreview(null)
    setPreviewing(true)
    try {
      const res = await fetch('/api/admin/assist/vendor/preview-deal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          vendorEmail: lookup.identity.email,
          brief,
          dealCategory,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to preview deal')
      setPreview(data)
      setSuccess('Draft generated. Copy it to the vendor or have them submit the brief.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to preview deal')
    } finally {
      setPreviewing(false)
    }
  }

  const fixVendorBinding = async () => {
    if (!adminToken || !lookup) return
    setError(null)
    setSuccess(null)
    setFixing(true)
    try {
      const res = await fetch('/api/admin/assist/vendor/fix-binding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          vendorEmail: lookup.identity.email,
          businessId: fixBusinessId.trim(),
          reason: reason.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to fix binding')
      setSuccess('Vendor binding fixed.')
      await doLookup()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fix binding')
    } finally {
      setFixing(false)
    }
  }

  const saveVendorBusiness = async () => {
    if (!adminToken || !lookup) return
    setError(null)
    setSuccess(null)
    setSavingBiz(true)
    try {
      const res = await fetch('/api/admin/assist/vendor/update-business', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          vendorEmail: lookup.identity.email,
          reason: reason.trim() || undefined,
          updates: bizForm,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to update business')
      setSuccess('Business profile updated.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update business')
    } finally {
      setSavingBiz(false)
    }
  }

  const loadUserSummary = async () => {
    if (!adminToken || !lookup) return
    setError(null)
    setSuccess(null)
    setUserSummary(null)
    setLoadingUserSummary(true)
    try {
      const res = await fetch(`/api/admin/assist/user/summary?email=${encodeURIComponent(lookup.identity.email)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to load user summary')
      setUserSummary(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load user summary')
    } finally {
      setLoadingUserSummary(false)
    }
  }

  const changeIdentityStatus = async (nextStatus: 'ACTIVE' | 'SUSPENDED') => {
    if (!adminToken || !lookup) return
    const r = reason.trim()
    if (!r) {
      setError('Reason is required for this action.')
      return
    }
    setError(null)
    setSuccess(null)
    setStatusChanging(true)
    try {
      const res = await fetch('/api/admin/assist/identity/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          email: lookup.identity.email,
          nextStatus,
          reason: r,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to change status')
      setSuccess(`Identity status updated to ${nextStatus}.`)
      await doLookup()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change status')
    } finally {
      setStatusChanging(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Assist</h1>
        <p className="mt-1 text-gray-600">
          Help vendors and users without sharing passwords. You can perform supported actions on their behalf, with full audit logging.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">{success}</div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="text-lg font-semibold text-gray-900">1) Find the person</div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full sm:w-[420px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => void doLookup()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            disabled={lookupLoading}
          >
            {lookupLoading ? 'Searching…' : 'Lookup'}
          </button>
        </div>

        {lookup ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
            <div className="font-semibold text-gray-900">{lookup.identity.email}</div>
            <div className="text-gray-700">Role: {lookup.identity.role} · Status: {lookup.identity.status}</div>
            {lookup.vendor ? (
              <div className="mt-2 text-gray-700">
                Vendor business: <span className="font-semibold">{lookup.vendor.businessName || lookup.vendor.businessId}</span>
              </div>
            ) : (
              <div className="mt-2 text-gray-500">No vendor business binding found.</div>
            )}
          </div>
        ) : null}

        <div className="mt-4">
          <label className="text-sm font-semibold text-gray-800">
            Support reason (optional but recommended)
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you making this change / viewing data?"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        {lookup ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-bold text-amber-950">Account control (non-money)</div>
            <p className="mt-1 text-sm text-amber-900">
              Suspend/restore USER or VENDOR access. <span className="font-semibold">Reason required.</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => void changeIdentityStatus('SUSPENDED')}
                className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-60"
                disabled={statusChanging || lookup.identity.role === 'ADMIN' || lookup.identity.role === 'SUPER_ADMIN'}
              >
                {statusChanging ? 'Working…' : 'Suspend'}
              </button>
              <button
                onClick={() => void changeIdentityStatus('ACTIVE')}
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-60"
                disabled={statusChanging || lookup.identity.role === 'ADMIN' || lookup.identity.role === 'SUPER_ADMIN'}
              >
                {statusChanging ? 'Working…' : 'Restore'}
              </button>
              <span className="text-xs text-amber-900">
                Current status: <span className="font-semibold">{lookup.identity.status}</span>
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {lookup?.identity?.role === 'VENDOR' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-lg font-semibold text-gray-900">Vendor support (non‑money)</div>
          <p className="mt-1 text-sm text-gray-600">
            Allowed: binding fixes and profile updates. Not allowed: vouchers, payments, subscription actions.
          </p>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-bold text-gray-900">Fix vendor ↔ business binding</div>
              <div className="mt-1 text-sm text-gray-600">Use when vendor can’t access the right business.</div>
              <div className="mt-3">
                <input
                  value={fixBusinessId}
                  onChange={(e) => setFixBusinessId(e.target.value)}
                  placeholder="Business ID"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="mt-3">
                <button
                  onClick={() => void fixVendorBinding()}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
                  disabled={!fixBusinessId.trim() || fixing}
                >
                  {fixing ? 'Fixing…' : 'Fix binding'}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-bold text-gray-900">Update business profile</div>
              <div className="mt-1 text-sm text-gray-600">Contact + directory fields only.</div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['name', 'Name'],
                  ['phone', 'Phone'],
                  ['website', 'Website'],
                  ['addressLine1', 'Address line 1'],
                  ['addressLine2', 'Address line 2'],
                  ['city', 'City'],
                  ['state', 'State'],
                  ['postalCode', 'Postal code'],
                  ['category', 'Category'],
                ].map(([key, label]) => (
                  <label key={key} className="text-xs font-semibold text-gray-700">
                    {label}
                    <input
                      value={(bizForm as any)[key]}
                      onChange={(e) => setBizForm((p) => ({ ...p, [key]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                ))}
              </div>
              <label className="mt-3 block text-xs font-semibold text-gray-700">
                Description
                <textarea
                  value={bizForm.description}
                  onChange={(e) => setBizForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="mt-3">
                <button
                  onClick={() => void saveVendorBusiness()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                  disabled={savingBiz}
                >
                  {savingBiz ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {lookup?.identity?.role === 'USER' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-lg font-semibold text-gray-900">User support (view‑only)</div>
          <p className="mt-1 text-sm text-gray-600">
            View purchase/voucher history to help troubleshoot. No resend/reissue/void actions here.
          </p>
          <div className="mt-4">
            <button
              onClick={() => void loadUserSummary()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              disabled={loadingUserSummary}
            >
              {loadingUserSummary ? 'Loading…' : 'Load user history'}
            </button>
          </div>

          {userSummary?.purchases ? (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 text-sm font-bold text-gray-900">Purchases (last 50)</div>
                <div className="p-4 text-sm space-y-2">
                  {userSummary.purchases.length === 0 ? (
                    <div className="text-gray-500">No purchases found.</div>
                  ) : (
                    userSummary.purchases.map((p: any) => (
                      <div key={p.id} className="rounded border border-gray-200 p-3">
                        <div className="font-semibold text-gray-900">{p.deal?.title || p.deal?.id}</div>
                        <div className="text-gray-600 text-xs">
                          {new Date(p.createdAt).toLocaleString()} · {p.paymentProvider} · ${p.amountPaid} · {p.status}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Voucher: {p.voucher?.id} ({p.voucher?.status})</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 text-sm font-bold text-gray-900">Vouchers (last 50)</div>
                <div className="p-4 text-sm space-y-2">
                  {userSummary.vouchers.length === 0 ? (
                    <div className="text-gray-500">No vouchers found.</div>
                  ) : (
                    userSummary.vouchers.map((v: any) => (
                      <div key={v.id} className="rounded border border-gray-200 p-3">
                        <div className="font-semibold text-gray-900">{v.deal?.title || v.deal?.id}</div>
                        <div className="text-gray-600 text-xs">
                          {v.business?.name} · {v.status} · issued {new Date(v.issuedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="text-lg font-semibold text-gray-900">2) Vendor assist: preview a deal draft (no publishing)</div>
        <p className="mt-1 text-sm text-gray-600">
          Admins do not touch the money path. This generates an SEO-ready draft you can send to the vendor to submit themselves.
        </p>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <label className="text-sm font-semibold text-gray-800">
            Deal brief (required)
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder='e.g., "3 tacos for $3, regular $9."'
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-gray-800">
              Category
              <select
                value={dealCategory}
                onChange={(e) => setDealCategory(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="restaurant">Restaurant</option>
                <option value="auto">Auto</option>
                <option value="beauty">Beauty</option>
                <option value="fitness">Fitness</option>
                <option value="entertainment">Entertainment</option>
                <option value="retail">Retail</option>
                <option value="services">Services</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => void previewDealForVendor()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            disabled={!lookup?.vendor || previewing}
            title={!lookup?.vendor ? 'Lookup a vendor with a business binding first' : undefined}
          >
            {previewing ? 'Generating…' : 'Generate draft'}
          </button>
        </div>

        {preview?.draft ? (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-bold text-gray-900">Generated draft</div>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-gray-600">Title</div>
                <div className="mt-1 font-semibold text-gray-900">{preview.draft.title}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600">Description</div>
                <div className="mt-1 whitespace-pre-wrap text-gray-800">{preview.draft.description}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600">Terms</div>
                <div className="mt-1 whitespace-pre-wrap text-gray-800">{preview.draft.terms}</div>
              </div>
              {preview.parsed ? (
                <div className="text-xs text-gray-600">
                  Locked offer: <span className="font-semibold text-gray-900">{preview.parsed.quantity} {preview.parsed.item} for ${preview.parsed.dealPrice}, regular ${preview.parsed.regularPrice}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}


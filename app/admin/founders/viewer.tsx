'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type FounderRow = {
  id: string
  businessId: string
  businessName: string
  isActive: boolean
  grantedAt: string
  expiresAt: string | null
}

export default function FoundersClient({ initialRows }: { initialRows: FounderRow[] }) {
  const router = useRouter()
  const [rows, setRows] = useState<FounderRow[]>(initialRows)
  const [businessId, setBusinessId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  async function refresh() {
    router.refresh()
  }

  async function assign() {
    if (!adminToken) {
      router.push('/admin-login')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/founders/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ businessId: businessId.trim(), ...(expiresAt ? { expiresAt } : {}) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to assign founder status')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign founder status')
    } finally {
      setLoading(false)
    }
  }

  async function remove(businessId: string) {
    if (!adminToken) {
      router.push('/admin-login')
      return
    }
    if (!window.confirm('Remove founder status?')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/founders/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ businessId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to remove founder status')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove founder status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow p-6 space-y-4">
      {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}

      <div className="border border-gray-200 rounded-lg p-4">
        <div className="font-semibold text-gray-900 mb-3">Assign founder</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            placeholder="Business ID"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
          />
          <input
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            placeholder="ExpiresAt (ISO, optional)"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={assign}
            disabled={loading || !businessId.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            Assign
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          If you see “County context is required”, set county context first.
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Business</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Active</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Granted</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Expires</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="text-gray-900 font-medium">{r.businessName}</div>
                  <div className="text-xs text-gray-600 font-mono">{r.businessId}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">{r.isActive ? 'YES' : 'NO'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{r.grantedAt}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{r.expiresAt || '—'}</td>
                <td className="px-4 py-3">
                  {r.isActive ? (
                    <button
                      onClick={() => remove(r.businessId)}
                      disabled={loading}
                      className="text-red-700 hover:text-red-900 text-xs font-semibold disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-gray-600" colSpan={5}>
                  No founder records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


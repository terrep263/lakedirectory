'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type AuditRow = {
  id: string
  adminUserId: string
  actionType: string
  targetEntityType: string
  targetEntityId: string
  metadata: any
  createdAt: string
}

export default function AuditLogClient() {
  const router = useRouter()
  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)

  const [actionType, setActionType] = useState('')
  const [targetEntityType, setTargetEntityType] = useState('')
  const [targetEntityId, setTargetEntityId] = useState('')

  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!adminToken) router.push('/admin-login')
  }, [adminToken, router])

  async function fetchLogs() {
    if (!adminToken) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (actionType) params.set('actionType', actionType)
      if (targetEntityType) params.set('targetEntityType', targetEntityType)
      if (targetEntityId) params.set('targetEntityId', targetEntityId)

      const res = await fetch(`/api/admin/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load audit logs')

      setRows((data.data || []).map((r: any) => ({ ...r, createdAt: r.createdAt })))
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, actionType, targetEntityType, targetEntityId, adminToken])

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Action type</label>
          <input
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value)
              setPage(1)
            }}
            placeholder="e.g. BUSINESS_SUSPENDED"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entity type</label>
          <input
            value={targetEntityType}
            onChange={(e) => {
              setTargetEntityType(e.target.value)
              setPage(1)
            }}
            placeholder="e.g. BUSINESS"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entity ID</label>
          <input
            value={targetEntityId}
            onChange={(e) => {
              setTargetEntityId(e.target.value)
              setPage(1)
            }}
            placeholder="paste an ID…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Page size</label>
          <select
            value={String(limit)}
            onChange={(e) => {
              setLimit(parseInt(e.target.value, 10))
              setPage(1)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <div className="text-sm text-gray-600">
          Page {page} of {totalPages}
        </div>
      </div>

      {error && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">When</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Action</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Target</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-gray-600" colSpan={4}>Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-gray-600" colSpan={4}>No audit logs found.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900">{r.actionType}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    <div>{r.targetEntityType}</div>
                    <div className="font-mono">{r.targetEntityId}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 font-mono">{r.adminUserId}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
          className="px-3 py-2 border rounded-lg disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          className="px-3 py-2 border rounded-lg disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}


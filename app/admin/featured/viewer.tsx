'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type FeaturedRow = {
  id: string
  entityType: string
  entityId: string
  entityName: string
  startAt: string
  endAt: string
  priority: number
  isActive: boolean
  createdAt: string
  createdBy: string
  county?: { name: string; slug: string } | null
}

export default function FeaturedClient() {
  const router = useRouter()
  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  const [rows, setRows] = useState<FeaturedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [entityType, setEntityType] = useState<'BUSINESS' | 'DEAL'>('BUSINESS')
  const [entityId, setEntityId] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [priority, setPriority] = useState(0)

  useEffect(() => {
    if (!adminToken) router.push('/admin-login')
  }, [adminToken, router])

  async function fetchFeatured() {
    if (!adminToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/featured', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load featured list')
      setRows(data.data || [])
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Failed to load featured list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeatured()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken])

  async function create() {
    if (!adminToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          entityType,
          entityId: entityId.trim(),
          startAt,
          endAt,
          priority,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to add featured content')
      setEntityId('')
      setStartAt('')
      setEndAt('')
      setPriority(0)
      await fetchFeatured()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add featured content')
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    if (!adminToken) return
    if (!window.confirm('Remove featured item?')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/featured', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to remove featured content')
      await fetchFeatured()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove featured content')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow p-6 space-y-4">
      {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}

      <div className="border border-gray-200 rounded-lg p-4">
        <div className="font-semibold text-gray-900 mb-3">Add featured</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="BUSINESS">BUSINESS</option>
            <option value="DEAL">DEAL</option>
          </select>
          <input
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="Entity ID"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
          />
          <input
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            placeholder="StartAt (ISO)"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            placeholder="EndAt (ISO)"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={create}
            disabled={loading || !entityId.trim() || !startAt || !endAt}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Requires county context. Use `/admin/county` if you see “County context is required”.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={fetchFeatured}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <div className="text-sm text-gray-600">{rows.length} item(s)</div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Entity</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Window</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Priority</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Active</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="text-gray-900 font-medium">{r.entityName}</div>
                  <div className="text-xs text-gray-600">{r.entityType}</div>
                  <div className="text-xs text-gray-600 font-mono">{r.entityId}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  <div>Start: {new Date(r.startAt).toLocaleString()}</div>
                  <div>End: {new Date(r.endAt).toLocaleString()}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">{r.priority}</td>
                <td className="px-4 py-3 text-gray-700">{r.isActive ? 'YES' : 'NO'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => remove(r.id)}
                    disabled={loading}
                    className="text-red-700 hover:text-red-900 text-xs font-semibold disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-gray-600" colSpan={5}>
                  No featured content.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


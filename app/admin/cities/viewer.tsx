'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type CityRow = {
  id: string
  name: string
  slug: string
  isActive: boolean
  displayOrder: number
  businessCount: number
}

export default function CitiesClient() {
  const router = useRouter()
  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  const [countyLabel, setCountyLabel] = useState<string | null>(null)
  const [maxCities, setMaxCities] = useState<number | null>(null)
  const [rows, setRows] = useState<CityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newOrder, setNewOrder] = useState(0)

  useEffect(() => {
    if (!adminToken) router.push('/admin-login')
  }, [adminToken, router])

  async function fetchCities() {
    if (!adminToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/cities', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch cities')

      setCountyLabel(`${data.data.county.name}, ${data.data.county.state}`)
      setMaxCities(data.data.maxCities)
      setRows(data.data.cities || [])
    } catch (e) {
      setCountyLabel(null)
      setRows([])
      setError(e instanceof Error ? e.message : 'Failed to fetch cities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken])

  async function createCity() {
    if (!adminToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/cities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: newName, slug: newSlug, displayOrder: newOrder }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create city')

      setNewName('')
      setNewSlug('')
      setNewOrder(0)
      await fetchCities()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create city')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(city: CityRow) {
    if (!adminToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/cities/${city.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ isActive: !city.isActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to update city')
      await fetchCities()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update city')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-gray-900">County</div>
          <div className="text-sm text-gray-700 mt-1">{countyLabel || '—'}</div>
          {maxCities !== null && (
            <div className="text-xs text-gray-500 mt-1">Max cities: {maxCities}</div>
          )}
        </div>
        <button
          onClick={fetchCities}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}

      <div className="border border-gray-200 rounded-lg p-4">
        <div className="font-semibold text-gray-900 mb-3">Add City</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="Slug (e.g. mount-dora)"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
          />
          <input
            value={String(newOrder)}
            onChange={(e) => setNewOrder(parseInt(e.target.value || '0', 10))}
            placeholder="Display order"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={createCity}
            disabled={loading || !newName.trim() || !newSlug.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">City</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Slug</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Businesses</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Active</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-xs text-gray-700 font-mono">{c.slug}</td>
                <td className="px-4 py-3 text-gray-700">{c.businessCount}</td>
                <td className="px-4 py-3 text-gray-700">{c.isActive ? 'YES' : 'NO'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(c)}
                    disabled={loading}
                    className="text-blue-700 hover:text-blue-900 text-xs font-semibold disabled:opacity-50"
                  >
                    {c.isActive ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-gray-600" colSpan={5}>
                  No cities found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


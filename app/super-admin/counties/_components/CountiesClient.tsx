'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type CountyRow = {
  id: string
  name: string
  state: string
  slug: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  stats?: {
    businesses?: number
    deals?: number
    vouchers?: number
  }
}

export default function CountiesClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<CountyRow[]>([])

  const [name, setName] = useState('')
  const [stateAbbr, setStateAbbr] = useState('')
  const [slug, setSlug] = useState('')
  const [googlePlacesConfigJson, setGooglePlacesConfigJson] = useState('')
  const [boundaryGeometryJson, setBoundaryGeometryJson] = useState('')

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('adminToken')
  }, [])

  const load = useCallback(async () => {
    if (!token) {
      setError('Missing adminToken in localStorage. Please log in again.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/super-admin/counties', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Failed to load counties (${res.status})`)
      }
      setRows(Array.isArray(data.data) ? data.data : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load counties')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const createCounty = useCallback(async () => {
    if (!token) {
      setError('Missing adminToken in localStorage. Please log in again.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      let googlePlacesConfig: unknown | undefined = undefined
      let boundaryGeometry: unknown | undefined = undefined

      if (googlePlacesConfigJson.trim().length > 0) {
        googlePlacesConfig = JSON.parse(googlePlacesConfigJson)
      }
      if (boundaryGeometryJson.trim().length > 0) {
        boundaryGeometry = JSON.parse(boundaryGeometryJson)
      }

      const res = await fetch('/api/super-admin/counties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          state: stateAbbr,
          slug,
          googlePlacesConfig,
          boundaryGeometry,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Failed to create county (${res.status})`)
      }

      setName('')
      setStateAbbr('')
      setSlug('')
      setGooglePlacesConfigJson('')
      setBoundaryGeometryJson('')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to create county')
    } finally {
      setSaving(false)
    }
  }, [boundaryGeometryJson, googlePlacesConfigJson, load, name, slug, stateAbbr, token])

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Counties</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create, enable/disable, and inspect county-wide stats.
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900">Create county</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Lake County"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">State</label>
            <input
              value={stateAbbr}
              onChange={(e) => setStateAbbr(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="FL"
              maxLength={2}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="lake"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Google Places config (optional JSON)
            </label>
            <textarea
              value={googlePlacesConfigJson}
              onChange={(e) => setGooglePlacesConfigJson(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono min-h-[110px]"
              placeholder='{"radiusMeters": 25000}'
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Boundary geometry (optional JSON)
            </label>
            <textarea
              value={boundaryGeometryJson}
              onChange={(e) => setBoundaryGeometryJson(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono min-h-[110px]"
              placeholder='{"type":"Polygon","coordinates":[...]}'
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => void createCounty()}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create county'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">All counties</h3>
          <p className="text-xs text-gray-500">
            {loading ? 'Loading…' : `${rows.length} total`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-5 py-3">County</th>
                <th className="text-left px-5 py-3">Slug</th>
                <th className="text-left px-5 py-3">Active</th>
                <th className="text-left px-5 py-3">Stats</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.state}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">
                    {c.slug}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        c.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {c.isActive ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-600">
                    <div>Businesses: {c.stats?.businesses ?? 0}</div>
                    <div>Deals: {c.stats?.deals ?? 0}</div>
                    <div>Vouchers: {c.stats?.vouchers ?? 0}</div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/super-admin/counties/${c.id}`}
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}

              {!loading && rows.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center text-sm text-gray-600"
                    colSpan={5}
                  >
                    No counties found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


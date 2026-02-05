'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type CountyDetail = {
  id: string
  name: string
  state: string
  slug: string
  isActive: boolean
  googlePlacesConfig: unknown
  boundaryGeometry: unknown
  createdAt: string
  updatedAt: string
  stats?: {
    businesses?: number
    deals?: number
    vouchers?: number
    redemptions?: number
    purchases?: number
    admins?: number
  }
  admins?: Array<{ id: string; email: string; grantedAt: string }>
}

export default function CountyDetailClient({ countyId }: { countyId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [county, setCounty] = useState<CountyDetail | null>(null)

  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
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
      const res = await fetch(`/api/super-admin/counties/${countyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Failed to load county (${res.status})`)
      }
      const c: CountyDetail = data.data
      setCounty(c)
      setName(c.name ?? '')
      setIsActive(Boolean(c.isActive))
      setGooglePlacesConfigJson(
        c.googlePlacesConfig ? JSON.stringify(c.googlePlacesConfig, null, 2) : ''
      )
      setBoundaryGeometryJson(
        c.boundaryGeometry ? JSON.stringify(c.boundaryGeometry, null, 2) : ''
      )
    } catch (e: any) {
      setError(e?.message || 'Failed to load county')
    } finally {
      setLoading(false)
    }
  }, [countyId, token])

  useEffect(() => {
    void load()
  }, [load])

  const save = useCallback(async () => {
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

      const res = await fetch(`/api/super-admin/counties/${countyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          isActive,
          googlePlacesConfig,
          boundaryGeometry,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Failed to update county (${res.status})`)
      }
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to update county')
    } finally {
      setSaving(false)
    }
  }, [boundaryGeometryJson, countyId, googlePlacesConfigJson, isActive, load, name, token])

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {county?.name || 'County'}
              </h2>
              {county ? (
                <span className="font-mono text-xs text-gray-500">{county.slug}</span>
              ) : null}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Manage county configuration and access. This is global governance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/super-admin/counties"
              className="px-3 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              ← Back
            </Link>
            <button
              onClick={() => void load()}
              className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {county ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs text-gray-500">Businesses</div>
              <div className="text-lg font-bold text-gray-900">
                {county.stats?.businesses ?? 0}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs text-gray-500">Deals</div>
              <div className="text-lg font-bold text-gray-900">
                {county.stats?.deals ?? 0}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs text-gray-500">Admins with access</div>
              <div className="text-lg font-bold text-gray-900">
                {county.stats?.admins ?? 0}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Configuration</h3>
          <div className="flex items-center gap-2">
            <Link
              href={`/super-admin/counties/${countyId}/admins`}
              className="px-3 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Manage admin access →
            </Link>
            <Link
              href={`/super-admin/launch/counties/${countyId}`}
              className="px-3 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Launch dashboard →
            </Link>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              Active (public + admin tools allowed)
            </label>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Google Places config (JSON)
            </label>
            <textarea
              value={googlePlacesConfigJson}
              onChange={(e) => setGooglePlacesConfigJson(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono min-h-[180px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Boundary geometry (JSON)
            </label>
            <textarea
              value={boundaryGeometryJson}
              onChange={(e) => setBoundaryGeometryJson(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono min-h-[180px]"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => void save()}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900">Admins with access</h3>
        <p className="text-sm text-gray-600 mt-1">
          Access grants are managed via Admin County Access.
        </p>
        <div className="mt-3 space-y-2">
          {(county?.admins || []).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">{a.email}</div>
                <div className="text-xs text-gray-500 font-mono">{a.id}</div>
              </div>
              <div className="text-xs text-gray-500">
                Granted: {new Date(a.grantedAt).toLocaleString()}
              </div>
            </div>
          ))}
          {!loading && (county?.admins?.length || 0) === 0 ? (
            <div className="text-sm text-gray-600">No admins have access yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}


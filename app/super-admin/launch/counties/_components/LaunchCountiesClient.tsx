'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

type CountyRow = {
  id: string
  name: string
  state: string
  slug: string
  isActive: boolean
  stats?: {
    businesses?: number
    deals?: number
    vouchers?: number
  }
}

export default function LaunchCountiesClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [counties, setCounties] = useState<CountyRow[]>([])
  const [preconditions, setPreconditions] = useState<any>(null)
  const [preconditionsLoading, setPreconditionsLoading] = useState(false)

  const [name, setName] = useState('')
  const [stateAbbr, setStateAbbr] = useState('')
  const [slug, setSlug] = useState('')
  const [primaryDomain, setPrimaryDomain] = useState('')
  const [googlePlacesConfigJson, setGooglePlacesConfigJson] = useState('')
  const [boundaryGeometryJson, setBoundaryGeometryJson] = useState('')

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('adminToken')
  }, [])

  const loadCounties = useCallback(async () => {
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
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Failed to load counties (${res.status})`)
      }
      setCounties(Array.isArray(json.data) ? json.data : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load counties')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadCounties()
  }, [loadCounties])

  const checkPreconditions = useCallback(async () => {
    if (!token) {
      setError('Missing adminToken in localStorage. Please log in again.')
      return
    }
    setPreconditionsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/super-admin/launch/preconditions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Preconditions check failed (${res.status})`)
      }
      setPreconditions(json.data)
    } catch (e: any) {
      setError(e?.message || 'Preconditions check failed')
    } finally {
      setPreconditionsLoading(false)
    }
  }, [token])

  const createLaunchCounty = useCallback(async () => {
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

      const res = await fetch('/api/super-admin/launch/counties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          state: stateAbbr,
          slug,
          primaryDomain,
          googlePlacesConfig,
          boundaryGeometry,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Failed to create launch county (${res.status})`)
      }

      const countyId = json?.data?.countyId as string | undefined
      if (countyId) {
        router.push(`/super-admin/launch/counties/${countyId}`)
        return
      }

      // fallback: refresh and stay
      await loadCounties()
    } catch (e: any) {
      setError(e?.message || 'Failed to create launch county')
    } finally {
      setSaving(false)
    }
  }, [
    boundaryGeometryJson,
    googlePlacesConfigJson,
    loadCounties,
    name,
    primaryDomain,
    router,
    slug,
    stateAbbr,
    token,
  ])

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Launch Playbook</h2>
            <p className="text-sm text-gray-600 mt-1">
              Guided setup for bringing a new county online.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/super-admin/counties"
              className="px-3 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Counties →
            </Link>
            <button
              onClick={() => void loadCounties()}
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
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Phase 0: Preconditions</h3>
            <p className="text-sm text-gray-600 mt-1">
              Run this before launching to catch missing dependencies.
            </p>
          </div>
          <button
            onClick={() => void checkPreconditions()}
            disabled={preconditionsLoading}
            className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60"
          >
            {preconditionsLoading ? 'Checking…' : 'Check preconditions'}
          </button>
        </div>

        {preconditions ? (
          <pre className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs overflow-auto">
            {JSON.stringify(preconditions, null, 2)}
          </pre>
        ) : (
          <p className="mt-3 text-xs text-gray-500">
            No preconditions result yet.
          </p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900">
          Phase 1: Create launch county
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Creates a county in <span className="font-mono">DRAFT</span> and attaches a primary domain.
        </p>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <div>
            <label className="block text-xs font-medium text-gray-600">Primary domain</label>
            <input
              value={primaryDomain}
              onChange={(e) => setPrimaryDomain(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="lake.example.com"
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
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => void createLaunchCounty()}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create launch county'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Counties (quick jump to launch)
          </h3>
          <p className="text-xs text-gray-500">
            {loading ? 'Loading…' : `${counties.length} total`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-5 py-3">County</th>
                <th className="text-left px-5 py-3">Slug</th>
                <th className="text-left px-5 py-3">Active</th>
                <th className="text-right px-5 py-3">Launch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {counties.map((c) => (
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
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/super-admin/launch/counties/${c.id}`}
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && counties.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center text-sm text-gray-600"
                    colSpan={4}
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


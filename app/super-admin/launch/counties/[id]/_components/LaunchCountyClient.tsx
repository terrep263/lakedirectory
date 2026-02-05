'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

function slugifyCity(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function LaunchCountyClient({ countyId }: { countyId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [county, setCounty] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])

  const [citiesText, setCitiesText] = useState('')
  const [metadataJson, setMetadataJson] = useState('{}')

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
    setMessage(null)
    try {
      const [launchRes, countyRes] = await Promise.all([
        fetch(`/api/super-admin/launch/counties/${countyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/super-admin/counties/${countyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const launchJson = await launchRes.json().catch(() => ({}))
      if (!launchRes.ok || !launchJson?.success) {
        throw new Error(
          launchJson?.error || `Failed to load launch progress (${launchRes.status})`
        )
      }

      const countyJson = await countyRes.json().catch(() => ({}))
      if (!countyRes.ok || !countyJson?.success) {
        throw new Error(
          countyJson?.error || `Failed to load county (${countyRes.status})`
        )
      }

      setProgress(launchJson?.data?.progress ?? null)
      setLogs(Array.isArray(launchJson?.data?.logs) ? launchJson.data.logs : [])
      setCounty(countyJson?.data ?? null)
    } catch (e: any) {
      setError(e?.message || 'Failed to load launch dashboard')
    } finally {
      setLoading(false)
    }
  }, [countyId, token])

  useEffect(() => {
    void load()
  }, [load])

  const configureCities = useCallback(async () => {
    if (!token) {
      setError('Missing adminToken in localStorage. Please log in again.')
      return
    }

    const cityNames = citiesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    if (cityNames.length < 5) {
      setError('Enter at least 5 cities (one per line).')
      return
    }

    const cities = cityNames.map((name, idx) => ({
      name,
      slug: slugifyCity(name),
      displayOrder: idx,
    }))

    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/super-admin/launch/counties/${countyId}/cities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cities }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Failed to configure cities (${res.status})`)
      }
      setMessage(json?.data?.message || 'Cities configured.')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to configure cities')
    } finally {
      setSaving(false)
    }
  }, [citiesText, countyId, load, token])

  const runPhase = useCallback(
    async (phase: string) => {
      if (!token) {
        setError('Missing adminToken in localStorage. Please log in again.')
        return
      }
      if (!confirm(`Run ${phase}?`)) return

      setSaving(true)
      setError(null)
      setMessage(null)
      try {
        let metadata: unknown = {}
        if (metadataJson.trim().length > 0) {
          metadata = JSON.parse(metadataJson)
        }

        const res = await fetch(`/api/super-admin/launch/counties/${countyId}/phase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ phase, metadata }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || `Failed to run phase (${res.status})`)
        }
        setMessage(json?.data?.message || `${phase} complete.`)
        await load()
      } catch (e: any) {
        setError(e?.message || 'Failed to run phase')
      } finally {
        setSaving(false)
      }
    },
    [countyId, load, metadataJson, token]
  )

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Launch dashboard
              </h2>
              {county ? (
                <span className="text-xs text-gray-500">
                  <span className="font-semibold">{county.name}</span>{' '}
                  <span className="font-mono">({county.slug})</span>
                </span>
              ) : null}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Drive the county through phases 1–7. Phase 2 (cities) is irreversible.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/super-admin/launch/counties"
              className="px-3 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              ← Back
            </Link>
            <Link
              href={`/super-admin/counties/${countyId}`}
              className="px-3 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              County settings →
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
        {message ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {message}
          </div>
        ) : null}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900">Progress</h3>
        <p className="text-sm text-gray-600 mt-1">
          Raw progress + logs (from the launch subsystem).
        </p>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Progress</p>
            <pre className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs overflow-auto min-h-[220px]">
              {loading ? 'Loading…' : JSON.stringify(progress, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Logs</p>
            <pre className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs overflow-auto min-h-[220px]">
              {loading ? 'Loading…' : JSON.stringify(logs, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900">
          Phase 2: Configure cities (irreversible)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Enter one city name per line. Slugs will be auto-generated.
        </p>
        <textarea
          value={citiesText}
          onChange={(e) => setCitiesText(e.target.value)}
          className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[160px]"
          placeholder={'Astatula\nAstor\nClermont\n...'}
        />
        <div className="mt-3">
          <button
            onClick={() => void configureCities()}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60"
          >
            {saving ? 'Working…' : 'Configure cities (Phase 2)'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900">Phase actions (3–7)</h3>
        <p className="text-sm text-gray-600 mt-1">
          Some phases accept metadata. Provide JSON below (or leave as <span className="font-mono">{'{}'}</span>).
        </p>

        <textarea
          value={metadataJson}
          onChange={(e) => setMetadataJson(e.target.value)}
          className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono min-h-[140px]"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => void runPhase('PHASE_3')}
            disabled={saving}
            className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            Run PHASE_3
          </button>
          <button
            onClick={() => void runPhase('PHASE_4')}
            disabled={saving}
            className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            Run PHASE_4
          </button>
          <button
            onClick={() => void runPhase('PHASE_5')}
            disabled={saving}
            className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            Run PHASE_5
          </button>
          <button
            onClick={() => void runPhase('PHASE_6')}
            disabled={saving}
            className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            Run PHASE_6
          </button>
          <button
            onClick={() => void runPhase('PHASE_7')}
            disabled={saving}
            className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            Run PHASE_7
          </button>
        </div>
      </div>
    </div>
  )
}


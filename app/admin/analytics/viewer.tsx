'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type AnalyticsResponse = {
  success: boolean
  data?: any
  insights?: any[] | null
  insightsGenerated?: boolean
  error?: string
}

export default function AnalyticsClient() {
  const router = useRouter()
  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<any>(null)
  const [insights, setInsights] = useState<any[] | null>(null)

  useEffect(() => {
    if (!adminToken) router.push('/admin-login')
  }, [adminToken, router])

  async function fetchOverview() {
    if (!adminToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytics/overview?timeframe=${timeframe}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const data = (await res.json()) as AnalyticsResponse
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load analytics')
      }
      setPayload(data.data || null)
      setInsights(data.insights || null)
    } catch (e) {
      setPayload(null)
      setInsights(null)
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, adminToken])

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow p-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="7d">7d</option>
            <option value="30d">30d</option>
            <option value="90d">90d</option>
            <option value="all">all</option>
          </select>
        </div>
        <button
          onClick={fetchOverview}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <div className="md:ml-auto">
          <a href="/admin/county" className="text-sm text-blue-700 hover:text-blue-900 font-medium">
            Need to set county context?
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {!error && !payload && !loading && (
        <div className="text-sm text-gray-600">
          No analytics payload. If you see “County context is required”, set county context first.
        </div>
      )}

      {payload && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(payload || {}).slice(0, 9).map(([k, v]) => (
            <div key={k} className="border border-gray-200 rounded-lg p-4">
              <div className="text-xs text-gray-500">{k}</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </div>
            </div>
          ))}
        </div>
      )}

      {insights && insights.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="font-semibold text-gray-900">AI Insights</div>
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            {insights.slice(0, 10).map((i: any, idx: number) => (
              <li key={idx} className="bg-gray-50 rounded p-3">
                {typeof i === 'string' ? i : JSON.stringify(i)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


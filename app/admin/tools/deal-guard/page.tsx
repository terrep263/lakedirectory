'use client'

import { useEffect, useMemo, useState } from 'react'

type GuardLog = {
  id: string
  dealId: string
  vendorIdentityId: string
  action: string
  qualityScore: number | null
  guardStatus: string | null
  feedback: string | null
  createdAt: string
  deal?: { id: string; title: string; dealStatus: string; guardStatus: string }
  vendor?: { id: string; email: string }
}

type QueueDeal = {
  id: string
  title: string
  dealStatus: string
  guardStatus: string
  qualityScore: number
  guardFeedback: string | null
  updatedAt: string
  createdAt: string
  business?: { id: string; name: string }
  creator?: { id: string; email: string }
}

export default function DealGuardToolsPage() {
  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  const [logs, setLogs] = useState<GuardLog[]>([])
  const [stats, setStats] = useState<{ approved: number; rejected: number; rewriteRequired: number; avgScore: number } | null>(
    null
  )
  const [queue, setQueue] = useState<QueueDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!adminToken) {
      setError('Please sign in again (missing admin token).')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [logsRes, statsRes, queueRes] = await Promise.all([
        fetch('/api/admin/deal-guard/logs?limit=100', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        fetch('/api/admin/deal-guard/stats', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        fetch('/api/admin/deal-guard/queue?limit=50', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ])

      const logsJson = await logsRes.json().catch(() => ({}))
      const statsJson = await statsRes.json().catch(() => ({}))
      const queueJson = await queueRes.json().catch(() => ({}))

      if (!logsRes.ok) throw new Error(logsJson?.error || 'Failed to load deal guard logs')
      if (!statsRes.ok) throw new Error(statsJson?.error || 'Failed to load deal guard stats')
      if (!queueRes.ok) throw new Error(queueJson?.error || 'Failed to load Deal Guard queue')

      setLogs(Array.isArray(logsJson?.logs) ? logsJson.logs : [])
      setStats(statsJson)
      setQueue(Array.isArray(queueJson?.deals) ? queueJson.deals : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Deal Guard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken])

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deal Guard</h1>
          <p className="text-gray-600 mt-1">Automated approval, rewrites, and compliance monitoring.</p>
        </div>
        <button
          onClick={() => void load()}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {loading ? <div className="text-sm text-gray-600">Loading…</div> : null}

      {stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Approved', value: stats.approved, tone: 'bg-green-50 border-green-200 text-green-900' },
            { label: 'Rejected', value: stats.rejected, tone: 'bg-red-50 border-red-200 text-red-900' },
            { label: 'Needs rewrite', value: stats.rewriteRequired, tone: 'bg-yellow-50 border-yellow-200 text-yellow-900' },
            { label: 'Avg score', value: stats.avgScore, tone: 'bg-blue-50 border-blue-200 text-blue-900' },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg border p-4 ${s.tone}`}>
              <div className="text-xs font-bold opacity-80">{s.label}</div>
              <div className="mt-1 text-3xl font-extrabold">{s.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">What to monitor here</h2>
            <p className="mt-1 text-sm text-gray-600">
              This page is your operational dashboard for deal quality. The most important section is <span className="font-semibold">Needs attention</span>.
            </p>
            <ul className="mt-3 text-sm text-gray-700 list-disc pl-5 space-y-1">
              <li><span className="font-semibold">Needs rewrite</span>: vendor can accept AI improvements and resubmit.</li>
              <li><span className="font-semibold">Rejected</span>: vendor must change the offer (usually pricing/terms compliance).</li>
              <li><span className="font-semibold">Suspended</span>: deal auto-hidden after 60+ days inactivity (cron).</li>
              <li><span className="font-semibold">Pricing</span>: Deal Guard provides guidance, not enforced caps.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Needs attention</h2>
          <div className="text-sm text-gray-500">{queue.length} items</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Deal</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Business</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Vendor</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Guard</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Score</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Why</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {queue.map((d) => (
                <tr key={d.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{d.title}</div>
                    <div className="text-xs text-gray-500">{d.dealStatus}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{d.business?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{d.creator?.email || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                      {d.guardStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-bold">{Number.isFinite(d.qualityScore) ? d.qualityScore : '-'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[520px]">
                    <div className="line-clamp-2">{d.guardFeedback || '-'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {new Date(d.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {queue.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                    Nothing needs attention right now.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent decisions</h2>
          <div className="text-sm text-gray-500">Last 100</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">When</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Deal</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Vendor</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Score</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{log.deal?.title || log.dealId}</div>
                    <div className="text-xs text-gray-500">
                      {log.deal?.dealStatus} · {log.deal?.guardStatus}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{log.vendor?.email || log.vendorIdentityId}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                      {log.guardStatus || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-bold">{log.qualityScore ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[520px]">
                    <div className="line-clamp-2">{log.feedback || '-'}</div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                    No audit entries yet.
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


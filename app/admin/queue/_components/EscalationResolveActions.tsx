'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

export default function EscalationResolveActions({ escalationId }: { escalationId: string }) {
  const router = useRouter()
  const [resolution, setResolution] = useState('')
  const [dismiss, setDismiss] = useState(false)
  const [loading, setLoading] = useState(false)

  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  async function submit() {
    if (!adminToken) {
      window.alert('Missing admin token. Please sign in again.')
      router.push('/admin-login')
      return
    }

    if (!resolution.trim()) {
      window.alert('Resolution is required.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/escalations/${escalationId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ resolution: resolution.trim(), dismiss }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data?.error || 'Failed to resolve escalation')
        setLoading(false)
        return
      }

      setResolution('')
      setDismiss(false)
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      window.alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-80">
      <textarea
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        placeholder="Resolution notes (required)…"
        className="w-full border border-gray-300 rounded-md p-2 text-sm"
        rows={3}
      />
      <label className="flex items-center gap-2 mt-2 text-xs text-gray-700">
        <input type="checkbox" checked={dismiss} onChange={(e) => setDismiss(e.target.checked)} />
        Dismiss (no action needed)
      </label>
      <div className="flex justify-end mt-2">
        <button
          onClick={submit}
          disabled={loading}
          className="px-3 py-2 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : dismiss ? 'Dismiss' : 'Resolve'}
        </button>
      </div>
    </div>
  )
}


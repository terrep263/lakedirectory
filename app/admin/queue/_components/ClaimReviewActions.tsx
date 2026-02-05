'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ClaimReviewActions({ claimId }: { claimId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function act(action: 'approve' | 'reject') {
    setLoading(action)
    try {
      let reason: string | undefined
      if (action === 'reject') {
        const r = window.prompt('Rejection reason (required):')
        if (!r || !r.trim()) {
          setLoading(null)
          return
        }
        reason = r.trim()
      }

      const res = await fetch('/api/admin/claims/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action, ...(reason ? { reason } : {}) }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data?.error || 'Failed to process claim')
        setLoading(null)
        return
      }

      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      window.alert(msg)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => act('approve')}
        disabled={loading !== null}
        className="px-3 py-2 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
      >
        {loading === 'approve' ? 'Approving…' : 'Approve'}
      </button>
      <button
        onClick={() => act('reject')}
        disabled={loading !== null}
        className="px-3 py-2 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
      >
        {loading === 'reject' ? 'Rejecting…' : 'Reject'}
      </button>
    </div>
  )
}

